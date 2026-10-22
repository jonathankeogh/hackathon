import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { Server } from "socket.io";
import { getState, onStateChange } from "./state";
import * as flow from "./flow";
import * as wa from "./sources/whatsapp";

const room = (personId: string) => `person:${personId}`;
const STEPS = new Set<flow.Step>(["detect", "extract", "explain", "cascade", "book", "call", "negotiate"]);
const ROLES = new Set<flow.Role>(["attend", "laptop", "help"]);

// server/src (dev) and server/dist (bundled) are both two levels below the repo root.
const here = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIST = process.env.WEB_DIST ?? path.resolve(here, "../../web/dist");

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "0.0.0.0"]);

function phoneReachableHost(host: string): string {
  const [name, port] = host.split(/:(?=\d+$)/);
  if (!LOCAL_HOSTS.has(name)) return host;
  const lan = Object.values(os.networkInterfaces())
    .flat()
    .find((a) => a && a.family === "IPv4" && !a.internal);
  return lan ? `${lan.address}${port ? `:${port}` : ""}` : host;
}

export function startServer(port: number): Promise<{ port: number; close: () => Promise<void> }> {
  const adminKey = process.env.ADMIN_KEY ?? "";
  const app = express();
  // Behind cloudflared: trust X-Forwarded-* so /api/config builds https join URLs.
  app.set("trust proxy", true);
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });
  // The stage QR points here: JOIN_URL (tunnel) if set, else this host. The
  // projector usually opens localhost, which a phone can't reach, so swap in
  // the laptop's LAN address (the same-Wi-Fi fallback).
  app.get("/api/config", (req, res) => {
    const joinUrl = process.env.JOIN_URL?.trim() || `${req.protocol}://${phoneReachableHost(req.get("host") ?? "")}/join`;
    res.json({ joinUrl: joinUrl.endsWith("/join") ? joinUrl : `${joinUrl.replace(/\/$/, "")}/join` });
  });

  // Production: one process serves the built web app too. Any page route
  // falls back to index.html so /stage, /join and /admin work on refresh.
  if (fs.existsSync(path.join(WEB_DIST, "index.html"))) {
    app.use(express.static(WEB_DIST, { index: false }));
    app.use((req, res, next) => {
      if (req.method !== "GET" || req.path.startsWith("/api/") || req.path.startsWith("/socket.io/")) return next();
      res.sendFile(path.join(WEB_DIST, "index.html"));
    });
  }

  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: true } });

  onStateChange((state) => io.emit("state", state));
  flow.bindEmitter({
    toAll: (event, payload) => io.emit(event, payload),
    toPerson: (personId, event, payload) => io.to(room(personId)).emit(event, payload),
    isOnline: (personId) => (io.sockets.adapter.rooms.get(room(personId))?.size ?? 0) > 0,
  });
  flow.resetDemo();

  // The WhatsApp group the current event reads from, if any.
  let activeGroup: { jid: string; name: string } | null = null;
  let groupsCache: wa.WaGroup[] | null = null;

  const adminInfo = () => ({ callTarget: flow.getCallTarget(), locked: Boolean(adminKey) });

  io.on("connection", (socket) => {
    socket.emit("state", getState());
    socket.emit("admin:info", adminInfo());

    // Every handler: payload may be anything (null, a string, garbage) and a
    // throw must never take the server down mid-demo.
    const on = <T extends object>(event: string, fn: (p: Partial<T>) => void) =>
      socket.on(event, (raw: unknown) => {
        try {
          fn(raw && typeof raw === "object" ? (raw as Partial<T>) : {});
        } catch (err) {
          console.error(`handler ${event} failed:`, err);
        }
      });

    // A phone that reconnects sends its saved personId and is reattached.
    // A socket that already joined (double-tapped Join) keeps its person.
    on<{ name: string; personId: string }>("join", (p) => {
      const savedId = typeof p.personId === "string" && p.personId ? p.personId : socket.data.personId;
      const person = flow.join(String(p.name ?? ""), savedId);
      socket.data.personId = person.id;
      for (const r of socket.rooms) if (r.startsWith("person:")) socket.leave(r);
      socket.join(room(person.id));
      socket.emit("joined", { personId: person.id });
      flow.catchUp(person.id);
    });
    on<{ personId: string; role: flow.Role }>("rsvp", (p) => {
      if (typeof p.personId === "string" && p.role && ROLES.has(p.role)) flow.rsvp(p.personId, p.role);
    });

    // Presenter/admin controls. With ADMIN_KEY set, only sockets that send it
    // in their handshake can drive the demo, so the audience can't reset it.
    const isAdmin = () => !adminKey || socket.handshake.auth?.adminKey === adminKey;
    const admin = <T extends object>(event: string, fn: (p: Partial<T>) => void) =>
      on<T>(event, (p) => {
        if (isAdmin()) fn(p);
        else socket.emit("admin:denied");
      });

    admin<{ personId: string; text: string }>("chat:send", (p) => {
      if (typeof p.personId === "string" && typeof p.text === "string") flow.chat(p.personId, p.text);
    });
    admin("admin:reset", () => flow.resetDemo());
    admin("admin:seed", () => flow.reseed());
    admin<{ step: flow.Step }>("admin:step", (p) => {
      if (p.step && STEPS.has(p.step)) void flow.step(p.step);
    });
    // The asked phone answers the agent; admin can force an answer.
    socket.on("ask:answer", (p: { askId?: string; accept?: boolean; personId?: string } = {}) => {
      const ask = getState().asks.find((a) => a.id === p.askId);
      if (ask && ask.personId === p.personId) flow.answerAsk(ask.id, Boolean(p.accept));
    });
    admin<{ accept: boolean }>("admin:answer", (p) => flow.answerOpenAsk(Boolean(p.accept)));
    admin<{ on: boolean }>("admin:mock", (p) => flow.setMock(Boolean(p.on)));
    admin<{ personId: string }>("admin:callTarget", (p) => {
      flow.setCallTarget(String(p.personId ?? ""));
      io.emit("admin:info", adminInfo());
    });
    admin<{ count: number }>("admin:simulateJoins", (p) => {
      void flow.simulateJoins(Math.min(Math.max(Number(p.count) || 0, 0), 100));
    });

    // / and /new: link WhatsApp, pick a group, run the event on it. Open to
    // anyone on purpose (showcase): whoever presses New Event links their WhatsApp.
    let watching: ReturnType<typeof setInterval> | null = null;
    const pushStatus = async () => {
      const st = await wa.bridgeStatus();
      if (st.status !== "connected") groupsCache = null;
      else if (!groupsCache) groupsCache = await wa.listGroups().catch(() => null);
      socket.emit("wa:status", { ...st, groups: groupsCache ?? undefined, active: activeGroup });
    };
    socket.on("wa:watch", () => {
      if (watching) return;
      void pushStatus();
      watching = setInterval(() => void pushStatus(), 1500);
    });
    socket.on("disconnect", () => watching && clearInterval(watching));
    // New event always starts from a fresh link QR: unlink whoever is linked,
    // the bridge restarts itself and serves a new code.
    socket.on("wa:new", async () => {
      activeGroup = null;
      groupsCache = null;
      flow.resetDemo();
      if ((await wa.bridgeStatus()).status === "connected") await wa.logout().catch(() => {});
      void pushStatus();
    });
    socket.on("wa:pickGroup", (p: { jid?: string; name?: string } = {}) => {
      const group = groupsCache?.find((g) => g.jid === p.jid);
      if (!group) return;
      activeGroup = { jid: group.jid, name: group.name };
      flow.startWhatsAppEvent(group.jid);
      void pushStatus();
    });
    socket.on("wa:logout", () => {
      activeGroup = null;
      groupsCache = null;
      flow.resetDemo();
      void wa.logout().catch(() => {});
    });
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      const addr = server.address();
      resolve({
        port: typeof addr === "object" && addr ? addr.port : port,
        close: () => new Promise((done) => { io.close(); server.close(() => done()); }),
      });
    });
  });
}

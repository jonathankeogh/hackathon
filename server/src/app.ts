import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { Server } from "socket.io";
import { getState, onStateChange } from "./state";
import * as flow from "./flow";
import * as wa from "./sources/whatsapp";

const room = (personId: string) => `person:${personId}`;
const STEPS = new Set<flow.Step>(["detect", "extract", "explain", "cascade", "book", "call"]);
const ROLES = new Set<flow.Role>(["attend", "laptop", "help"]);

// server/src (dev) and server/dist (bundled) are both two levels below the repo root.
const here = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIST = process.env.WEB_DIST ?? path.resolve(here, "../../web/dist");

export function startServer(port: number): Promise<{ port: number; close: () => Promise<void> }> {
  const adminKey = process.env.ADMIN_KEY ?? "";
  const app = express();
  // Behind cloudflared: trust X-Forwarded-* so /api/config builds https join URLs.
  app.set("trust proxy", true);
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });
  // The stage QR points here: JOIN_URL (tunnel) if set, else this host.
  app.get("/api/config", (req, res) => {
    const joinUrl = process.env.JOIN_URL?.trim() || `${req.protocol}://${req.get("host")}/join`;
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

    // A phone that reconnects sends its saved personId and is reattached.
    socket.on("join", (p: { name?: string; personId?: string } = {}) => {
      const person = flow.join(String(p.name ?? ""), p.personId);
      for (const r of socket.rooms) if (r.startsWith("person:")) socket.leave(r);
      socket.join(room(person.id));
      socket.emit("joined", { personId: person.id });
    });
    socket.on("rsvp", (p: { personId?: string; role?: flow.Role } = {}) => {
      if (p.personId && p.role && ROLES.has(p.role)) flow.rsvp(p.personId, p.role);
    });

    // Presenter/admin controls. With ADMIN_KEY set, only sockets that send it
    // in their handshake can drive the demo, so the audience can't reset it.
    const isAdmin = () => !adminKey || socket.handshake.auth?.adminKey === adminKey;
    const admin = <T>(event: string, fn: (p: T) => void) =>
      socket.on(event, (p: T = {} as T) => {
        if (isAdmin()) fn(p);
        else socket.emit("admin:denied");
      });

    admin<{ personId?: string; text?: string }>("chat:send", (p) => {
      if (p.personId && p.text) flow.chat(p.personId, String(p.text));
    });
    admin("admin:reset", () => flow.resetDemo());
    admin("admin:seed", () => flow.reseed());
    admin<{ step?: flow.Step }>("admin:step", (p) => {
      if (p.step && STEPS.has(p.step)) void flow.step(p.step);
    });
    admin<{ on?: boolean }>("admin:mock", (p) => flow.setMock(Boolean(p.on)));
    admin<{ personId?: string }>("admin:callTarget", (p) => {
      flow.setCallTarget(String(p.personId ?? ""));
      io.emit("admin:info", adminInfo());
    });
    admin<{ count?: number }>("admin:simulateJoins", (p) => {
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

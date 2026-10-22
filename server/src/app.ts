import http from "node:http";
import express from "express";
import { Server } from "socket.io";
import { getState, onStateChange } from "./state";
import * as flow from "./flow";

const room = (personId: string) => `person:${personId}`;
const STEPS = new Set<flow.Step>(["detect", "extract", "explain", "cascade", "book", "call"]);
const ROLES = new Set<flow.Role>(["attend", "laptop", "help"]);

export function startServer(port: number): Promise<{ port: number; close: () => Promise<void> }> {
  const app = express();
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: true } });

  onStateChange((state) => io.emit("state", state));
  flow.bindEmitter({
    toAll: (event, payload) => io.emit(event, payload),
    toPerson: (personId, event, payload) => io.to(room(personId)).emit(event, payload),
    isOnline: (personId) => (io.sockets.adapter.rooms.get(room(personId))?.size ?? 0) > 0,
  });
  flow.resetDemo();

  io.on("connection", (socket) => {
    socket.emit("state", getState());

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
    socket.on("chat:send", (p: { personId?: string; text?: string } = {}) => {
      if (p.personId && p.text) flow.chat(p.personId, String(p.text));
    });

    socket.on("admin:reset", () => flow.resetDemo());
    socket.on("admin:seed", () => flow.reseed());
    socket.on("admin:step", (p: { step?: flow.Step } = {}) => {
      if (p.step && STEPS.has(p.step)) void flow.step(p.step);
    });
    socket.on("admin:mock", (p: { on?: boolean } = {}) => flow.setMock(Boolean(p.on)));
    socket.on("admin:callTarget", (p: { personId?: string } = {}) => flow.setCallTarget(String(p.personId ?? "")));
    socket.on("admin:simulateJoins", (p: { count?: number } = {}) => {
      void flow.simulateJoins(Math.min(Math.max(Number(p.count) || 0, 0), 100));
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

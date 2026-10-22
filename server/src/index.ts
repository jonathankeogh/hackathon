import path from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
import dotenv from "dotenv";
import express from "express";
import { Server } from "socket.io";
import type { State } from "@deadlock/shared/types";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, "../../.env"), quiet: true });

const PORT = Number(process.env.PORT ?? 3000);

// Placeholder snapshot until state.ts (#3) lands.
const state: State = {
  people: [],
  messages: [],
  plan: null,
  commitments: [],
  attendeeCount: 0,
  attendeeTarget: 15,
  blocking: [],
  explanation: "",
  event: null,
  mock: process.env.MOCK_LLM === "true",
};

const app = express();
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true } });

io.on("connection", (socket) => {
  console.log(`socket connected ${socket.id}`);
  socket.emit("state", state);
  socket.on("disconnect", () => console.log(`socket disconnected ${socket.id}`));
});

server.listen(PORT, () => {
  console.log(`deadlock server on http://localhost:${PORT}`);
});

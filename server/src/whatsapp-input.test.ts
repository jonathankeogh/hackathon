import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { io as connect, type Socket } from "socket.io-client";

// The bridge is the external boundary. HTTP, sockets and setup handlers are real.
vi.mock("./sources/whatsapp", () => ({
  bridgeStatus: async () => ({ status: "connected" }),
  listGroups: async () => [{ jid: "demo@g.us", name: "London builders", size: 8 }],
  logout: async () => ({ ok: true }),
  startWhatsApp: () => () => {},
}));

let server: { port: number; close: () => Promise<void> };
let socket: Socket;
function next<T>(event: string, matches: (value: T) => boolean = () => true): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { socket.off(event, receive); reject(new Error(`timed out: ${event}`)); }, 3000);
    function receive(value: T) {
      if (!matches(value)) return;
      clearTimeout(timeout); socket.off(event, receive); resolve(value);
    }
    socket.on(event, receive);
  });
}
beforeAll(async () => {
  const { startServer } = await import("./app");
  server = await startServer(0);
  socket = connect(`http://localhost:${server.port}`, { transports: ["websocket"], autoConnect: false });
  const connected = next("connect"); socket.connect(); await connected;
});
afterAll(async () => { socket?.close(); await server?.close(); });

it("ignores malformed group selections after groups load and still accepts a valid selection", async () => {
  type Status = { groups?: { jid: string }[]; active?: { jid: string } | null };
  const loaded = next<Status>("wa:status", (value) => !!value.groups?.length);
  socket.emit("wa:watch"); await loaded;
  for (const value of [null, "garbage", 42, {}, { jid: 42 }, { jid: "unknown@g.us" }]) socket.emit("wa:pickGroup", value);
  const joined = next<{ personId: string }>("joined");
  socket.emit("join", { name: "Ada" });
  expect((await joined).personId).toMatch(/^ph-/);
  expect((await fetch(`http://localhost:${server.port}/api/health`)).ok).toBe(true);
  const picked = next<Status>("wa:status", (value) => value.active?.jid === "demo@g.us");
  socket.emit("wa:pickGroup", { jid: "demo@g.us", name: "London builders" });
  expect((await picked).active?.jid).toBe("demo@g.us");
});

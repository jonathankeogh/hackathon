import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { io as connect, type Socket } from "socket.io-client";
import * as flow from "./flow";

type Joined = { personId: string; role: flow.Role | null };
let server: { port: number; close: () => Promise<void> };
const sockets: Socket[] = [];

async function phone() {
  const socket = connect(`http://localhost:${server.port}`, {
    transports: ["websocket"], forceNew: true, autoConnect: false,
  });
  sockets.push(socket);
  const connected = new Promise<void>((resolve) => socket.once("connect", resolve));
  socket.connect();
  await connected;
  return socket;
}

function join(socket: Socket, personId?: string) {
  const joined = new Promise<Joined>((resolve) => socket.once("joined", resolve));
  socket.emit("join", { name: "Ada", personId });
  return joined;
}

async function choose(socket: Socket, personId: string, role: flow.Role) {
  const updated = new Promise<void>((resolve) => socket.once("state", () => resolve()));
  socket.emit("rsvp", { personId, role });
  await updated;
}

beforeAll(async () => {
  const { startServer } = await import("./app");
  server = await startServer(0);
});

beforeEach(() => flow.resetDemo());
afterEach(() => {
  sockets.splice(0).forEach((socket) => socket.close());
  flow.resetDemo();
});
afterAll(async () => { await server.close(); });

describe("phone RSVP role on rejoin", () => {
  it("restores the saved laptop role after reconnecting", async () => {
    const original = await phone();
    const { personId } = await join(original);
    await choose(original, personId, "laptop");
    original.close();

    expect(await join(await phone(), personId)).toEqual({ personId, role: "laptop" });
  });

  it("restores the latest role after changing from laptop to help", async () => {
    const original = await phone();
    const { personId } = await join(original);
    await choose(original, personId, "laptop");
    await choose(original, personId, "help");
    original.close();

    expect(await join(await phone(), personId)).toEqual({ personId, role: "help" });
  });

  it("clears the role when a reset invalidates the saved person", async () => {
    const original = await phone();
    const { personId } = await join(original);
    await choose(original, personId, "laptop");
    original.close();
    flow.resetDemo();

    const restored = await join(await phone(), personId);
    expect(restored.personId).not.toBe(personId);
    expect(restored.role).toBeNull();
  });
});

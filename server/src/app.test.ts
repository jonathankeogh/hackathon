import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { io as connect, type Socket } from "socket.io-client";
import type { State } from "@deadlock/shared/types";

// One-port production serving and the admin lock.

const webDist = fs.mkdtempSync(path.join(os.tmpdir(), "deadlock-web-"));
fs.writeFileSync(path.join(webDist, "index.html"), "<!doctype html><title>DEADLOCK</title>");
fs.mkdirSync(path.join(webDist, "assets"));
fs.writeFileSync(path.join(webDist, "assets", "app.js"), "console.log(1)");

process.env.WEB_DIST = webDist;
process.env.ADMIN_KEY = "letmein";
process.env.JOIN_URL = "https://example.trycloudflare.com";
process.env.SIM_JOIN_MS = "0";
process.env.VIABLE_HOLD_MS = "0";

let server: { port: number; close: () => Promise<void> };
const sockets: Socket[] = [];
const url = (p: string) => `http://localhost:${server.port}${p}`;

function client(adminKey?: string) {
  const s = connect(url(""), { transports: ["websocket"], forceNew: true, auth: adminKey ? { adminKey } : {} });
  sockets.push(s);
  return s;
}

beforeAll(async () => {
  const { startServer } = await import("./app");
  server = await startServer(0);
});

afterAll(async () => {
  sockets.forEach((s) => s.close());
  await server.close();
  fs.rmSync(webDist, { recursive: true, force: true });
});

describe("one-port serving", () => {
  it("serves the web app for every page route and static assets", async () => {
    for (const route of ["/stage", "/join", "/admin", "/"]) {
      const res = await fetch(url(route));
      expect(res.status).toBe(200);
      expect(await res.text()).toContain("DEADLOCK");
    }
    expect(await (await fetch(url("/assets/app.js"))).text()).toBe("console.log(1)");
  });

  it("keeps /api routes and reports the join URL from JOIN_URL", async () => {
    expect(await (await fetch(url("/api/health"))).json()).toEqual({ ok: true });
    expect(await (await fetch(url("/api/config"))).json()).toEqual({ joinUrl: "https://example.trycloudflare.com/join" });
    expect((await fetch(url("/api/nope"))).status).toBe(404);
  });

  it("without JOIN_URL, a localhost stage gets a join URL phones can reach", async () => {
    const saved = process.env.JOIN_URL;
    delete process.env.JOIN_URL;
    try {
      const { joinUrl } = await (await fetch(url("/api/config"))).json();
      const lan = Object.values(os.networkInterfaces()).flat().find((a) => a && a.family === "IPv4" && !a.internal);
      expect(joinUrl).toBe(`http://${lan ? lan.address : "localhost"}:${server.port}/join`);
    } finally {
      process.env.JOIN_URL = saved;
    }
  });
});

describe("admin lock", () => {
  it("rejects admin events without the key and accepts them with it", async () => {
    const audience = client();
    const presenter = client("letmein");
    const states: State[] = [];
    presenter.on("state", (s: State) => states.push(s));
    await Promise.all([audience, presenter].map((s) => new Promise<void>((r) => s.once("connect", () => r()))));

    const denied = new Promise((r) => audience.once("admin:denied", r));
    audience.emit("admin:simulateJoins", { count: 5 });
    await denied;

    presenter.emit("admin:simulateJoins", { count: 2 });
    await new Promise((r) => setTimeout(r, 100));
    expect(states.at(-1)?.attendeeCount).toBe(14);
  });

  it("survives malformed payloads and dedupes a double-tapped join", async () => {
    const evil = client("letmein");
    await new Promise<void>((r) => evil.once("connect", () => r()));
    for (const ev of ["join", "rsvp", "chat:send", "admin:step", "admin:mock", "admin:callTarget", "admin:simulateJoins"]) {
      evil.emit(ev, null);
      evil.emit(ev, "garbage");
      evil.emit(ev, 42);
    }
    const ids: string[] = [];
    evil.on("joined", (p: { personId: string }) => ids.push(p.personId));
    evil.emit("join", { name: "Ada" });
    evil.emit("join", { name: "Ada" });
    await new Promise((r) => setTimeout(r, 200));
    expect((await fetch(url("/api/health"))).ok).toBe(true);
    expect(new Set(ids.slice(-2)).size).toBe(1);
  });

  it("phones can still join without the key", async () => {
    const phone = client();
    await new Promise<void>((r) => phone.once("connect", () => r()));
    phone.emit("join", { name: "Ada" });
    const { personId } = await new Promise<{ personId: string }>((r) => phone.once("joined", r));
    expect(personId).toMatch(/^ph-/);
  });
});

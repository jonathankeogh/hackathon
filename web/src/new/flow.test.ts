import { describe, expect, it } from "vitest";
import { cleanSignup, initialWaState, isLive, liveHeading, qrPayload, qrSize, reduceWa, selectStep, validateSignup, type WaStatus } from "./flow";
import { readDevMock } from "./devMock";

const wa = (s: Partial<WaStatus> & Pick<WaStatus, "status">): WaStatus => s;

describe("selectStep", () => {
  it("shows the landing page until sign-up starts, whatever the bridge says", () => {
    expect(selectStep("idle", null)).toBe("landing");
    expect(selectStep("idle", wa({ status: "connected" }))).toBe("landing");
  });

  it("shows the form in the signup phase", () => {
    expect(selectStep("signup", wa({ status: "qr", qr: "x" }))).toBe("signup");
  });

  it("scans while the bridge is offline, connecting or showing a QR, and goes live on connected", () => {
    expect(selectStep("started", null)).toBe("scan");
    expect(selectStep("started", wa({ status: "offline" }))).toBe("scan");
    expect(selectStep("started", wa({ status: "connecting" }))).toBe("scan");
    expect(selectStep("started", wa({ status: "qr", qr: "x" }))).toBe("scan");
    expect(selectStep("started", wa({ status: "connected" }))).toBe("live");
  });
});

describe("isLive and qrPayload", () => {
  it("is live when connected or a plan is active", () => {
    expect(isLive(null)).toBe(false);
    expect(isLive(wa({ status: "offline" }))).toBe(false);
    expect(isLive(wa({ status: "connected" }))).toBe(true);
    expect(isLive(wa({ status: "offline", active: { jid: "a", name: "b" } }))).toBe(true);
  });

  it("only returns a QR for status qr with a payload", () => {
    expect(qrPayload(wa({ status: "qr", qr: "abc" }))).toBe("abc");
    expect(qrPayload(wa({ status: "qr" }))).toBeNull();
    expect(qrPayload(wa({ status: "connecting", qr: "abc" }))).toBeNull();
  });
});

describe("reduceWa", () => {
  it("follows status updates", () => {
    const next = reduceWa(initialWaState, { type: "status", status: wa({ status: "qr", qr: "q" }) });
    expect(next.wa?.status).toBe("qr");
  });

  it("after start, ignores the stale linked status until a fresh one arrives", () => {
    let state = reduceWa(initialWaState, { type: "status", status: wa({ status: "connected", active: { jid: "a", name: "b" } }) });
    state = reduceWa(state, { type: "started" });
    expect(state.wa?.status).toBe("connecting");
    state = reduceWa(state, { type: "status", status: wa({ status: "connected" }) });
    expect(state.wa?.status).toBe("connecting");
    state = reduceWa(state, { type: "status", status: wa({ status: "qr", qr: "q" }) });
    expect(state.wa?.status).toBe("qr");
    state = reduceWa(state, { type: "status", status: wa({ status: "connected" }) });
    expect(state.wa?.status).toBe("connected");
  });
});

describe("validateSignup", () => {
  it("accepts a name and an email", () => {
    expect(validateSignup({ name: "Sam", email: "sam@example.com" })).toEqual({});
  });

  it("flags empty fields", () => {
    expect(Object.keys(validateSignup({ name: "  ", email: "" }))).toEqual(["name", "email"]);
  });

  it("flags a malformed email and an over-long name", () => {
    expect(validateSignup({ name: "Sam", email: "sam@" }).email).toBeTruthy();
    expect(validateSignup({ name: "Sam", email: "sam example@x.io" }).email).toBeTruthy();
    expect(validateSignup({ name: "x".repeat(41), email: "a@b.co" }).name).toBeTruthy();
  });

  it("trims what it keeps", () => {
    expect(cleanSignup({ name: " Sam ", email: " sam@example.com " })).toEqual({ name: "Sam", email: "sam@example.com" });
  });
});

describe("liveHeading", () => {
  it("greets by name and copes without one", () => {
    expect(liveHeading("Sam")).toBe("You’re live, Sam.");
    expect(liveHeading(" ")).toBe("You’re live.");
  });
});

describe("qrSize", () => {
  it("fills a phone width, at least 260", () => {
    expect(qrSize(390, 844, 16)).toBe(358);
    expect(qrSize(360, 640, 16)).toBeGreaterThanOrEqual(260);
  });

  it("stops at 440 on a desktop", () => {
    expect(qrSize(1440, 900, 48)).toBe(440);
  });

  it("leaves room on a short screen", () => {
    expect(qrSize(1440, 500, 48)).toBe(260);
  });
});

describe("readDevMock", () => {
  it("is off in production and for unknown values", () => {
    expect(readDevMock("?mock=qr", false)).toBeNull();
    expect(readDevMock("?mock=nope", true)).toBeNull();
    expect(readDevMock("", true)).toBeNull();
  });

  it("previews the screens that need the bridge", () => {
    expect(readDevMock("?mock=qr", true)?.wa?.status).toBe("qr");
    expect(readDevMock("?mock=live", true)?.phase).toBe("started");
  });
});

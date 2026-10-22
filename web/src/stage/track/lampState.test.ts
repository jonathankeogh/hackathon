import { describe, expect, it } from "vitest";
import { blocked, booked, halfUnlocked, noPlan } from "../../fixtures";
import { audienceLamp, audienceThreshold, commitmentLamp, displayedPlan, nodeLamp, planLamp } from "./lampState";

const byOffer = (s: typeof blocked, offers: string) => s.commitments.find((c) => c.offers === offers)!;

describe("commitmentLamp", () => {
  it("is green once unlocked, even if its resource is still listed as blocking", () => {
    expect(commitmentLamp(byOffer(booked, "venue"), booked)).toBe("green");
    const odd = { ...booked, blocking: [{ resource: "attendees", minCount: 15 }] };
    expect(commitmentLamp(byOffer(odd, "venue"), odd)).toBe("green");
  });
  it("is red when a required resource is in the blocking set", () => {
    expect(commitmentLamp(byOffer(blocked, "venue"), blocked)).toBe("red");
  });
  it("is amber when waiting on something that is not itself blocking", () => {
    expect(commitmentLamp(byOffer(blocked, "speaker"), blocked)).toBe("amber");
    expect(commitmentLamp(byOffer(blocked, "laptops"), blocked)).toBe("amber");
  });
  it("follows the half unlocked snapshot", () => {
    expect(commitmentLamp(byOffer(halfUnlocked, "venue"), halfUnlocked)).toBe("green");
    expect(commitmentLamp(byOffer(halfUnlocked, "speaker"), halfUnlocked)).toBe("amber");
    expect(commitmentLamp(byOffer(halfUnlocked, "food"), halfUnlocked)).toBe("red");
  });
});

describe("audienceThreshold", () => {
  it("is the largest minCount required on attendees", () => {
    expect(audienceThreshold(blocked)).toBe(15);
    const s = {
      ...blocked,
      commitments: [
        ...blocked.commitments,
        { id: "cx", personId: "p1", offers: "x", requires: [{ resource: "attendees", minCount: 20 }], quote: "q", status: "waiting" as const },
      ],
    };
    expect(audienceThreshold(s)).toBe(20);
  });
  it("falls back to the attendee target when nothing sets a minCount", () => {
    expect(audienceThreshold(noPlan)).toBe(15);
  });
});

describe("audienceLamp", () => {
  it("is green at or above the threshold", () => {
    expect(audienceLamp(halfUnlocked)).toBe("green");
    expect(audienceLamp(booked)).toBe("green");
  });
  it("is red below the threshold when attendees is blocking", () => {
    expect(audienceLamp(blocked)).toBe("red");
  });
  it("is amber below the threshold when attendees is not blocking", () => {
    expect(audienceLamp({ ...blocked, blocking: [] })).toBe("amber");
  });
});

describe("planLamp", () => {
  it("maps plan status to a lamp", () => {
    expect(planLamp(null)).toBe("off");
    expect(planLamp({ ...blocked.plan!, status: "none" })).toBe("off");
    expect(planLamp({ ...blocked.plan!, status: "blocked" })).toBe("red");
    expect(planLamp({ ...blocked.plan!, status: "viable" })).toBe("green");
    expect(planLamp({ ...blocked.plan!, status: "booked" })).toBe("green");
  });
});

describe("displayed status override", () => {
  const venue = byOffer(booked, "venue");
  it("keeps an unlocked commitment off green until the cascade shows it", () => {
    expect(commitmentLamp(venue, booked, "waiting")).toBe("amber");
    expect(commitmentLamp(venue, booked, "unlocked")).toBe("green");
    expect(commitmentLamp(venue, booked)).toBe("green");
  });
  it("still reads red for a displayed-waiting commitment whose need is blocking", () => {
    const s = { ...booked, blocking: [{ resource: "attendees", minCount: 15 }] };
    expect(commitmentLamp(venue, s, "waiting")).toBe("red");
  });
  it("holds a viable plan at red until planLit", () => {
    expect(planLamp({ ...blocked.plan!, status: "viable" }, false)).toBe("red");
    expect(planLamp({ ...blocked.plan!, status: "viable" }, true)).toBe("green");
    expect(planLamp(null, false)).toBe("off");
  });
  it("nodeLamp threads the cascade view through to commitments and the plan", () => {
    const view = { displayedStatus: { [venue.id]: "waiting" as const }, planLit: false };
    expect(nodeLamp("commitment", venue, booked, view)).toBe("amber");
    expect(nodeLamp("plan", undefined, booked, view)).toBe("red");
    expect(nodeLamp("commitment", venue, booked)).toBe("green");
  });
  it("falls back to the commitment status when the cascade has no entry for it", () => {
    expect(nodeLamp("commitment", venue, booked, { displayedStatus: {}, planLit: true })).toBe("green");
  });
});

describe("displayedPlan", () => {
  const viable = { ...blocked.plan!, status: "viable" as const };
  it("shows blocked until the plan lamp is lit", () => {
    expect(displayedPlan(viable, false)?.status).toBe("blocked");
    expect(displayedPlan({ ...viable, status: "booked" }, false)?.status).toBe("blocked");
    expect(displayedPlan(viable, true)).toBe(viable);
  });
  it("passes none, blocked and null through", () => {
    expect(displayedPlan(null, false)).toBeNull();
    expect(displayedPlan(blocked.plan, false)).toBe(blocked.plan);
  });
});

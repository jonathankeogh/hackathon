import { describe, expect, it } from "vitest";
import { plainCopy } from "./plainCopy";

describe("plainCopy", () => {
  it("turns spaced em and en dashes into commas", () => {
    expect(plainCopy("We need a venue — then a speaker")).toBe("We need a venue, then a speaker");
    expect(plainCopy("a – b")).toBe("a, b");
    expect(plainCopy("venue—then")).toBe("venue-then");
  });
  it("turns an unspaced dash in a range into a hyphen", () => {
    expect(plainCopy("3–4 people")).toBe("3-4 people");
  });
  it("turns separator dots and bullets into commas", () => {
    expect(plainCopy("WHATSAPP · London")).toBe("WHATSAPP, London");
    expect(plainCopy("a • b")).toBe("a, b");
  });
  it("leaves plain text alone", () => {
    expect(plainCopy("Hands-on Grok agents: 12 people.")).toBe("Hands-on Grok agents: 12 people.");
  });
});

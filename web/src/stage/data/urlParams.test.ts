import { describe, expect, it } from "vitest";
import { blocked, fixtures } from "../../fixtures";
import { fixtureFromSearch, soundFromSearch } from "./urlParams";

describe("fixtureFromSearch", () => {
  it("resolves every fixture by its key", () => {
    for (const f of fixtures) expect(fixtureFromSearch(`?fixture=${f.key}`)).toBe(f.state);
    expect(fixtureFromSearch("?x=1&fixture=blocked")).toBe(blocked);
  });
  it("is null with no or an unknown name, so the stage goes live", () => {
    expect(fixtureFromSearch("")).toBeNull();
    expect(fixtureFromSearch("?fixture=nope")).toBeNull();
    expect(fixtureFromSearch("?fixture=")).toBeNull();
    expect(fixtureFromSearch("?dev")).toBeNull();
  });
});

describe("soundFromSearch", () => {
  it("is on only for sound=1", () => {
    expect(soundFromSearch("?sound=1")).toBe(true);
    expect(soundFromSearch("?sound=0")).toBe(false);
    expect(soundFromSearch("?sound")).toBe(false);
    expect(soundFromSearch("")).toBe(false);
  });
});

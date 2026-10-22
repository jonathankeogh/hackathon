import { describe, expect, it } from "vitest";
import { layoutModeFor, PHONE_MAX_WIDTH } from "./layoutMode";

describe("layoutModeFor", () => {
  it.each([
    [390, 844, "phone"],
    [360, 740, "phone"],
    [844, 390, "phone"], // a phone held sideways is still narrower than 900px
    [768, 1024, "phone"], // a tablet in portrait
    [PHONE_MAX_WIDTH - 1, 500, "phone"],
    [1000, 1200, "phone"], // portrait wins whatever the width
    [PHONE_MAX_WIDTH, 600, "projector"],
    [1024, 768, "projector"], // a tablet in landscape
    [1920, 1080, "projector"],
    [1000, 1000, "projector"], // square is not portrait
  ] as const)("%ix%i is %s", (w, h, mode) => {
    expect(layoutModeFor(w, h)).toBe(mode);
  });
});

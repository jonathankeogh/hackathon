import { describe, expect, it } from "vitest";
import { fitScale } from "./fitScale";

describe("fitScale", () => {
  it("is 1 at exactly 1920x1080", () => {
    expect(fitScale(1920, 1080)).toBe(1);
  });
  it("letterboxes a taller viewport by width", () => {
    expect(fitScale(960, 1080)).toBe(0.5);
  });
  it("letterboxes a wider viewport by height", () => {
    expect(fitScale(3840, 540)).toBe(0.5);
  });
  it("falls back to 1 for a zero-sized viewport", () => {
    expect(fitScale(0, 0)).toBe(1);
  });
});

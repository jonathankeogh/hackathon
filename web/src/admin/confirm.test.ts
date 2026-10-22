import { describe, expect, it } from "vitest";
import { CONFIRM_WINDOW_MS, NOT_ARMED, isArmed, pressConfirm } from "./confirm";

describe("pressConfirm (two-tap confirm)", () => {
  it("arms on the first tap and does not fire", () => {
    const { next, fire } = pressConfirm(NOT_ARMED, "reset", 1000);
    expect(fire).toBe(false);
    expect(isArmed(next, "reset", 1000)).toBe(true);
  });

  it("fires on the second tap inside the window, then disarms", () => {
    const first = pressConfirm(NOT_ARMED, "reset", 1000).next;
    const second = pressConfirm(first, "reset", 1000 + CONFIRM_WINDOW_MS);
    expect(second.fire).toBe(true);
    expect(second.next).toEqual(NOT_ARMED);
  });

  it("re-arms instead of firing when the window has lapsed", () => {
    const first = pressConfirm(NOT_ARMED, "reset", 1000).next;
    const late = pressConfirm(first, "reset", 1001 + CONFIRM_WINDOW_MS);
    expect(late.fire).toBe(false);
    expect(late.next.at).toBe(1001 + CONFIRM_WINDOW_MS);
  });

  it("never fires one action from a tap armed for another", () => {
    const first = pressConfirm(NOT_ARMED, "seed", 1000).next;
    const other = pressConfirm(first, "reset", 1500);
    expect(other.fire).toBe(false);
    expect(isArmed(other.next, "reset", 1500)).toBe(true);
    expect(isArmed(other.next, "seed", 1500)).toBe(false);
  });
});

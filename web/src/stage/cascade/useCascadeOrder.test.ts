import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { StageEventEnvelope } from "../data/types";
import { useCascadeOrder } from "./useCascadeOrder";

const cascade = (seq: number, order: string[]): StageEventEnvelope => ({ seq, receivedAt: seq, event: { type: "cascade", order } });
const chunk = (seq: number): StageEventEnvelope => ({ seq, receivedAt: seq, event: { type: "explain:chunk", text: "x" } });

describe("useCascadeOrder", () => {
  it("is null before any cascade event", () => {
    expect(renderHook(() => useCascadeOrder([chunk(1)])).result.current).toBeNull();
  });
  it("returns the latest cascade order, each event with its own array identity", () => {
    const first = cascade(1, ["a", "b"]);
    const second = cascade(3, ["a", "b"]);
    const { result, rerender } = renderHook(({ events }) => useCascadeOrder(events), { initialProps: { events: [first, chunk(2)] } });
    const one = result.current;
    expect(one).toEqual(["a", "b"]);
    rerender({ events: [first, chunk(2), second] });
    expect(result.current).toEqual(["a", "b"]);
    expect(result.current).not.toBe(one);
  });
});

import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { JoinQR, joinUrl } from "./JoinQR";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const shown = (container: HTMLElement) => container.querySelector("[data-testid='join-qr']")!.lastElementChild!.textContent;

describe("JoinQR join URL", () => {
  it("falls back to the same-origin join URL when /api/config fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const { container } = render(<JoinQR />);
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/config"));
    expect(shown(container)).toBe(joinUrl().replace(/^[a-z][a-z0-9+.-]*:\/\//i, ""));
  });

  it("uses the joinUrl returned by /api/config", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ({ joinUrl: "https://demo.example.com/join" }) }));
    const { container } = render(<JoinQR />);
    await waitFor(() => expect(shown(container)).toBe("demo.example.com/join"));
  });
});

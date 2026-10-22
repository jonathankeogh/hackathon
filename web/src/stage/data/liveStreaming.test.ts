import { describe, expect, it } from "vitest";
import { liveStreaming } from "./liveStreaming";

describe("liveStreaming", () => {
  it("is null with nothing streamed", () => {
    expect(liveStreaming("", "")).toBeNull();
    expect(liveStreaming("", "Done.")).toBeNull();
  });
  it("passes the raw stream through while the explanation is still empty", () => {
    expect(liveStreaming("Every", "")).toBe("Every");
  });
  it("keeps a finished stream that equals the explanation, ignoring whitespace", () => {
    expect(liveStreaming("Everything hinges ", "Everything hinges")).toBe("Everything hinges ");
  });
  it("drops a partial tail (reload mid-stream) once the full explanation is in", () => {
    expect(liveStreaming("hinges on us", "Everything hinges on us")).toBeNull();
  });
});

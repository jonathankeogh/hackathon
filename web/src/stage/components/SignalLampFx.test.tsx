import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SignalLampFx } from "./SignalLampFx";

afterEach(cleanup);

const fx = (flash: boolean) => (
  <svg>
    <SignalLampFx flash={flash} cx={10} cy={10} r={8}>
      <circle cx={10} cy={10} r={8} />
    </SignalLampFx>
  </svg>
);

describe("SignalLampFx", () => {
  it("keeps its hook order when the flash switches on and off (no conditional hooks)", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { rerender } = render(fx(false));
    rerender(fx(true));
    rerender(fx(false));
    rerender(fx(true));
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });
});

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { digitsOf, Odometer } from "./Odometer";

afterEach(cleanup);

describe("digitsOf", () => {
  it("splits a whole number and floors bad input to 0", () => {
    expect(digitsOf(13)).toEqual([1, 3]);
    expect(digitsOf(7)).toEqual([7]);
    expect(digitsOf(-4)).toEqual([0]);
    expect(digitsOf(Number.NaN)).toEqual([0]);
    expect(digitsOf(9.9)).toEqual([9]);
  });
});

describe("Odometer", () => {
  it("renders one column per digit, each slid to its digit", () => {
    render(<Odometer value={13} size={50} />);
    const cols = screen.getAllByTestId("odo-col");
    expect(cols).toHaveLength(2);
    const strips = cols.map((c) => (c.firstElementChild as HTMLElement).style.transform);
    expect(strips).toEqual(["translateY(-10%)", "translateY(-30%)"]);
  });

  it("names itself with the number, or a custom label", () => {
    const { rerender } = render(<Odometer value={12} />);
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe("12");
    rerender(<Odometer value={12} label="12 going" />);
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe("12 going");
  });

  it("keeps the ones column when a digit is added", () => {
    const { rerender } = render(<Odometer value={9} />);
    const ones = screen.getAllByTestId("odo-col")[0];
    rerender(<Odometer value={10} />);
    const cols = screen.getAllByTestId("odo-col");
    expect(cols).toHaveLength(2);
    expect(cols[1]).toBe(ones);
  });
});

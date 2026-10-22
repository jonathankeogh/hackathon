import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TextField } from "./TextField";

afterEach(cleanup);

describe("TextField", () => {
  it("labels the input and reports typed values", () => {
    const onChange = vi.fn();
    render(<TextField label="Your name" value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Ada" } });
    expect(onChange).toHaveBeenCalledWith("Ada");
  });

  it("shows a hint when there is no error", () => {
    render(<TextField label="Phone" value="" onChange={() => undefined} hint="UK numbers only" />);
    expect(screen.getByText("UK numbers only")).toBeTruthy();
    expect(screen.getByLabelText("Phone").getAttribute("aria-invalid")).toBeNull();
  });

  it("marks an error with a red fill and a lamp, and keeps the message text uncoloured", () => {
    const { container } = render(<TextField label="Phone" value="x" onChange={() => undefined} error="Not a number" />);
    const input = screen.getByLabelText("Phone");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByTestId("field-error-marker")).toBeTruthy();
    expect(container.querySelector('[data-state="red"]')).not.toBeNull();
    const message = screen.getByText("Not a number");
    expect(message.style.color).not.toContain("255, 59, 48");
    expect(message.style.color.toLowerCase()).not.toBe("#ff3b30");
    expect(screen.getByRole("alert").id).toBe(input.getAttribute("aria-describedby"));
  });

  it("can be disabled", () => {
    render(<TextField label="Group" value="Locked" onChange={() => undefined} disabled />);
    expect((screen.getByLabelText("Group") as HTMLInputElement).disabled).toBe(true);
  });
});

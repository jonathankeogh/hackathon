import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

afterEach(cleanup);

describe("Button", () => {
  it("calls onClick when pressed", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is primary by default and can be secondary", () => {
    const { rerender } = render(<Button>Go</Button>);
    expect(screen.getByRole("button").className).toContain("ds-button-primary");
    rerender(<Button variant="secondary">Go</Button>);
    expect(screen.getByRole("button").className).toContain("ds-button-secondary");
  });

  it("swallows presses when disabled and says so", () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Go
      </Button>,
    );
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    expect(button.getAttribute("aria-disabled")).toBe("true");
  });

  it("shows a lamp, not a spinner, and blocks presses while loading", () => {
    const onClick = vi.fn();
    const { container } = render(
      <Button loading onClick={onClick}>
        Sending
      </Button>,
    );
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(container.querySelector(".ds-lamp-blink")).not.toBeNull();
    expect(container.querySelector("svg")).toBeNull();
  });

  it("renders as a link when given an href, and drops it while disabled", () => {
    const { rerender } = render(<Button href="/next">Next</Button>);
    expect(screen.getByRole("link", { name: "Next" }).getAttribute("href")).toBe("/next");
    rerender(
      <Button href="/next" disabled>
        Next
      </Button>,
    );
    expect(screen.getByRole("link", { name: "Next" }).getAttribute("href")).toBeNull();
  });
});

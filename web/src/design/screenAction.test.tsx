import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Button } from "./Button";
import { Screen } from "./Screen";

afterEach(cleanup);

describe("Screen desktopAction", () => {
  it("pins the action to the bottom by default and can place it inline", () => {
    const { container, rerender } = render(<Screen action={<Button>Go</Button>}>x</Screen>);
    expect(container.querySelector(".ds-screen")?.getAttribute("data-desktop-action")).toBe("bottom");
    rerender(
      <Screen desktopAction="inline" action={<Button>Go</Button>}>
        x
      </Screen>,
    );
    expect(container.querySelector(".ds-screen")?.getAttribute("data-desktop-action")).toBe("inline");
  });
});

describe("Button newTab", () => {
  it("opens a link in a new tab without leaking the opener", () => {
    render(
      <Button href="/stage" newTab>
        Open
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Open" });
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noreferrer");
  });

  it("stays in the tab by default", () => {
    render(<Button href="/stage">Open</Button>);
    expect(screen.getByRole("link").getAttribute("target")).toBeNull();
  });
});

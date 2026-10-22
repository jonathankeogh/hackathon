import type { MouseEvent, ReactNode } from "react";
import "./design.css";
import { SignalLamp } from "./SignalLamp";

export interface ButtonProps {
  children: ReactNode;
  /** primary: text-colour fill with a ledge that sinks on press. secondary: outline. */
  variant?: "primary" | "secondary";
  disabled?: boolean;
  /** Shows a small blinking amber lamp and blocks presses. No spinner. */
  loading?: boolean;
  /** Fill the width of the container. */
  block?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  /** Render as a link (still styled as a button). */
  href?: string;
  /** With `href`: open in a new tab. */
  newTab?: boolean;
  className?: string;
}

/**
 * The pressable. The ledge below it (the only protrusion in the system) says "you can press
 * this" and sinks when pressed. Disabled and loading use aria-disabled and swallow clicks, so
 * the button stays focusable and announces its state.
 */
export function Button({ children, variant = "primary", disabled = false, loading = false, block = false, type = "button", onClick, href, newTab = false, className }: ButtonProps) {
  const blocked = disabled || loading;
  const classes = ["ds-button", `ds-button-${variant}`, "ds-focusable", block ? "ds-button-block" : "", className ?? ""].filter(Boolean).join(" ");
  const handle = (event: MouseEvent<HTMLElement>) => {
    if (blocked) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };
  const content = (
    <>
      {loading ? <SignalLamp state="amber" size="sm" blink /> : null}
      <span>{children}</span>
    </>
  );
  const shared = { className: classes, "aria-disabled": blocked || undefined, "data-loading": loading || undefined, "aria-busy": loading || undefined, onClick: handle };
  if (href !== undefined) {
    return (
      <a {...shared} href={blocked ? undefined : href} role={blocked ? "link" : undefined} target={newTab ? "_blank" : undefined} rel={newTab ? "noreferrer" : undefined}>
        {content}
      </a>
    );
  }
  return (
    <button {...shared} type={type}>
      {content}
    </button>
  );
}

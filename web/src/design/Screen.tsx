import type { ReactNode } from "react";
import "./design.css";
import { layout } from "./tokens";

export interface ScreenProps {
  /** Top of the page: a wordmark or a StepRail. Keep it small. */
  header?: ReactNode;
  /** The content of the screen: one idea. */
  children: ReactNode;
  /** THE one primary action. Sits at the bottom of the viewport when the content is short. */
  action?: ReactNode;
  /** narrow (560px, forms and phone flows) or wide (1200px, landing). Default narrow. */
  width?: keyof typeof layout.maxWidth;
  /**
   * Where the action sits from 768px up. "bottom" (default) pins it to the bottom of the
   * viewport like on phones; "inline" puts it right after the content, which reads better
   * when the content is short on a big screen.
   */
  desktopAction?: "bottom" | "inline";
}

/**
 * Full-bleed page shell. Gutters are 16px on phones and 48px from 768px up; the content column
 * is centred at the chosen max width. One screen, one idea, one primary action.
 */
export function Screen({ header, children, action, width = "narrow", desktopAction = "bottom" }: ScreenProps) {
  return (
    <div className="ds-root ds-screen" data-desktop-action={desktopAction}>
      <div className="ds-screen-inner" style={{ maxWidth: layout.maxWidth[width] }}>
        {header ? <header>{header}</header> : null}
        <main className="ds-screen-main">{children}</main>
        {action ? <div className="ds-screen-action">{action}</div> : null}
      </div>
    </div>
  );
}

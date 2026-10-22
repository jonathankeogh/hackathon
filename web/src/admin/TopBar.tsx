import { Label, Notice, SignalLamp } from "../design";
import type { StateV2 } from "../stage/data/v2types";
import { chatSourceLabel, planCell } from "./adminModel";
import type { Toast } from "./useAdminActions";

export interface TopBarProps {
  state: StateV2 | null;
  connected: boolean;
  toast: Toast | null;
}

/**
 * Sticky status bar: connection lamp, mock lamp, plan status cell, attendee count and chat
 * source. The toast hangs below the bar instead of inside it, so it never moves the page.
 */
export function TopBar({ state, connected, toast }: TopBarProps) {
  const cell = state ? planCell(state) : null;
  return (
    <div className="ad-top" data-testid="admin-status">
      <div className="ad-top-row">
        <span className="ad-chip">
          <SignalLamp state={connected ? "green" : "red"} size="sm" flash />
          <Label strong>{connected ? "Live" : "Offline"}</Label>
        </span>
        {state ? (
          <span className="ad-chip">
            <SignalLamp state={state.mock ? "amber" : "off"} size="sm" flash />
            <Label strong>{state.mock ? "Mock on" : "Mock off"}</Label>
          </span>
        ) : null}
        {cell ? (
          <span className="ad-cell" data-fill={cell.fill} data-testid="admin-plan">
            {cell.label}
          </span>
        ) : null}
      </div>
      {state ? (
        <div className="ad-top-row">
          <span className="ad-count" data-testid="admin-attendees">
            <span data-testid="admin-count">{state.attendeeCount}</span>
            <span className="ad-count-of">/{state.attendeeTarget} in</span>
          </span>
          <Label className="ad-source">{chatSourceLabel(state)}</Label>
        </div>
      ) : null}
      {toast ? (
        <div className="ad-toast" data-testid="admin-toast">
          <Notice tone={toast.tone}>{toast.text}</Notice>
        </div>
      ) : null}
    </div>
  );
}

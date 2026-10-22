import type { ReactNode } from "react";
import "./design.css";
import { useEntering } from "./motion";
import { SignalLamp, type LampState } from "./SignalLamp";
import { Text } from "./Text";

export type NoticeTone = "info" | "ok" | "warn" | "error";

export interface NoticeProps {
  tone?: NoticeTone;
  children: ReactNode;
}

const LAMP: Record<NoticeTone, LampState> = { info: "off", ok: "green", warn: "amber", error: "red" };

/** Inline status message: a lamp and plain text. The colour is on the lamp only. */
export function Notice({ tone = "info", children }: NoticeProps) {
  const entering = useEntering();
  return (
    <div className={entering ? "ds-notice ds-enter-fade" : "ds-notice"} role={tone === "error" ? "alert" : "status"} data-tone={tone}>
      <SignalLamp state={LAMP[tone]} size="sm" />
      <Text size="small" style={{ flex: 1 }}>
        {children}
      </Text>
    </div>
  );
}

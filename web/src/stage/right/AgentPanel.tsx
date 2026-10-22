import { useMemo, useRef } from "react";
import type { Person } from "@deadlock/shared/types";
import { alphas, fonts, type } from "../tokens";
import type { StateV2 } from "../data/v2types";
import { AgentLog } from "./AgentLog";
import { ASK_MIN_H, AskBlock } from "./AskBlock";
import { pickAsk, shownAsks } from "./agentLog";

const EMPTY: readonly string[] = [];

/**
 * The agent: what it is doing (log) and who it is asking (ask). Always mounted, so the lines
 * that arrive after the stage loaded type in while the ones already there do not; it renders
 * nothing when the state has no v2 agent data (see `hasAgentActivity` for the layout side).
 */
export function AgentPanel({ state, resolved = false }: { state: StateV2; resolved?: boolean }) {
  const log = state.agentLog ?? EMPTY;
  const baseline = useRef(log.length);
  if (log.length < baseline.current) baseline.current = log.length;
  const ask = pickAsk(shownAsks(state.asks, resolved));
  const people = useMemo(() => new Map<string, Person>(state.people.map((p) => [p.id, p])), [state.people]);
  if (log.length === 0 && ask === null) return null;
  return (
    <div data-testid="agent-panel" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontFamily: fonts.mono, fontSize: type.label, fontWeight: 600, opacity: alphas.read }}>AGENT</div>
      <AgentLog log={log} freshFrom={baseline.current} />
      <AskSlot ask={ask} person={ask ? people.get(ask.personId) : undefined} />
    </div>
  );
}

function AskSlot({ ask, person }: { ask: ReturnType<typeof pickAsk>; person: Person | undefined }) {
  return <div style={{ minHeight: ASK_MIN_H, marginTop: 8 }}>{ask && <AskBlock ask={ask} person={person} />}</div>;
}

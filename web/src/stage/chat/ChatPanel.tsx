import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Commitment, Message, Person } from "@deadlock/shared/types";
import { alphas, fonts, type, withAlpha } from "../tokens";
import { chatHeading, commitmentsForMessage, firstFittingIndex, rowOpacity, staggerDelays } from "./chatLogic";
import { MessageRow } from "./MessageRow";

const STAGGER_SECONDS = 0.12;
const ROW_GAP = 32;

interface Props {
  messages: readonly Message[];
  people: readonly Person[];
  commitments: readonly Commitment[];
  /** `state.chatSource.label`; falls back to the seeded chat heading. */
  label?: string;
}

/** Chronological chat, newest at the bottom, older rows fading out and clipped at the top. */
export function ChatPanel({ messages, people, commitments, label }: Props) {
  const seen = useRef<Set<string>>(new Set());
  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const ordered = useMemo(() => [...messages].sort((a, b) => a.ts - b.ts), [messages]);

  // Rows that would be cut through the middle at the top are hidden whole.
  const listRef = useRef<HTMLDivElement>(null);
  const [firstVisible, setFirstVisible] = useState(0);
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const heights = Array.from(list.children).map((el) => (el as HTMLElement).offsetHeight);
    setFirstVisible(firstFittingIndex(heights, ROW_GAP, list.clientHeight));
  }, [ordered]);

  // Computed during render (before the effect records them) so new rows get their delay.
  const delays = staggerDelays(ordered.map((m) => m.id), seen.current, STAGGER_SECONDS);
  useEffect(() => {
    for (const m of ordered) seen.current.add(m.id);
  }, [ordered]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "56px 48px 56px" }}>
      <div
        style={{
          flex: "none",
          fontFamily: fonts.mono,
          fontSize: type.label,
          fontWeight: 600,
          color: withAlpha("text", alphas.read),
          paddingBottom: 24,
          paddingLeft: 24,
          textTransform: "uppercase",
        }}
      >
        {chatHeading(label)}
      </div>
      <div
        ref={listRef}
        style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: ROW_GAP }}
      >
        {ordered.map((m, i) => (
          <MessageRow
            key={m.id}
            message={m}
            person={peopleById.get(m.personId)}
            opacity={i < firstVisible ? 0 : rowOpacity(ordered.length - 1 - i)}
            delay={delays.get(m.id) ?? 0}
            hasCommitment={commitmentsForMessage(m, commitments).length > 0}
          />
        ))}
      </div>
    </div>
  );
}

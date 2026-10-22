import { useMemo, useState } from "react";
import type { Commitment, Message, Person } from "@deadlock/shared/types";
import { Button } from "../../design";
import { chatHeading, commitmentsForMessage, rowOpacity } from "../chat/chatLogic";
import { MessageRow } from "../chat/MessageRow";
import { alphas, fonts, phoneSize, withAlpha } from "../tokens";

/** How many of the latest messages show before the chat is opened. */
export const COLLAPSED_MESSAGES = 3;

/** The messages to show: the latest few, or all of them once opened. Oldest first. */
export function visibleMessages<T>(ordered: readonly T[], open: boolean): readonly T[] {
  return open ? ordered : ordered.slice(-COLLAPSED_MESSAGES);
}

interface Props {
  messages: readonly Message[];
  people: readonly Person[];
  commitments: readonly Commitment[];
  /** `state.chatSource.label`. */
  label?: string;
}

/** The chat, last on the page: the latest 3 messages and a toggle for the rest. */
export function PhoneChat({ messages, people, commitments, label }: Props) {
  const [open, setOpen] = useState(false);
  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const ordered = useMemo(() => [...messages].sort((a, b) => a.ts - b.ts), [messages]);
  const shown = visibleMessages(ordered, open);
  const hidden = ordered.length - COLLAPSED_MESSAGES;
  if (ordered.length === 0) return null;
  return (
    <section data-testid="phone-chat" className="stage-phone-section">
      <div style={{ fontFamily: fonts.mono, fontSize: phoneSize.label, fontWeight: 600, textTransform: "uppercase", color: withAlpha("text", alphas.read), marginBottom: 20 }}>
        {chatHeading(label)}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {shown.map((m) => (
          <MessageRow
            key={m.id}
            message={m}
            person={peopleById.get(m.personId)}
            opacity={rowOpacity(ordered.length - 1 - ordered.indexOf(m))}
            delay={0}
            hasCommitment={commitmentsForMessage(m, commitments).length > 0}
          />
        ))}
      </div>
      {hidden > 0 && (
        <div style={{ marginTop: 24 }}>
          <Button variant="secondary" block onClick={() => setOpen((v) => !v)}>
            {open ? "Hide chat" : "Show chat"}
          </Button>
        </div>
      )}
    </section>
  );
}

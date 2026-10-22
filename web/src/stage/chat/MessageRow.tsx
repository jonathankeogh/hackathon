import type { CSSProperties } from "react";
import type { Message, Person } from "@deadlock/shared/types";
import { PersonName } from "../components/PersonName";
import { plainCopy } from "../text/plainCopy";
import { useStageScale } from "../layout/StageScale";
import { colors } from "../tokens";

interface Props {
  message: Message;
  person: Person | undefined;
  opacity: number;
  /** Stagger delay in seconds for a row that arrives with others; only applies to its entrance. */
  delay: number;
  hasCommitment: boolean;
}

/**
 * One chat message. It rises and fades in (a CSS animation, so it always ends on its normal
 * style) and carries an amber rule once a commitment is extracted. Rank-based opacity is a
 * CSS transition.
 */
export function MessageRow({ message, person, opacity, delay, hasCommitment }: Props) {
  const scale = useStageScale();
  return (
    <div
      className="dl-rise"
      style={{ "--dl-delay": `${delay}s`, position: "relative", paddingLeft: 24, flex: "none", opacity, transition: "opacity 0.25s linear" } as CSSProperties}
    >
      {hasCommitment && (
        <div
          data-testid="commitment-rule"
          className="dl-grow"
          style={{ position: "absolute", left: 0, top: 2, bottom: 2, width: 2, background: colors.amber, transformOrigin: "top" }}
        />
      )}
      <PersonName person={person} />
      <p style={{ margin: "6px 0 0", fontSize: scale.body, lineHeight: 1.35, fontWeight: 400 }}>{plainCopy(message.text)}</p>
    </div>
  );
}

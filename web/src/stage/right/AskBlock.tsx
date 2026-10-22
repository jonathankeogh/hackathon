import { Fragment } from "react";
import type { Person } from "@deadlock/shared/types";
import { SignalLampFx } from "../components/SignalLampFx";
import { PersonName } from "../components/PersonName";
import { plainCopy } from "../text/plainCopy";
import { colors, fonts, type } from "../tokens";
import type { LampStatus } from "../track/lampState";
import { SignalLamp } from "../track/SignalLamp";
import type { Ask } from "../data/v2types";
import { askHeading, firstName } from "./agentLog";
import { useFlashOnChange } from "../motion/useFlashOnChange";

const LAMP_BOX = 28;
const HOUSING_R = 14;
const LAMP_R = 10;
/** Room for the heading row plus two title-size question lines; the slot reserves it so nothing shifts on arrival. */
export const ASK_MIN_H = LAMP_BOX + 10 + 2 * Math.round(type.title * 1.3);

const LAMP_FOR: Record<Ask["status"], LampStatus> = { open: "amber", accepted: "green", declined: "red" };

export const askLamp = (status: Ask["status"]): LampStatus => LAMP_FOR[status];

/** The open (or latest) ask: a signal lamp, who is being asked, and the one-sentence question. */
export function AskBlock({ ask, person }: { ask: Ask; person: Person | undefined }) {
  const flash = useFlashOnChange(ask.status);
  const segments = askHeading(ask.status, firstName(person?.name));
  return (
    <div data-testid="agent-ask" key={ask.id} className="dl-rise">
      <div style={{ display: "flex", alignItems: "center", gap: 14, height: LAMP_BOX }}>
        <svg width={LAMP_BOX} height={LAMP_BOX} style={{ flex: "none", overflow: "visible" }}>
          <SignalLampFx flash={flash} cx={LAMP_BOX / 2} cy={LAMP_BOX / 2} r={LAMP_R}>
            <SignalLamp cx={LAMP_BOX / 2} cy={LAMP_BOX / 2} r={LAMP_R} housingR={HOUSING_R} status={askLamp(ask.status)} />
          </SignalLampFx>
        </svg>
        <div
          data-testid="agent-ask-heading"
          style={{ fontFamily: fonts.mono, fontSize: type.label, fontWeight: 700, color: colors.text, whiteSpace: "nowrap" }}
        >
          {segments.map((s, i) => (
            <Fragment key={i}>
              {i > 0 ? " " : null}
              {s.isName ? <PersonName person={person} label={s.text} style={{ verticalAlign: "middle" }} /> : <span>{s.text}</span>}
            </Fragment>
          ))}
        </div>
      </div>
      <p style={{ margin: "10px 0 0", fontFamily: fonts.sans, fontSize: type.title, lineHeight: 1.3, fontWeight: 500, color: colors.text }}>{plainCopy(ask.question)}</p>
    </div>
  );
}

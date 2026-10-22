import { useEffect, useState } from "react";
import type { PlanOption, PollAnswer, State, Suggestion } from "@deadlock/shared/types";
import { Button, Heading, Label, Notice, Odometer, Screen, SplitFlap, Stack, TextField } from "../design";
import { JoinedAs } from "./JoinedAs";
import { LineStatus } from "./Line";
import { rsvpLine } from "./model";
import { NoticeBanner } from "./NoticeBanner";
import { SuggestionCard } from "./SuggestionCard";
import { PollCard } from "./PollCard";
import { titleRows } from "./titleRows";
import "./join.css";

const SENT_MS = 3000;

export interface WaitingScreenProps {
  name: string;
  personId: string;
  state: State | null;
  connected: boolean;
  chatDenied: boolean;
  onChat: (text: string) => void;
  /** Plan ideas to vote on while there is no plan. */
  suggestion?: Suggestion | null;
  onVote?: (option: PlanOption["id"]) => void;
  /** Coming / bringing / guests, once there is a plan. */
  onPoll?: (answer: PollAnswer) => void;
}

function Chat({ denied, onSend }: { denied: boolean; onSend: (text: string) => void }) {
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  useEffect(() => {
    if (!sent) return;
    const id = window.setTimeout(() => setSent(false), SENT_MS);
    return () => window.clearTimeout(id);
  }, [sent]);
  const submit = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText("");
    setSent(true);
  };
  return (
    <form noValidate className="jn-chat" onSubmit={submit}>
      <TextField label="Tell the chat" placeholder="I'll bring a projector if..." value={text} onChange={setText} maxLength={200} />
      {denied ? <Notice tone="warn">The chat is closed for this event.</Notice> : sent ? <Notice tone="ok">Sent to the chat.</Notice> : null}
      <Button block variant="secondary" type="submit" disabled={!text.trim()}>
        Send
      </Button>
    </form>
  );
}

/**
 * What the phone shows while the plan runs: the status lamp, the confirmation and live count,
 * the plan on a small departures board, the bot's plan ideas to vote on before there is a plan,
 * and one box to talk to the chat.
 */
export function WaitingScreen({ name, personId, state, connected, chatDenied, onChat, suggestion = null, onVote, onPoll }: WaitingScreenProps) {
  const rows = state?.plan ? titleRows(state.plan.title) : [];
  return (
    <Screen header={<LineStatus state={state} connected={connected} />} action={<Chat denied={chatDenied} onSend={onChat} />}>
      <JoinedAs name={name} />
      <NoticeBanner notices={state?.notices} />
      {suggestion && onVote ? <SuggestionCard suggestion={suggestion} personId={personId} onVote={onVote} /> : null}
      <div data-testid="rsvp-line">
        <Heading level={1} size="title">
          {rsvpLine(state, personId)}
        </Heading>
      </div>
      {state ? (
        <div className="jn-count" data-testid="odometer">
          <Odometer value={state.attendeeCount} size={96} label={`${state.attendeeCount} of ${state.attendeeTarget} going`} />
          <span className="jn-count-side">
            <Label strong>of {state.attendeeTarget}</Label>
            <Label>going</Label>
          </span>
        </div>
      ) : null}
      {state?.plan && state.poll && onPoll ? <PollCard poll={state.poll} personId={personId} onAnswer={onPoll} /> : null}
      {rows.length > 0 ? (
        <Stack gap={8}>
          <Label>The plan</Label>
          <div className="jn-flaprows" data-testid="plan-board">
            {rows.map((row, i) => (
              <SplitFlap key={i} text={row} size={24} stagger={20} />
            ))}
          </div>
        </Stack>
      ) : null}
    </Screen>
  );
}

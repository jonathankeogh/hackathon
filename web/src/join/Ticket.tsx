import type { EventDetails, State } from "@deadlock/shared/types";
import { Heading, Label, Screen, Text } from "../design";
import { GoodToKnow } from "./GoodToKnow";
import { JoinedAs } from "./JoinedAs";
import { LineStatus } from "./Line";
import { NoticeBanner } from "./NoticeBanner";
import "./join.css";

export interface TicketProps {
  name: string;
  invite: string;
  event: EventDetails | null;
  state: State | null;
  connected: boolean;
}

/** The invite as a departures-board ticket: square, hairlines, no notches. */
export function Ticket({ name, invite, event, state, connected }: TicketProps) {
  const going = state?.attendeeCount;
  return (
    <Screen header={<LineStatus state={state} connected={connected} />}>
      <JoinedAs name={name} />
      <NoticeBanner notices={state?.notices} />
      <div className="jn-ticket" data-testid="invite">
        <div className="jn-ticket-head">
          <Label strong>Platform 1</Label>
          {going !== undefined ? <Label>{going} going</Label> : null}
        </div>
        <div className="jn-ticket-body">
          {event ? (
            <Heading level={1} size="title">
              {event.title}
            </Heading>
          ) : null}
          {event ? (
            <dl className="jn-rows">
              {(
                [
                  ["When", event.when],
                  ["Where", event.where],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="jn-rows-line">
                  <dt>
                    <Label>{k}</Label>
                  </dt>
                  <dd className="jn-mono">{v}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <Text>{invite}</Text>
        </div>
      </div>
      {event?.extras ? <GoodToKnow extras={event.extras} /> : null}
    </Screen>
  );
}

import { AskCard } from "./AskCard";
import { CallScreen } from "./CallScreen";
import { Enter } from "./Enter";
import { JoinScreen } from "./JoinScreen";
import { LineClear } from "./LineClear";
import type { JoinModel } from "./model";
import { RsvpScreen } from "./RsvpScreen";
import { Ticket } from "./Ticket";
import { WaitingScreen } from "./WaitingScreen";
import "./join.css";

/** Picks the one screen the model says to show. Pure view: the session or a mock supplies the model. */
export function JoinView({ model }: { model: JoinModel }) {
  const { screen, state, connected, me } = model;
  const name = me?.name ?? "";
  const personId = me?.personId ?? "";

  let body;
  switch (screen) {
    case "call":
      body = <CallScreen key={model.call} script={model.call ?? ""} onDone={model.endCall} preview={model.callPreview} />;
      break;
    case "join":
      body = <JoinScreen state={state} connected={connected} joining={model.joining} onJoin={model.join} />;
      break;
    case "ask":
      body = model.ask ? <AskCard ask={model.ask} onAnswer={model.answerAsk} /> : null;
      break;
    case "clear":
      body = <LineClear name={name} state={state} connected={connected} />;
      break;
    case "invite":
      body = <Ticket name={name} invite={model.invite ?? ""} event={state?.event ?? null} state={state} connected={connected} />;
      break;
    case "rsvp":
      body = <RsvpScreen name={name} state={state} connected={connected} onChoose={model.chooseRole} />;
      break;
    default:
      body = (
        <WaitingScreen
          name={name}
          personId={personId}
          state={state}
          connected={connected}
          chatDenied={model.chatDenied}
          onChat={model.sendChat}
          suggestion={screen === "suggest" ? model.suggestion : null}
          onVote={model.voteSuggestion}
        />
      );
  }
  return (
    <div className="ds-root jn-root">
      <Enter key={screen} kind={screen === "ask" || screen === "invite" ? "slide" : "rise"}>
        {body}
      </Enter>
    </div>
  );
}

import { Button, Label, Text } from "../design";
import type { StateV2 } from "../stage/data/v2types";
import { openAskOf, personName, proposalLine } from "./adminModel";
import type { Act } from "./useAdminActions";

/**
 * The agent is waiting on a yes or no. The question and two huge buttons, nothing else, so a
 * thumb can answer without reading a screen of controls. Renders nothing when no ask is open.
 */
export function OpenAsk({ state, act }: { state: StateV2; act: Act }) {
  const ask = openAskOf(state);
  if (!ask) return null;
  const answering = act.isPending("answer-yes") || act.isPending("answer-no");
  return (
    <section className="ad-ask" aria-label="Open ask" data-testid="open-ask">
      <div className="ad-ask-head">
        <Label strong>Agent asks {personName(state, ask.personId)}</Label>
      </div>
      <p className="ad-ask-question">{ask.question}</p>
      <Text size="small" muted>
        {proposalLine(state, ask)}
      </Text>
      <div className="ad-ask-actions">
        <Button
          block
          className="ad-huge"
          loading={act.isPending("answer-yes")}
          disabled={act.offline || answering}
          onClick={() => act.run("answer-yes", "admin:answer", { accept: true }, "accept the ask")}
        >
          Accept
        </Button>
        <Button
          block
          variant="secondary"
          className="ad-huge"
          loading={act.isPending("answer-no")}
          disabled={act.offline || answering}
          onClick={() => act.run("answer-no", "admin:answer", { accept: false }, "decline the ask")}
        >
          Decline
        </Button>
      </div>
    </section>
  );
}

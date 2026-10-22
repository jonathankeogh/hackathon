import type { Ask } from "@deadlock/shared/types";
import { Button, Heading, Label, Screen, SignalLamp, Stack } from "../design";
import "./join.css";

/** The agent asking this phone's person to bend: one question, two huge buttons. */
export function AskCard({ ask, onAnswer }: { ask: Ask; onAnswer: (accept: boolean) => void }) {
  return (
    <div data-testid="ask">
      <Screen
        header={
          <div className="jn-asking">
            <SignalLamp state="amber" size="md" blink />
            <Label strong>Deadlock is asking</Label>
          </div>
        }
        action={
          <Stack gap={16}>
            <Button block className="jn-huge" onClick={() => onAnswer(true)}>
              Yes
            </Button>
            <Button block variant="secondary" className="jn-huge" onClick={() => onAnswer(false)}>
              No
            </Button>
          </Stack>
        }
      >
        <div className="jn-ask-q">
          <Heading level={1} size={ask.question.length > 90 ? "title" : "display"}>
            {ask.question}
          </Heading>
        </div>
      </Screen>
    </div>
  );
}

import { useState } from "react";
import type { State } from "@deadlock/shared/types";
import { Button, Heading, Screen, Stack, Text, TextField } from "../design";
import { LineStatus } from "./Line";
import { Wordmark } from "./Wordmark";
import "./join.css";

export interface JoinScreenProps {
  state: State | null;
  connected: boolean;
  joining: boolean;
  onJoin: (name: string) => void;
}

/** The front door: the wordmark, one sentence, a first name and one button. */
export function JoinScreen({ state, connected, joining, onJoin }: JoinScreenProps) {
  const [name, setName] = useState("");
  const submit = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    if (name.trim() && !joining) onJoin(name);
  };
  return (
    <form noValidate onSubmit={submit}>
      <Screen
        header={<LineStatus state={state} connected={connected} />}
        action={
          <Button block type="submit" loading={joining} disabled={!name.trim()} className="jn-cta">
            Join
          </Button>
        }
      >
        <Stack gap={32}>
          <Wordmark size={52} />
          <Stack gap={12}>
            <Heading level={1}>
              Everyone is waiting on everyone.
            </Heading>
            <Text muted>Join and help unblock the plan.</Text>
          </Stack>
        </Stack>
        <TextField
          label="Your first name"
          name="given-name"
          autoComplete="given-name"
          placeholder="Ada"
          hint="It goes up on the big screen."
          value={name}
          onChange={setName}
          maxLength={24}
        />
      </Screen>
    </form>
  );
}

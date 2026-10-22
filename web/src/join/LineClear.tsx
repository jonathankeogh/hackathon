import type { State } from "@deadlock/shared/types";
import { colors, Label, Screen, SplitFlap, Stack, Text } from "../design";
import { JoinedAs } from "./JoinedAs";
import { LineStatus } from "./Line";
import "./join.css";

/** Every phone in the room turns green together when the plan becomes viable. */
export function LineClear({ name, state, connected }: { name: string; state: State | null; connected: boolean }) {
  return (
    <div data-testid="line-clear">
      <Screen header={<LineStatus state={state} connected={connected} />}>
        <JoinedAs name={name} />
        <div className="jn-clear-board">
          <SplitFlap text="LINE" size={72} fill={colors.green} />
          <SplitFlap text="CLEAR" size={72} fill={colors.green} />
        </div>
        <Stack gap={8}>
          <Label strong>Every condition is met</Label>
          <Text muted>Booking it now. Your ticket is on its way.</Text>
        </Stack>
      </Screen>
    </div>
  );
}

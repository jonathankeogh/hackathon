import type { State } from "@deadlock/shared/types";
import { Button, Heading, Label, Screen, Stack, Text } from "../design";
import { JoinedAs } from "./JoinedAs";
import { LineStatus } from "./Line";
import { ROLE_LABEL, type Role } from "./model";
import "./join.css";

const ROLES: Role[] = ["attend", "laptop", "help"];

export interface RsvpScreenProps {
  name: string;
  state: State | null;
  connected: boolean;
  onChoose: (role: Role) => void;
}

/** Three big rows in the thumb zone. One tap sends the RSVP and moves on. */
export function RsvpScreen({ name, state, connected, onChoose }: RsvpScreenProps) {
  return (
    <Screen
      header={<LineStatus state={state} connected={connected} />}
      action={
        <Stack gap={16}>
          {ROLES.map((role, i) => (
            <Button key={role} block variant="secondary" className="jn-row" onClick={() => onChoose(role)}>
              <Label>{String(i + 1).padStart(2, "0")}</Label>
              {ROLE_LABEL[role]}
            </Button>
          ))}
        </Stack>
      }
    >
      <Stack gap={12}>
        <Heading level={1}>You're in, {name}.</Heading>
        <JoinedAs name={name} />
        <Text muted>How will you show up?</Text>
      </Stack>
    </Screen>
  );
}

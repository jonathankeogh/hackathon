import { useState } from "react";
import { Button } from "../Button";
import { Divider } from "../Divider";
import { Heading } from "../Heading";
import { Label } from "../Label";
import { Notice } from "../Notice";
import { QRPlate } from "../QRPlate";
import { SignalLamp, type LampState } from "../SignalLamp";
import { SplitFlap } from "../SplitFlap";
import { Stack } from "../Stack";
import { StepRail, type Step } from "../StepRail";
import { Text } from "../Text";
import { TextField } from "../TextField";
import { colors } from "../tokens";
import { Grid, Section, Specimen } from "./parts";

const STEPS: readonly Step[] = [
  { id: "you", label: "You" },
  { id: "link", label: "Link" },
  { id: "group", label: "Group" },
  { id: "ready", label: "Ready" },
];
const LAMPS: readonly LampState[] = ["red", "amber", "green", "off"];

export function TextSection() {
  return (
    <Section title="Heading, Text, Label, Divider">
      <Heading>Display heading</Heading>
      <Heading level={2}>Title heading</Heading>
      <Heading level={2} mono>
        Title in mono
      </Heading>
      <Text>Body text in Plex Sans. It reads at full strength.</Text>
      <Text muted>Muted body text sits at the 60% read step.</Text>
      <Text size="small">Small text for fine print.</Text>
      <Label strong>Label strong</Label>
      <Label>Label muted</Label>
      <Specimen name="Divider, horizontal and vertical">
        <Stack gap={16}>
          <Divider />
          <Stack direction="row" gap={16} align="center" style={{ height: 32 }}>
            <Text>Left</Text>
            <Divider vertical />
            <Text>Right</Text>
          </Stack>
        </Stack>
      </Specimen>
    </Section>
  );
}

export function ButtonSection() {
  const [presses, setPresses] = useState(0);
  const [busy, setBusy] = useState(false);
  const press = () => {
    setPresses((n) => n + 1);
    setBusy(true);
    window.setTimeout(() => setBusy(false), 1500);
  };
  return (
    <Section title="Button">
      <Grid min={260}>
        <Specimen name="primary (press it)">
          <Button onClick={press} loading={busy}>
            Create event
          </Button>
        </Specimen>
        <Specimen name="secondary">
          <Button variant="secondary" onClick={() => setPresses((n) => n + 1)}>
            Back
          </Button>
        </Specimen>
        <Specimen name="primary disabled">
          <Button disabled>Continue</Button>
        </Specimen>
        <Specimen name="secondary disabled">
          <Button variant="secondary" disabled>
            Skip
          </Button>
        </Specimen>
        <Specimen name="primary loading">
          <Button loading>Sending</Button>
        </Specimen>
        <Specimen name="secondary loading">
          <Button variant="secondary" loading>
            Checking
          </Button>
        </Specimen>
        <Specimen name="as link">
          <Button href="#buttons">Open link</Button>
        </Specimen>
        <Specimen name="block, full width">
          <Button block>Join the group</Button>
        </Specimen>
      </Grid>
      <Text size="small" muted>
        Presses so far: {presses}
      </Text>
    </Section>
  );
}

export function FieldSection() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("07700 900");
  const [bad, setBad] = useState("not a number");
  return (
    <Section title="TextField">
      <Grid min={300}>
        <Specimen name="outline, empty">
          <TextField label="Your name" value={name} onChange={setName} placeholder="Ada" hint="First name is enough." />
        </Specimen>
        <Specimen name="outline, filled">
          <TextField label="Phone" value={phone} onChange={setPhone} type="tel" />
        </Specimen>
        <Specimen name="outline, error">
          <TextField label="Phone" value={bad} onChange={setBad} error="Use a UK mobile number." />
        </Specimen>
        <Specimen name="underline">
          <TextField variant="underline" label="Event name" value={name} onChange={setName} placeholder="Thursday dinner" />
        </Specimen>
        <Specimen name="underline, error">
          <TextField variant="underline" label="Event name" value="" onChange={setName} error="Give it a name." />
        </Specimen>
        <Specimen name="disabled">
          <TextField label="Group" value="Locked" onChange={setName} disabled />
        </Specimen>
      </Grid>
    </Section>
  );
}

export function LampSection() {
  return (
    <Section title="SignalLamp, StepRail, Notice">
      <Specimen name="sizes sm 16, md 24, lg 40 by state">
        <Stack gap={16}>
          {(["sm", "md", "lg"] as const).map((size) => (
            <Stack key={size} direction="row" gap={24} align="center">
              <Label style={{ width: 48 }}>{size}</Label>
              {LAMPS.map((state) => (
                <SignalLamp key={state} state={state} size={size} label={`${state} lamp`} />
              ))}
            </Stack>
          ))}
          <Stack direction="row" gap={24} align="center">
            <Label style={{ width: 48 }}>blink</Label>
            <SignalLamp state="amber" blink />
          </Stack>
        </Stack>
      </Specimen>
      <FlashDemo />
      <Specimen name="StepRail, current: link">
        <StepRail steps={STEPS} current="link" />
      </Specimen>
      <Specimen name="StepRail, first, last, complete">
        <Stack gap={24}>
          <StepRail steps={STEPS} current="you" />
          <StepRail steps={STEPS} current="ready" />
          <StepRail steps={STEPS} current="ready" complete />
        </Stack>
      </Specimen>
      <Specimen name="Notice: info, ok, warn, error">
        <Stack gap={12}>
          <Notice>Waiting for the group to be linked.</Notice>
          <Notice tone="ok">Your group is linked.</Notice>
          <Notice tone="warn">Two people have not answered yet.</Notice>
          <Notice tone="error">That link did not work. Try again.</Notice>
        </Stack>
      </Specimen>
    </Section>
  );
}

function FlashDemo() {
  const [state, setState] = useState<LampState>("amber");
  const next = state === "amber" ? "green" : state === "green" ? "red" : "amber";
  return (
    <Specimen name="flash on change (press to switch)">
      <Stack direction="row" gap={24} align="center">
        <SignalLamp state={state} size="lg" flash />
        <Button variant="secondary" onClick={() => setState(next)}>
          Switch to {next}
        </Button>
      </Stack>
    </Specimen>
  );
}

export function BoardSection() {
  const [on, setOn] = useState(false);
  return (
    <Section title="SplitFlap, QRPlate">
      <Specimen name="SplitFlap (press to change)">
        <Stack gap={16} align="flex-start">
          <SplitFlap text={on ? "GO" : "BLOCKED"} size={40} fill={on ? colors.green : colors.red} />
          <Button variant="secondary" onClick={() => setOn((v) => !v)}>
            Flip
          </Button>
        </Stack>
      </Specimen>
      <Specimen name="QRPlate">
        <QRPlate value="https://deadlock.app/j/abc123" />
      </Specimen>
    </Section>
  );
}

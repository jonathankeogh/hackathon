import { useState } from "react";
import { Button, Heading, Screen, StepRail, Stack, Text, TextField } from "../design";
import { cleanSignup, RAIL_STEPS, validateSignup, type SignupValues } from "./flow";
import "./flow.css";

export interface SignUpStepProps {
  initial: SignupValues;
  onSubmit: (values: SignupValues) => void;
}

/** Organiser first name and email. Errors show as a red fill marker on the field. */
export function SignUpStep({ initial, onSubmit }: SignUpStepProps) {
  const [values, setValues] = useState(initial);
  const [touched, setTouched] = useState({ name: false, email: false });
  const errors = validateSignup(values);
  const show = (key: keyof SignupValues) => (touched[key] ? errors[key] : undefined);
  const touch = (key: keyof SignupValues) => () => setTouched((t) => ({ ...t, [key]: true }));

  const submit = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    setTouched({ name: true, email: true });
    if (Object.keys(errors).length === 0) onSubmit(cleanSignup(values));
  };

  return (
    <form noValidate onSubmit={submit}>
      <Screen
        desktopAction="inline"
        header={
          <div className="nf-rail">
            <StepRail steps={RAIL_STEPS} current="signup" />
          </div>
        }
        action={
          <Button block type="submit">
            Continue
          </Button>
        }
      >
        <Stack gap={8}>
          <Heading level={1} size="title">
            Who is organising?
          </Heading>
          <Text muted>Your name and email stay in this browser for now.</Text>
        </Stack>
        <Stack gap={24}>
          <TextField
            label="First name"
            name="given-name"
            autoComplete="given-name"
            value={values.name}
            onChange={(name) => setValues((v) => ({ ...v, name }))}
            onBlur={touch("name")}
            error={show("name")}
            maxLength={80}
          />
          <TextField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={values.email}
            onChange={(email) => setValues((v) => ({ ...v, email }))}
            onBlur={touch("email")}
            error={show("email")}
          />
        </Stack>
      </Screen>
    </form>
  );
}

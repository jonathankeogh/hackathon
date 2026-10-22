import { useMemo, useState } from "react";
import { DeniedStep } from "./DeniedStep";
import { readDevMock } from "./devMock";
import { isLive, selectStep, type Phase, type SignupValues } from "./flow";
import { LandingStep } from "./LandingStep";
import { LiveStep } from "./LiveStep";
import { ScanStep } from "./ScanStep";
import { loadOrganiser, saveOrganiser } from "./session";
import { SignUpStep } from "./SignUpStep";
import { StepEnter } from "./StepEnter";
import { useWaSocket } from "./useWaSocket";

/**
 * The organiser flow for / and /new: landing, sign up, scan the WhatsApp QR, live. The step
 * comes from the local phase and the bridge status (selectStep); each step is its own file.
 */
export default function OnboardingFlow() {
  const mock = useMemo(() => readDevMock(window.location.search), []);
  const [phase, setPhase] = useState<Phase>(mock?.phase ?? "idle");
  const [organiser, setOrganiser] = useState<SignupValues>(() => {
    const saved = loadOrganiser();
    return mock && !saved.name ? { ...saved, name: "Sam" } : saved;
  });
  const { wa, denied, startNew } = useWaSocket(mock?.wa ?? null);

  const signUp = (values: SignupValues) => {
    saveOrganiser(values);
    setOrganiser(values);
    startNew();
    setPhase("started");
  };
  const startOver = () => startNew();

  if (denied) return <DeniedStep />;
  const step = selectStep(phase, wa);
  // The landing page is a long scrolling page with fixed and sticky layers, so it is not wrapped
  // in the step entrance (a transform on an ancestor would break position: fixed).
  if (step === "landing") return <LandingStep live={isLive(wa)} liveIn={wa?.active?.name} onSignUp={() => setPhase("signup")} />;
  return (
    <StepEnter key={step}>
      {step === "signup" ? <SignUpStep initial={organiser} onSubmit={signUp} /> : null}
      {step === "scan" ? <ScanStep wa={wa} /> : null}
      {step === "live" ? <LiveStep name={organiser.name} onStartOver={startOver} /> : null}
    </StepEnter>
  );
}

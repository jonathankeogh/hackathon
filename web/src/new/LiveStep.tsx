import { useState } from "react";
import { Button, Heading, Label, Notice, QRPlate, Screen, Stack, StepRail, Text } from "../design";
import { liveHeading, RAIL_STEPS } from "./flow";
import { useJoinUrl } from "./useJoinUrl";
import "./flow.css";

export interface LiveStepProps {
  name: string;
  onStartOver: () => void;
}

/** Linked. Tag @deadlock in any chat; open the stage; the audience join QR is secondary. */
export function LiveStep({ name, onStartOver }: LiveStepProps) {
  const joinUrl = useJoinUrl();
  const [asking, setAsking] = useState(false);
  return (
    <Screen
      width="wide"
      desktopAction="inline"
      header={
        <div className="nf-rail">
          <StepRail steps={RAIL_STEPS} current="live" complete />
        </div>
      }
      action={
        <Stack gap={12}>
          {asking ? (
            <div className="nf-confirm">
              <Notice tone="warn">Starting over unlinks this WhatsApp and ends the current plan.</Notice>
            </div>
          ) : null}
          <div className="nf-actions">
            {asking ? (
              <>
                <Button block variant="secondary" className="nf-cta" onClick={onStartOver}>
                  Unlink and start over
                </Button>
                <Button block variant="secondary" className="nf-cta" onClick={() => setAsking(false)}>
                  Keep it
                </Button>
              </>
            ) : (
              <>
                <Button block className="nf-cta" href="/stage" newTab>
                  Open stage
                </Button>
                <Button block variant="secondary" className="nf-cta" onClick={() => setAsking(true)}>
                  Start over
                </Button>
              </>
            )}
          </div>
        </Stack>
      }
    >
      <div className="nf-live">
        <Stack gap={16}>
          <Heading>{liveHeading(name)}</Heading>
          <Text muted>Tag @deadlock in any WhatsApp group where a plan is stuck.</Text>
        </Stack>
        {joinUrl ? (
          <div className="nf-join">
            <Label>Audience join</Label>
            <QRPlate value={joinUrl} size={240} />
          </div>
        ) : null}
      </div>
    </Screen>
  );
}

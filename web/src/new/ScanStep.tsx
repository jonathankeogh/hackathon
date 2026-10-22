import { Heading, Label, QRPlate, Screen, SignalLamp, Stack, StepRail, Text, layout } from "../design";
import { BRIDGE_HINT_MS, qrPayload, qrSize, RAIL_STEPS, type WaStatus } from "./flow";
import { useAfter, useViewport } from "./useViewport";
import "./flow.css";

export interface ScanStepProps {
  wa: WaStatus | null;
}

/** Edge of the link QR for this viewport. */
function useQrEdge(): number {
  const { width, height } = useViewport();
  const gutter = width >= layout.breakpoint ? layout.gutter.desktop : layout.gutter.phone;
  return qrSize(width, height, gutter);
}

function Waiting({ edge, slow }: { edge: number; slow: boolean }) {
  return (
    <Stack gap={16}>
      <div className="nf-wait" role="status" style={{ width: edge, height: edge }}>
        <SignalLamp state="amber" size="lg" blink />
        <Label strong>Starting the bridge</Label>
      </div>
      {slow ? (
        <Text size="small" muted>
          Taking long? Start the bridge on the laptop: <span className="nf-code">~/whatsapp-mcp/whatsapp-bridge/run-bridge.sh</span>
        </Text>
      ) : null}
    </Stack>
  );
}

/** The WhatsApp link QR, big, with the one instruction. A calm lamp while the bridge starts. */
export function ScanStep({ wa }: ScanStepProps) {
  const edge = useQrEdge();
  const qr = qrPayload(wa);
  const slow = useAfter(BRIDGE_HINT_MS, qr === null);
  return (
    <Screen
      desktopAction="inline"
      header={
        <div className="nf-rail">
          <StepRail steps={RAIL_STEPS} current="scan" />
        </div>
      }
    >
      <Stack gap={8}>
        <Heading level={1} size="title">
          Link your WhatsApp
        </Heading>
        <Text className="nf-balance">WhatsApp {">"} Settings {">"} Linked devices {">"} Link a device</Text>
      </Stack>
      {qr ? (
        <Stack gap={16}>
          <QRPlate value={qr} size={edge} showUrl={false} />
          <span className="nf-scan-note">
            <SignalLamp state="amber" size="sm" blink />
            <Text size="small" muted>
              Waiting for the scan
            </Text>
          </span>
        </Stack>
      ) : (
        <Waiting edge={edge} slow={slow} />
      )}
    </Screen>
  );
}

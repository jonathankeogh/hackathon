import { Button } from "../../design";
import { useJoinUrl } from "../components/JoinQR";
import { Odometer } from "../components/Odometer";

const ODOMETER_SIZE = 56;

/**
 * The attendee counter and the way in. A phone is already the join device, so the QR the
 * projector shows becomes a big Join button to the same URL (from /api/config).
 */
export function PhoneJoin({ value, target }: { value: number; target: number }) {
  const url = useJoinUrl();
  return (
    <section data-testid="phone-join" className="stage-phone-section" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <Odometer value={value} target={target} size={ODOMETER_SIZE} />
      <Button block href={url}>
        Join
      </Button>
    </section>
  );
}

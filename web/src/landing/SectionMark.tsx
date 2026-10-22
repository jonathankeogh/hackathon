import { SignalLamp, useInView } from "../design";

/**
 * A section divider: a numbered label and a hairline rail that draws in from the left. The
 * lamp at the start goes from red to green when the section arrives, like a signal clearing.
 */
export function SectionMark({ n, label, id }: { n: string; label: string; id?: string }) {
  const [ref, seen] = useInView<HTMLDivElement>(0.6);
  return (
    <div className="lp-mark lp-wrap" id={id} ref={ref} data-in={seen}>
      <SignalLamp size="sm" state={seen ? "green" : "red"} flash />
      <span className="lp-mark-n">{n}</span>
      <span className="lp-mark-label">{label}</span>
      <span className="lp-mark-rail" aria-hidden />
    </div>
  );
}

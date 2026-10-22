import { useCascade } from "./cascade/useCascade";
import { useCascadeOrder } from "./cascade/useCascadeOrder";
import type { StageData } from "./data/types";
import { useSession } from "./data/useSession";
import { useStageData } from "./data/useStageData";
import { StageCanvas } from "./layout/StageCanvas";
import { StageLayout } from "./layout/StageLayout";
import { useLayoutMode, type LayoutMode } from "./layout/layoutMode";
import { PhoneLayout } from "./phone/PhoneLayout";
import { chime, initSoundFromUrl, relayClick } from "./sound/stageSound";

const CASCADE_HOOKS = { onReveal: relayClick, onPlanLit: chime } as const;

if (typeof location !== "undefined") initSoundFromUrl(location.search);

function Stage({ state, events, streaming, mode }: Pick<StageData, "state" | "events" | "streaming"> & { mode: LayoutMode }) {
  // The data, cascade, sound and reset all live here, above the layout, so the phone and the
  // projector layouts share them and a rotation only swaps what is drawn.
  const cascade = useCascade(state, useCascadeOrder(events), CASCADE_HOOKS);
  if (mode === "phone") return <PhoneLayout state={state} cascade={cascade} streaming={streaming} />;
  return (
    <StageCanvas>
      <StageLayout state={state} cascade={cascade} streaming={streaming} />
    </StageCanvas>
  );
}

/**
 * The stage is passive: the server drives everything and this only renders it. It mounts
 * only once the first server snapshot is in, so a page reload (or a late joiner) starts from
 * the current state with every component's first render being its settled one.
 *
 * Wide screens get the fixed 1920x1080 canvas scaled to fit (the projector); a portrait or
 * narrow viewport gets the one-column phone layout (`layoutModeFor`).
 *
 * A new session (the plan id changes, or the plan goes away after a "New event" or an admin
 * reset) remounts the whole stage and forgets the transient events, so no struck condition,
 * agent ask, cascade order or flap state from the old session survives.
 */
export function StageApp() {
  const data = useStageData();
  const session = useSession(data.state.plan?.id ?? null, data.events);
  const mode = useLayoutMode();
  return (
    <div className={`stage-root stage-root-${mode}`}>
      {data.ready ? <Stage key={session.key} state={data.state} events={session.events} streaming={data.streaming} mode={mode} /> : null}
    </div>
  );
}

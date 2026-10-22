import { useCascade } from "./cascade/useCascade";
import { useCascadeOrder } from "./cascade/useCascadeOrder";
import type { StageData } from "./data/types";
import { useSession } from "./data/useSession";
import { useStageData } from "./data/useStageData";
import { StageCanvas } from "./layout/StageCanvas";
import { StageLayout } from "./layout/StageLayout";
import { chime, initSoundFromUrl, relayClick } from "./sound/stageSound";

const CASCADE_HOOKS = { onReveal: relayClick, onPlanLit: chime } as const;

if (typeof location !== "undefined") initSoundFromUrl(location.search);

function Stage({ state, events, streaming }: Pick<StageData, "state" | "events" | "streaming">) {
  const cascade = useCascade(state, useCascadeOrder(events), CASCADE_HOOKS);
  return <StageLayout state={state} cascade={cascade} streaming={streaming} />;
}

/**
 * The stage is passive: the server drives everything and this only renders it. It mounts
 * only once the first server snapshot is in, so a page reload (or a late joiner) starts from
 * the current state with every component's first render being its settled one.
 *
 * A new session (the plan id changes, or the plan goes away after a "New event" or an admin
 * reset) remounts the whole stage and forgets the transient events, so no struck condition,
 * agent ask, cascade order or flap state from the old session survives.
 */
export function StageApp() {
  const data = useStageData();
  const session = useSession(data.state.plan?.id ?? null, data.events);
  return (
    <StageCanvas>
      {data.ready ? <Stage key={session.key} state={data.state} events={session.events} streaming={data.streaming} /> : null}
    </StageCanvas>
  );
}

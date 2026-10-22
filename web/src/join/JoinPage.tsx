import { useMemo } from "react";
import { readJoinMock } from "./devMock";
import { JoinView } from "./JoinView";
import { useJoinSession } from "./useJoinSession";

function LiveJoin() {
  return <JoinView model={useJoinSession()} />;
}

/**
 * The audience phone view for /join. In dev, `?mock=join|rsvp|waiting|ask|invite|call|connected`
 * previews a screen with no server (and no socket events). Otherwise the live session drives it.
 */
export default function JoinPage() {
  const mock = useMemo(() => readJoinMock(window.location.search), []);
  return mock ? <JoinView model={mock} /> : <LiveJoin />;
}

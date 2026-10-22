import { useServerState } from "./useServerState";

export function Placeholder({ route }: { route: string }) {
  const { state, connected } = useServerState();
  return (
    <main className="flex h-full flex-col items-start justify-center gap-6 p-8 font-mono">
      <p className="text-sm uppercase tracking-[0.2em] text-fg/60">Deadlock</p>
      <h1 className="text-5xl font-semibold uppercase tracking-tight">/{route}</h1>
      <p className="text-sm uppercase tracking-[0.15em]" data-testid="socket-status">
        <span className={connected ? "text-signal-green" : "text-signal-red"}>
          socket {connected ? "connected" : "disconnected"}
        </span>
        {state && <span className="text-fg/60"> · attendees {state.attendeeCount}/{state.attendeeTarget}</span>}
      </p>
    </main>
  );
}

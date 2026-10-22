import type { Ask } from "@deadlock/shared/types";

// The agent asking this phone's person to bend: one question, yes or no.

export function AskCard({ ask, onAnswer }: { ask: Ask; onAnswer: (accept: boolean) => void }) {
  const btn = "w-full border py-6 font-mono text-xl uppercase tracking-wider active:bg-fg active:text-bg";
  return (
    <main className="flex h-full flex-col px-7 pt-16 pb-10" data-testid="ask">
      <p className="flex items-center gap-3 font-mono text-[13px] uppercase tracking-[0.24em] text-fg/60">
        <span className="blink h-2.5 w-2.5 rounded-full bg-signal-amber" />
        Deadlock is asking
      </p>
      <div className="flex flex-1 items-center">
        <p className="text-[30px] leading-[1.25]">{ask.question}</p>
      </div>
      <div className="space-y-3">
        <button className={`${btn} border-signal-green text-signal-green`} onClick={() => onAnswer(true)}>
          Yes, that works
        </button>
        <button className={`${btn} border-rule text-signal-red`} onClick={() => onAnswer(false)}>
          No
        </button>
      </div>
    </main>
  );
}

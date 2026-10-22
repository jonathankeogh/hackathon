import type { PlanOption, Suggestion } from "@deadlock/shared/types";

// The bot's three plan ideas, one big tap each. Your vote is filled in;
// tapping another moves it.

const KIND: Record<PlanOption["id"], string> = { live: "Live", venue: "Bar", area: "Area" };

export function SuggestionCard({ suggestion, personId, onVote }: { suggestion: Suggestion; personId: string; onVote: (id: PlanOption["id"]) => void }) {
  const label = "font-mono text-[12px] uppercase tracking-[0.22em]";
  return (
    <section data-testid="suggestion-card">
      <p className={`${label} flex items-center gap-2.5 text-signal-amber`}>
        <span className="h-2.5 w-2.5 rounded-full bg-signal-amber" />
        {suggestion.topic}: pick a plan
      </p>
      <div className="mt-4 space-y-2.5">
        {suggestion.options.map((o, i) => {
          const mine = o.votes.includes(personId);
          return (
            <button
              key={o.id}
              data-testid={`vote-${o.id}`}
              onClick={() => onVote(o.id)}
              className={`w-full border p-4 text-left ${mine ? "border-fg bg-fg text-bg" : "border-rule active:bg-fg/10"}`}
            >
              <span className={`${label} flex justify-between ${mine ? "text-bg/70" : "text-fg/50"}`}>
                <span>
                  {i + 1} {KIND[o.id]}
                </span>
                <span>{o.votes.length} {o.votes.length === 1 ? "vote" : "votes"}</span>
              </span>
              <span className="mt-1.5 block text-[20px] font-semibold leading-tight">{o.title}</span>
              <span className={`mt-1 block text-[15px] leading-snug ${mine ? "text-bg/80" : "text-fg/70"}`}>{o.detail}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

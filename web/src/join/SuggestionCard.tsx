import type { PlanOption, Suggestion } from "@deadlock/shared/types";

// The bot's three plan ideas, one big tap each, with a vote bar towards the
// number that picks it. Your vote is filled in; tapping another moves it.

const KIND: Record<PlanOption["id"], string> = { live: "Live", venue: "Bar", area: "Area" };

export function SuggestionCard({ suggestion, personId, onVote }: { suggestion: Suggestion; personId: string; onVote: (id: PlanOption["id"]) => void }) {
  const label = "font-mono text-[12px] uppercase tracking-[0.22em]";
  const needed = suggestion.votesToPick ?? 3;
  const most = Math.max(...suggestion.options.map((o) => o.votes.length));
  const clue = suggestion.evidence?.at(-1);
  return (
    <section data-testid="suggestion-card">
      <p className={`${label} flex items-center gap-2.5 text-signal-amber`}>
        <span className="h-2.5 w-2.5 rounded-full bg-signal-amber" />
        Plan found: {suggestion.topic}
      </p>
      {clue && (
        <p className="mt-2 text-[15px] leading-snug text-fg/70">
          {suggestion.people.length} people talking, like "{clue.text}"
        </p>
      )}
      <div className="mt-4 space-y-2.5">
        {suggestion.options.map((o, i) => {
          const mine = o.votes.includes(personId);
          const leading = o.votes.length > 0 && o.votes.length === most;
          const share = Math.min(1, o.votes.length / needed);
          return (
            <button
              key={o.id}
              data-testid={`vote-${o.id}`}
              onClick={() => {
                if (navigator.userActivation?.hasBeenActive ?? true) navigator.vibrate?.(15);
                onVote(o.id);
              }}
              className={`w-full border p-4 text-left transition-colors ${mine ? "border-fg bg-fg text-bg" : "border-rule active:bg-fg/10"}`}
            >
              <span className={`${label} flex justify-between ${mine ? "text-bg/70" : "text-fg/50"}`}>
                <span>
                  {i + 1} {KIND[o.id]}
                  {mine ? ", your vote" : ""}
                </span>
                <span className={leading && !mine ? "text-signal-green" : ""}>
                  {o.votes.length}/{needed}
                </span>
              </span>
              <span className="mt-1.5 block text-[20px] font-semibold leading-tight">{o.title}</span>
              <span className={`mt-1 block text-[15px] leading-snug ${mine ? "text-bg/80" : "text-fg/70"}`}>{o.detail}</span>
              <span className={`mt-3 block h-1.5 ${mine ? "bg-bg/20" : "bg-rule"}`}>
                <span
                  className={`block h-full transition-[width] duration-300 ${leading ? "bg-signal-green" : "bg-signal-amber"}`}
                  style={{ width: `${share * 100}%` }}
                />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

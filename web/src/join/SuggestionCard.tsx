import type { PlanOption, Suggestion } from "@deadlock/shared/types";
import { Button, Label, SignalLamp, Stack } from "../design";
import "./join.css";

const KIND: Record<PlanOption["id"], string> = { live: "Live", venue: "Bar", area: "Area" };

export interface SuggestionCardProps {
  suggestion: Suggestion;
  personId: string;
  onVote: (option: PlanOption["id"]) => void;
}

/**
 * The bot's three plan ideas, one big pressable row each. Your vote is the filled row (text
 * colour fill, background text); tapping another row moves it. Counts are in mono.
 */
export function SuggestionCard({ suggestion, personId, onVote }: SuggestionCardProps) {
  return (
    <section data-testid="suggestion-card" aria-label="Plan ideas">
      <Stack gap={16}>
        <div className="jn-asking">
          <SignalLamp state="amber" size="sm" />
          <Label strong>{suggestion.topic}: pick a plan</Label>
        </div>
        {suggestion.options.map((option, i) => {
          const mine = option.votes.includes(personId);
          const count = option.votes.length;
          return (
            <Button
              key={option.id}
              block
              variant={mine ? "primary" : "secondary"}
              className="jn-vote"
              onClick={() => onVote(option.id)}
            >
              <span className="jn-vote-body" data-testid={`vote-${option.id}`} data-mine={mine || undefined}>
                <span className="jn-vote-head">
                  <span className="jn-vote-meta">
                    {String(i + 1).padStart(2, "0")} {KIND[option.id]}
                  </span>
                  <span className="jn-vote-meta" data-testid={`votes-${option.id}`}>
                    {count} {count === 1 ? "vote" : "votes"}
                  </span>
                </span>
                <span className="jn-vote-title">{option.title}</span>
                <span className="jn-vote-detail">{option.detail}</span>
              </span>
            </Button>
          );
        })}
      </Stack>
    </section>
  );
}

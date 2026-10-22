import { useState, type FormEvent } from "react";
import { Button, Label, TextField } from "../design";
import type { StateV2 } from "../stage/data/v2types";
import { TRIGGER, effectivePersona } from "./adminModel";
import type { Act } from "./useAdminActions";

/** Send a chat message as any persona: the presenter's trigger line, or a nudge from a seed person. */
export function ChatSection({ state, act }: { state: StateV2; act: Act }) {
  const [picked, setPicked] = useState("p-host");
  const [text, setText] = useState("");
  const personId = effectivePersona(state, picked);
  const name = state.people.find((p) => p.id === personId)?.name ?? "someone";

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const body = text.trim();
    if (!body) return;
    if (act.run("chat", "chat:send", { personId, text: body }, `chat as ${name}`)) setText("");
  };

  return (
    <form className="ad-form" onSubmit={submit} aria-label="Chat">
      <div className="ad-field">
        <Label as="label" htmlFor="ad-persona" strong>
          Send as
        </Label>
        <select id="ad-persona" className="ad-select ds-focusable" value={personId} onChange={(e) => setPicked(e.target.value)}>
          {state.people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.source === "phone" ? " (phone)" : ""}
            </option>
          ))}
        </select>
      </div>
      <TextField label="Message" value={text} onChange={setText} placeholder="Type or fill the trigger" autoComplete="off" />
      <div className="ad-pair">
        <Button block variant="secondary" onClick={() => setText(TRIGGER)}>
          Fill trigger
        </Button>
        <Button block type="submit" loading={act.isPending("chat")} disabled={act.offline || !text.trim()}>
          Send
        </Button>
      </div>
    </form>
  );
}

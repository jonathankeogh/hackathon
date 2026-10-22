import type { ReactNode } from "react";
import { Button, Label, SignalLamp, Text } from "../design";
import type { StateV2 } from "../stage/data/v2types";
import { chatSourceLabel, isPhone } from "./adminModel";
import type { Act } from "./useAdminActions";
import { PickButtons } from "./PlanIdeas";
import { useConfirmTwice } from "./useConfirmTwice";

export interface SettingsProps {
  state: StateV2;
  act: Act;
  callTarget: string | null;
}

function Setting({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <div className="ad-setting">
      <Label strong>{title}</Label>
      {note ? (
        <Text size="small" muted>
          {note}
        </Text>
      ) : null}
      {children}
    </div>
  );
}

/** Everything that is not the show itself. Collapsed by default so a stray thumb cannot reach it. */
export function Settings({ state, act, callTarget }: SettingsProps) {
  const confirm = useConfirmTwice();
  const phones = state.people.filter(isPhone);
  const jobs = state.jobs ?? { weather: true, travel: true };
  const destructive = (id: "reset" | "seed" | "seedSports", event: string, payload: unknown, label: string, armedLabel: string, restLabel: string) => {
    const armed = confirm.armed(id);
    return (
      <Button
        block
        variant={armed ? "primary" : "secondary"}
        loading={act.isPending(id)}
        disabled={act.offline}
        onClick={() => confirm.press(id, () => act.run(id, event, payload, label))}
      >
        {armed ? armedLabel : restLabel}
      </Button>
    );
  };

  return (
    <details className="ad-settings">
      <summary className="ad-summary ds-focusable">Settings</summary>
      <div className="ad-settings-body">
        <Setting title="Mock LLM" note="Pre-written Grok answers. Switch on if the venue wifi dies.">
          <Button
            block
            variant="secondary"
            loading={act.isPending("mock")}
            disabled={act.offline}
            onClick={() => act.run("mock", "admin:mock", { on: !state.mock }, `mock ${state.mock ? "off" : "on"}`)}
          >
            <span className="ad-btn-inner">
              <SignalLamp state={state.mock ? "amber" : "off"} size="sm" />
              {state.mock ? "Mock is on, turn off" : "Mock is off, turn on"}
            </span>
          </Button>
        </Setting>

        <Setting title="Chat source" note="Set on the server with CHAT_SOURCE. It cannot be switched from here.">
          <Text>{chatSourceLabel(state)}</Text>
        </Setting>

        <Setting title="Who gets the call">
          <select
            className="ad-select ds-focusable"
            aria-label="Call target"
            data-testid="call-target"
            value={callTarget ?? ""}
            disabled={act.offline}
            onChange={(e) => act.run("callTarget", "admin:callTarget", { personId: e.target.value }, `call target ${e.target.selectedOptions[0]?.text ?? ""}`.trim())}
          >
            <option value="">Most recent phone</option>
            {phones.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Setting>

        <Setting title="Meet extras" note={state.notices?.at(-1)?.text ?? "Weather and travel refresh on a timer once a plan is detected."}>
          <div className="ad-grid2">
            {(["weather", "travel"] as const).map((job) => (
              <Button
                key={job}
                block
                variant="secondary"
                loading={act.isPending(`job-${job}`)}
                disabled={act.offline}
                onClick={() => act.run(`job-${job}`, "admin:jobs", { [job]: !jobs[job] }, `${job} job ${jobs[job] ? "off" : "on"}`)}
              >
                <span className="ad-btn-inner">
                  <SignalLamp state={jobs[job] ? "green" : "off"} size="sm" />
                  {`${job} ${jobs[job] ? "on" : "off"}`}
                </span>
              </Button>
            ))}
            {(["weather", "travel"] as const).map((kind) => (
              <Button
                key={kind}
                block
                variant="secondary"
                loading={act.isPending(`change-${kind}`)}
                disabled={act.offline}
                onClick={() => act.run(`change-${kind}`, "admin:simulateChange", { kind }, `${kind} change`)}
              >
                {`${kind} change`}
              </Button>
            ))}
          </div>
          <Button block variant="secondary" loading={act.isPending("tips")} disabled={act.offline} onClick={() => act.run("tips", "admin:step", { step: "tips" }, "re-read tips")}>
            Re-read tips and nearby
          </Button>
        </Setting>

        <Setting
          title="Plan ideas"
          note={state.suggestion ? "Live in the run sheet above." : "None yet. Fires when 3+ people talk about the same topic."}
        >
          <Button block variant="secondary" loading={act.isPending("suggest")} disabled={act.offline} onClick={() => act.run("suggest", "admin:step", { step: "suggest" }, "offer 3 plans")}>
            <span className="ad-row">
              <span className="ad-row-title">Offer 3 plans</span>
              <span className="ad-row-hint">For the busiest topic in the chat</span>
            </span>
          </Button>
          {state.suggestion ? null : <PickButtons act={act} />}
        </Setting>

        <Setting title="Start over" note="Tap twice. Re-seeding keeps the phones and clears the plan. Sports is a football chat, 6 people on it. Reset sends everyone back to join.">
          <div className="ad-grid2">
            {destructive("seed", "admin:seed", undefined, "re-seed chat", "Tap again to re-seed", "Re-seed chat")}
            {destructive("reset", "admin:reset", undefined, "reset demo", "Tap again to reset", "Reset demo")}
          </div>
          {destructive("seedSports", "admin:seed", { scenario: "sports" }, "seed sports chat", "Tap again to seed sports", "Seed sports chat")}
        </Setting>
      </div>
    </details>
  );
}

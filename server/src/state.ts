import type { State } from "@deadlock/shared/types";

// The single in-memory State. Every change goes through update() so all
// clients get a fresh `state` snapshot.

export const DEFAULT_ATTENDEE_TARGET = 15;

export function emptyState(mock: boolean): State {
  return {
    people: [],
    messages: [],
    plan: null,
    commitments: [],
    attendeeCount: 0,
    attendeeTarget: DEFAULT_ATTENDEE_TARGET,
    blocking: [],
    explanation: "",
    event: null,
    mock,
    asks: [],
    agentLog: [],
  };
}

let state: State = emptyState(process.env.MOCK_LLM === "true");
let broadcast: (s: State) => void = () => {};

export function onStateChange(fn: (s: State) => void) {
  broadcast = fn;
}

export function getState(): State {
  return state;
}

export function update(mutate: (s: State) => void = () => {}) {
  mutate(state);
  broadcast(state);
}

export function replaceState(next: State) {
  state = next;
  broadcast(state);
}

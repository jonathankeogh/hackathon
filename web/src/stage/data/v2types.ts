import type { Message, Person, State } from "@deadlock/shared/types";

/**
 * Stage-side v2 types. `Ask`, `asks` and `agentLog` now live in `shared/types.ts` and are
 * re-exported or read through `State`. `chatSource` is still local to the stage until it
 * lands in shared, so it stays optional here.
 */
export type { Ask } from "@deadlock/shared/types";

export type SourceV2 = "seed" | "phone" | "whatsapp";

export type PersonV2 = Omit<Person, "source"> & { source: SourceV2 };
export type MessageV2 = Message & { source?: SourceV2 };

export interface ChatSource {
  kind: "seed" | "whatsapp";
  /** For example "WHATSAPP, London Grok builders". */
  label: string;
}

export type StateV2 = State & {
  chatSource?: ChatSource;
};

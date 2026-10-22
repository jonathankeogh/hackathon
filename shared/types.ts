export type ResourceKey = string; // "venue" | "speaker" | "attendees" | "laptops" | ...

export interface Person { id: string; name: string; color: string; source: "seed" | "phone" | "whatsapp"; }
export interface Message { id: string; personId: string; text: string; ts: number; }
export interface Condition { resource: ResourceKey; minCount?: number; }
export interface Commitment {
  id: string; personId: string;
  offers: ResourceKey; requires: Condition[];
  quote: string; status: "waiting" | "unlocked";
}
export interface Plan { id: string; title: string; status: "none" | "blocked" | "viable" | "booked"; requiredForPlan: ResourceKey[]; }
export interface EventDetails {
  title: string; when: string; where: string; agenda: string[]; blurb: string;
  /** Practical extras read from the chat (travel, what to bring...) plus things to do nearby. */
  extras?: MeetExtras;
}

/** A practical clue for the meet, read from the chat or inferred from the plan. */
export type TipKind = "travel" | "meetingPoint" | "bring" | "wear" | "weather" | "activity";
export interface MeetTip {
  kind: TipKind;
  label: string;          // short line for the board, e.g. "Umbrella", "Northern line to Old Street"
  personId?: string;      // who said it; absent when inferred
  quote?: string;         // exact chat text it came from
}
export interface MeetExtras {
  area: string | null;    // e.g. "Shoreditch"
  tips: MeetTip[];
  nearby: string[];       // things to do in the area, before or after
}

/** The agent asking one person to loosen their condition. */
export interface Ask {
  id: string;
  personId: string;
  question: string;
  proposal: { commitmentId: string; requires: Condition[] };
  status: "open" | "accepted" | "declined";
}

export interface State {
  people: Person[];
  messages: Message[];
  plan: Plan | null;
  commitments: Commitment[];
  attendeeCount: number;
  attendeeTarget: number;          // e.g. 15
  blocking: Condition[];            // what's stuck right now
  explanation: string;              // Grok's "why it's stuck" sentence
  event: EventDetails | null;
  mock: boolean;
  asks: Ask[];
  agentLog: string[];               // short lines for the stage, newest last
}

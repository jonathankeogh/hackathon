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
export interface EventDetails { title: string; when: string; where: string; agenda: string[]; blurb: string; }

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
}

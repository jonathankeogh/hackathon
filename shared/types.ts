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
  weather?: WeatherInfo | null; // forecast for the venue at the event time
  routes?: TravelRoute[];       // best ways in from around London and nearby cities
  lines?: LineStatus[];         // TfL status of the lines those routes use
}

export interface LineStatus {
  id: string;             // TfL line id, e.g. "northern"
  name: string;           // "Northern"
  status: string;         // "Good Service", "Minor Delays"
  good: boolean;
}

/** A change worth telling everyone about: the forecast turned, a line went down. */
export interface Notice {
  id: string;
  kind: "weather" | "travel";
  text: string;
  ts: number;
}

export interface WeatherInfo {
  summary: string;        // e.g. "Light rain, 12°C, 60% chance of rain"
  tempC: number;
  rainChance: number | null;
  code: "clear" | "cloud" | "fog" | "drizzle" | "rain" | "snow" | "storm";
  source: "open-meteo" | "openweathermap" | "sample";
}

export interface TravelRoute {
  from: string;           // "North London", "Cambridge"
  group: "london" | "city";
  summary: string;        // "Victoria line to Highbury & Islington, then Overground to Hoxton"
  minutes: number | null;
  live: boolean;          // from TfL Journey Planner; false = offline estimate
}

/** The agent asking one person to loosen their condition. */
export interface Ask {
  id: string;
  personId: string;
  question: string;
  proposal: { commitmentId: string; requires: Condition[] };
  status: "open" | "accepted" | "declined";
}

/** One of the three plans the bot offers when enough people are on the same topic. */
export interface PlanOption {
  id: "live" | "venue" | "area";
  title: string;          // "Arsenal v Tottenham"
  detail: string;         // "Sat 24 Oct, 17:30, Premier League"
  plan: string;           // plan title if picked: "Watch Arsenal v Tottenham together"
  when?: string;
  where?: string;
  votes: string[];        // personIds
}

/** "You've been talking about X: want to do one of these?" */
export interface Suggestion {
  id: string;
  topic: string;          // "Premier League"
  people: string[];       // who's been talking about it
  area: string | null;
  options: PlanOption[];
  status: "open" | "picked" | "dismissed";
  picked?: PlanOption["id"];
}

/** Where the chat on stage comes from; the stage shows `label` as the chat heading. */
export interface ChatSource { kind: "seed" | "whatsapp"; label: string; }

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
  notices?: Notice[];               // weather/travel changes, newest last
  jobs?: { weather: boolean; travel: boolean }; // background refresh switches
  suggestion?: Suggestion | null;   // plan ideas offered before anyone said "we should"
  chatSource?: ChatSource;          // unset = the seeded chat
}

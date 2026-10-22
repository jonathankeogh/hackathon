import type { Ask, Commitment, EventDetails, Notice, State, Suggestion } from "@deadlock/shared/types";
import { colors } from "../design/tokens";
import { openSuggestion, selectScreen, type JoinModel, type Role } from "./model";

const noop = () => undefined;

const ME = { personId: "ph-1", name: "Ada" };
const SCRIPT =
  "Hi Ada, it is Deadlock. The workshop is booked for Thursday at six thirty in Shoreditch. Fifteen of you are coming, the laptops and the pizza are sorted, and your seat is held. Come a little early.";

const commitment = (id: string, personId: string, offers: string, requires: Commitment["requires"], status: Commitment["status"]): Commitment => ({
  id,
  personId,
  offers,
  requires,
  quote: "",
  status,
});

const EVENT: EventDetails = {
  title: "Hands-on Grok agents workshop",
  when: "THU 29 OCT 18:30",
  where: "Priya's office, Shoreditch, London",
  agenda: [],
  blurb: "",
  extras: {
    area: "Shoreditch",
    tips: [
      { kind: "travel", label: "Northern line to Old Street, exit 4" },
      { kind: "weather", label: "Forecast: Light rain, 12C, 60% chance of rain" },
      { kind: "bring", label: "Umbrella" },
      { kind: "bring", label: "Charger" },
    ],
    nearby: ["Pint at The Old Blue Last", "Brick Lane bagels"],
    routes: [
      { from: "North London", group: "london", summary: "Victoria line to Highbury and Islington, then Overground to Hoxton", minutes: 32, live: true },
      { from: "Cambridge", group: "city", summary: "Direct to Liverpool Street, then ten minutes on foot", minutes: 75, live: false },
    ],
    lines: [
      { id: "northern", name: "Northern", status: "Good service", good: true },
      { id: "victoria", name: "Victoria", status: "Minor delays", good: false },
    ],
  },
};

const NOTICE: Notice = { id: "n1", kind: "weather", ts: 0, text: "Weather update: rain is now likely at 18:30, bring a coat." };

function baseState(status: "blocked" | "viable" | "booked", withEvent: boolean): State {
  const booked = status === "booked";
  return {
    people: [
      { id: "p1", name: "Priya Nair", color: colors.text, source: "seed" },
      { id: "p2", name: "Sam Okafor", color: colors.text, source: "seed" },
      { id: ME.personId, name: ME.name, color: colors.text, source: "phone" },
    ],
    messages: [],
    plan: { id: "plan1", title: "Hands-on Grok agents workshop", status, requiredForPlan: ["attendees", "venue"] },
    commitments: [
      commitment("c1", "p1", "venue", [{ resource: "attendees", minCount: 15 }], booked ? "unlocked" : "waiting"),
      commitment("c2", "p2", "speaker", [{ resource: "venue" }], booked ? "unlocked" : "waiting"),
    ],
    attendeeCount: status === "blocked" ? 13 : 15,
    attendeeTarget: 15,
    blocking: status === "blocked" ? [{ resource: "attendees", minCount: 15 }] : [],
    explanation: "",
    event: withEvent ? EVENT : null,
    mock: true,
    asks: [],
    agentLog: [],
  };
}

const ASK: Ask = {
  id: "a1",
  personId: ME.personId,
  question: "Ada, would the venue work with 12 people instead of 15?",
  proposal: { commitmentId: "c1", requires: [{ resource: "attendees", minCount: 12 }] },
  status: "open",
};

const SUGGESTION: Suggestion = {
  id: "s1",
  topic: "Premier League",
  people: ["p1", "p2"],
  area: "Shoreditch",
  status: "open",
  options: [
    { id: "live", title: "Arsenal v Tottenham", detail: "Sat 24 Oct, 17:30, Emirates Stadium", plan: "Watch Arsenal v Tottenham together", votes: ["p1", "p2"] },
    { id: "venue", title: "Screening at The Old Blue Last", detail: "Sat 24 Oct, 17:30, big screen and a booth for ten", plan: "Watch the match at The Old Blue Last", votes: [ME.personId] },
    { id: "area", title: "Pub crawl round Shoreditch", detail: "Sat 24 Oct, from 16:00, four bars on one street", plan: "Shoreditch pub crawl", votes: [] },
  ],
};

type Key = "join" | "rsvp" | "waiting" | "notice" | "suggest" | "ask" | "clear" | "invite" | "call" | "connected";
const KEYS: readonly Key[] = ["join", "rsvp", "waiting", "notice", "suggest", "ask", "clear", "invite", "call", "connected"];

function model(key: Key): JoinModel {
  const blocked = baseState("blocked", false);
  const joined = { ...ME, role: undefined as Role | undefined };
  const base: JoinModel = {
    screen: "join",
    state: blocked,
    connected: true,
    me: null,
    ask: null,
    invite: null,
    call: null,
    joining: false,
    chatDenied: false,
    suggestion: null,
    join: noop,
    chooseRole: noop,
    answerAsk: noop,
    endCall: noop,
    sendChat: noop,
    voteSuggestion: noop,
  };
  const withScreen = (patch: Partial<JoinModel>): JoinModel => {
    const next = { ...base, ...patch };
    const screen = selectScreen({ call: next.call, me: next.me, ask: next.ask, invite: next.invite, state: next.state });
    return { ...next, screen, suggestion: openSuggestion(next.state) };
  };
  switch (key) {
    case "join":
      return withScreen({});
    case "rsvp":
      return withScreen({ me: joined });
    case "waiting":
      return withScreen({ me: { ...joined, role: "attend" } });
    case "notice":
      return withScreen({ me: { ...joined, role: "attend" }, state: { ...blocked, notices: [NOTICE] } });
    case "suggest":
      return withScreen({ me: { ...joined, role: "attend" }, state: { ...blocked, plan: null, blocking: [], suggestion: SUGGESTION } });
    case "ask":
      return withScreen({ me: { ...joined, role: "attend" }, ask: ASK });
    case "clear":
      return withScreen({ me: { ...joined, role: "attend" }, state: baseState("viable", false) });
    case "invite":
      return withScreen({
        me: { ...joined, role: "attend" },
        state: baseState("booked", true),
        invite: "Ada, you're in. Thursday, 18:30, Priya's office. Laptops and pizza are sorted, just bring yourself.",
      });
    case "call":
      return withScreen({ me: { ...joined, role: "attend" }, state: baseState("booked", true), call: SCRIPT });
    case "connected":
      return withScreen({ me: { ...joined, role: "attend" }, state: baseState("booked", true), call: SCRIPT, callPreview: { word: 14, seconds: 9 } });
  }
}

/**
 * Dev-only preview of every phone screen with no server: `?mock=join|rsvp|waiting|notice|suggest|ask|clear|invite|call|connected`.
 * Returns null in production builds and for any other query, so the real socket drives the page.
 */
export function readJoinMock(search: string, dev: boolean = import.meta.env.DEV): JoinModel | null {
  if (!dev) return null;
  const key = new URLSearchParams(search).get("mock");
  return KEYS.includes(key as Key) ? model(key as Key) : null;
}

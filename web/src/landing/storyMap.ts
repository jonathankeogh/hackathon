/**
 * The signal box story as a pure function of scroll progress p in [0, 1]. The pinned scene
 * calls storyAt(p) and draws whatever it returns; nothing else holds story state, so scrolling
 * back and forth always lands on the same picture.
 */
import { CHAT, NODE_IDS, type MessageId, type NodeId } from "./content";

export const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

/** Progress of p through the window [from, to], clamped to 0..1. */
export function seg(p: number, from: number, to: number): number {
  return to === from ? (p >= to ? 1 : 0) : clamp01((p - from) / (to - from));
}

/** Ease-out for counters and typing. A curve on a number, not a spring. */
export const easeOut = (t: number): number => 1 - (1 - t) * (1 - t);

export type BeatId = "chat" | "conditions" | "stall" | "ask" | "cascade" | "booked";

/** The six beats and where each starts. Used for the step rail. */
export const BEATS: readonly { id: BeatId; label: string; at: number }[] = [
  { id: "chat", label: "Chat", at: 0 },
  { id: "conditions", label: "Conditions", at: 0.06 },
  { id: "stall", label: "Stall", at: 0.34 },
  { id: "ask", label: "Ask", at: 0.62 },
  { id: "cascade", label: "Cascade", at: 0.8 },
  { id: "booked", label: "Booked", at: 0.95 },
];

/** When each thing starts, as a point on the scroll. Windows are 0.04 long unless noted. */
export const T = {
  message: { sam: 0.02, priya: 0.08, dev: 0.14, mia: 0.2, ask: 0.62, reply: 0.76, booked: 0.96 } satisfies Record<MessageId, number>,
  node: { plan: 0.06, venue: 0.12, speaker: 0.18, laptops: 0.24, attendees: 0.3 } satisfies Record<NodeId, number>,
  count: [0.34, 0.5] as const,
  stuck: [0.5, 0.6] as const,
  ask: [0.62, 0.72] as const,
  loosen: 0.78,
  green: { attendees: 0.8, venue: 0.84, speaker: 0.88, laptops: 0.9, plan: 0.93 } satisfies Record<NodeId, number>,
  booked: 0.95,
  train: [0.955, 0.995] as const,
  window: 0.04,
} as const;

export const COUNT_TARGET = 12;
export const ORIGINAL_MIN = 15;
export const LOOSENED_MIN = 12;
export const STUCK_SECONDS = 8;

export type Lamp = "red" | "amber" | "green";

export interface NodeStory {
  /** 0 hidden, 1 fully in. */
  appear: number;
  lamp: Lamp;
}

export interface ConnectorSpec {
  id: string;
  from: NodeId;
  to: NodeId;
}

/** The line: attendees to venue, venue to speaker and laptops, both to the plan. */
export const CONNECTORS: readonly ConnectorSpec[] = [
  { id: "attendees-venue", from: "attendees", to: "venue" },
  { id: "venue-speaker", from: "venue", to: "speaker" },
  { id: "venue-laptops", from: "venue", to: "laptops" },
  { id: "speaker-plan", from: "speaker", to: "plan" },
  { id: "laptops-plan", from: "laptops", to: "plan" },
];

export interface ConnectorStory {
  id: string;
  /** Idle rail visibility: 0 until both ends have appeared. */
  appear: number;
  /** Green power running along the rail, 0..1. */
  power: number;
}

export interface MessageStory {
  id: MessageId;
  /** 0 not sent, 1 fully in. */
  appear: number;
  /** The slice of text typed so far (agent messages type out; people's arrive whole). */
  text: string;
}

export interface Story {
  p: number;
  beat: BeatId;
  beatIndex: number;
  messages: MessageStory[];
  nodes: Record<NodeId, NodeStory>;
  connectors: ConnectorStory[];
  attendees: number;
  /** The threshold the venue is waiting on: 15, then 12 after Priya says yes. */
  venueMin: number;
  loosened: boolean;
  stuckSeconds: number;
  booked: boolean;
  /** Green power on the rail that leaves the plan signal, 0..1. */
  exit: number;
  /** How far the train has run out of the station, 0..1. */
  train: number;
  /** The tag over the venue signal: the bottleneck, then the question being asked. */
  callout: Callout | null;
}

export interface Callout {
  label: string;
  tone: "blocked" | "waiting";
}

/** The tag that points at the venue while the agent works on it. */
export function calloutAt(p: number): Callout | null {
  if (p >= T.stuck[0] && p < T.ask[0]) return { label: "BOTTLENECK", tone: "blocked" };
  if (p >= T.ask[0] && p < T.loosen) return { label: "ASKING PRIYA", tone: "waiting" };
  return null;
}

export function beatAt(p: number): { beat: BeatId; beatIndex: number } {
  let index = 0;
  BEATS.forEach((b, i) => {
    if (p >= b.at) index = i;
  });
  return { beat: BEATS[index]!.id, beatIndex: index };
}

function nodeLamp(id: NodeId, p: number): Lamp {
  if (p >= T.green[id]) return "green";
  if (id === "plan") return "red";
  if (id === "venue" && p >= T.stuck[0] && p < T.loosen) return "red";
  return "amber";
}

function typed(text: string, t: number): string {
  return text.slice(0, Math.round(text.length * t));
}

function messageStory(id: MessageId, text: string, p: number): MessageStory {
  const at = T.message[id];
  const appear = seg(p, at, at + T.window);
  if (id === "ask") return { id, appear, text: typed(text, easeOut(seg(p, T.ask[0], T.ask[1]))) };
  return { id, appear, text };
}

export function storyAt(input: number): Story {
  const p = clamp01(input);
  const nodes = {} as Record<NodeId, NodeStory>;
  for (const id of NODE_IDS) nodes[id] = { appear: seg(p, T.node[id], T.node[id] + T.window), lamp: nodeLamp(id, p) };
  const connectors = CONNECTORS.map((c) => ({
    id: c.id,
    appear: Math.min(nodes[c.from].appear, nodes[c.to].appear),
    power: seg(p, T.green[c.from], T.green[c.from] + T.window),
  }));
  const loosened = p >= T.loosen;
  return {
    p,
    ...beatAt(p),
    messages: CHAT.map((m) => messageStory(m.id, m.text, p)),
    nodes,
    connectors,
    attendees: Math.round(COUNT_TARGET * easeOut(seg(p, T.count[0], T.count[1]))),
    venueMin: loosened ? LOOSENED_MIN : ORIGINAL_MIN,
    loosened,
    stuckSeconds: Math.round(STUCK_SECONDS * seg(p, T.stuck[0], T.stuck[1])),
    booked: p >= T.booked,
    exit: seg(p, T.green.plan, T.green.plan + T.window),
    train: seg(p, T.train[0], T.train[1]),
    callout: calloutAt(p),
  };
}

/** The line of text in the agent strip for the current moment. */
export function agentLine(story: Story): { label: string; text: string } {
  const { p } = story;
  if (p >= T.booked) return { label: "Booked", text: "Plan booked. Event page up, invites sent." };
  if (p >= T.green.attendees) return { label: "Clearing", text: "The line is clearing, one link at a time." };
  if (p >= T.loosen) return { label: "Priya said yes", text: "Minimum moves from 15 to 12. The solver runs again." };
  if (p >= T.message.reply) return { label: "Priya", text: "yeah 12 is fine" };
  if (p >= T.ask[0]) return { label: "Asking Priya", text: "Would 12 work instead of 15?" };
  if (p >= T.stuck[0]) return { label: `Stuck ${story.stuckSeconds}s`, text: "Bottleneck: Priya's 15 person minimum." };
  if (p >= T.count[0]) return { label: "Audience joining", text: "Phones are joining. The count climbs, then stalls." };
  if (p >= T.node.plan) return { label: "Reading", text: "Turning each \"I will, if\" into a signal." };
  return { label: "Listening", text: "A group chat, a plan, and nobody moving." };
}

/**
 * Where the pinned section is in its scroll, 0..1. `top` and `height` are the outer section's
 * bounding rect, `stickTop` is the offset the inner panel sticks at (the nav height).
 */
export function scrollProgress(top: number, height: number, viewportHeight: number, stickTop: number): number {
  const pinned = viewportHeight - stickTop;
  const range = height - pinned;
  if (range <= 0) return 0;
  return clamp01((stickTop - top) / range);
}

/** Quantise so a scroll frame only re-renders when the picture could actually change. */
export function quantise(p: number, steps = 800): number {
  return Math.round(clamp01(p) * steps) / steps;
}

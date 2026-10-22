# DEADLOCK — shared contract (everyone reads this)

This file is the agreement between the four of us. Build against it and the parts plug together. If you need to change it, tell the team first, and Person 1 updates this file.

## Repo layout
```
deadlock/
  CLAUDE.md          full spec (read sections 1, 2, 8)
  CONTRACT.md        this file
  shared/types.ts    the types below, imported by server and web
  server/src/
    index.ts         Express + Socket.IO            (Person 1)
    state.ts         in-memory store                (Person 1)
    solver.ts        deterministic solver + tests   (Person 1)
    llm/             Grok calls, prompts, mocks     (Person 2)
    seed.ts          seeded chat + people           (Person 2)
  web/src/
    stage/           projector view /stage          (Person 3)
    join/            phone view /join               (Person 4)
    admin/           control panel /admin           (Person 1)
    fixtures/        fake State snapshots for UI dev (Person 3 makes, all use)
```
Git: one repo, `main` is always runnable. Everyone works on their own branch and only touches their own folders. Merge small and often.

## Types (`shared/types.ts`)
```ts
export type ResourceKey = string; // "venue" | "speaker" | "attendees" | "laptops" | ...

export interface Person { id: string; name: string; color: string; source: "seed" | "phone"; }
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
```

## Socket events
Server → all clients
- `state` (State): full snapshot, sent on every change. UIs just render it.
- `explain:chunk` ({ text }): streamed words of the explanation.
- `cascade` ({ order: string[] }): commitment ids in unlock order, so the stage can animate them 400ms apart.
- `booked` (EventDetails): the plan is booked.

Server → one phone
- `invite` ({ text }): personal invite. The phone buzzes and shows it.
- `call` ({ script }): full-screen incoming call. Text-to-speech reads the script.

Client → server
- `join` ({ name }) → replies `joined` ({ personId })
- `rsvp` ({ personId, role: "attend" | "laptop" | "help" })
- `chat:send` ({ personId, text }), used by admin/presenter
- `admin:reset`, `admin:seed`, `admin:step` ({ step: "detect" | "extract" | "explain" | "cascade" | "book" | "call" }), `admin:mock` ({ on }), `admin:callTarget` ({ personId }), `admin:simulateJoins` ({ count })

## Design tokens (Person 3 owns, Person 4 uses)
- Background #0E0E0C, text #EDEAE2, divider #2A2925
- Signal red #FF3B30 (blocked), amber #FFB000 (waiting), green #3DDC84 (unlocked)
- Fonts: IBM Plex Mono (data/labels), IBM Plex Sans (body)
- Banned: gradients, glassmorphism, emoji, sparkle icons, "AI ✨" copy

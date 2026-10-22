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
## Current flow (22 Oct evening): read this first
This supersedes the `/new` group picker and makes the audience join optional. Full picture in `ARCHITECTURE.txt`.

1. **Sign up** at `/`: press Sign up, scan the WhatsApp QR, see "Sign up complete!". Every sign-up is a fresh session (the bridge unlinks the old account and wipes its store).
2. **@deadlock** in any group chat of that account starts a plan on that chat. Only fresh messages (under 2 minutes old) trigger.
3. Grok reads the messages around the tag. Commitments come from the chat, **including attendance**: "I'll come if someone hosts" means that person offers `attendees` and requires `venue`. There is no join page in the loop.
4. The solver decides. If stuck, the bot posts into the chat (`🤖 *Deadlock bot*` header): why it's stuck, plus the public `/stage` link. After 10s stuck, the agent asks the bottleneck person in the chat to loosen one condition, and a "yes" in the chat applies it.
5. Viable: the stage cascades, Grok writes the event, and the bot posts "It's on!" into the chat.

What's in code now (`shared/types.ts`): `Ask`, `State.asks`, `State.agentLog`, `State.chatSource` (`{ kind, label }`, the stage's chat heading), and `"whatsapp"` on `Person.source`.
Socket events added: `ask:answer` ({ askId, accept, personId }), `admin:answer` ({ accept }), `admin:step "negotiate"`, `wa:watch`, `wa:new` (sign up), `wa:status`, and `wa:pickGroup` (kept, but no UI uses it).
Bridge endpoints (127.0.0.1 only): `/api/status`, `/api/names?chat=`, `/api/send`, `/api/reset`, `/api/logout`, `/api/groups`.

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
- `join` ({ name, personId? }) → replies `joined` ({ personId }). A phone that reconnects sends its saved personId and is reattached, not double counted. If the id is unknown (after an admin reset) a new person is created.
- `rsvp` ({ personId, role: "attend" | "laptop" | "help" })
- `chat:send` ({ personId, text }), used by admin/presenter
- `admin:reset`, `admin:seed`, `admin:step` ({ step: "detect" | "extract" | "explain" | "cascade" | "book" | "call" }), `admin:mock` ({ on }), `admin:callTarget` ({ personId }), `admin:simulateJoins` ({ count })

## Design tokens (Person 3 owns, Person 4 uses)
- Background #0E0E0C, text #EDEAE2, divider #2A2925
- Signal red #FF3B30 (blocked), amber #FFB000 (waiting), green #3DDC84 (unlocked)
- Fonts: IBM Plex Mono (data/labels), IBM Plex Sans (body)
- Banned: gradients, glassmorphism, emoji, sparkle icons, "AI ✨" copy

## v2 additions: negotiator agent + WhatsApp (agreed 22 Oct)
Everything above still holds. These are additive: old clients keep working.

**The idea.** The chat comes from a real WhatsApp group (seeded chat stays as the offline fallback). Grok reads each new message as it arrives and returns only what changed. When the plan is stuck, a Grok agent picks the bottleneck person and *asks them* to relax their condition ("would 12 people work instead of 15?"). If they say yes, code changes the condition and the solver re-runs. Grok proposes and talks; code decides.

### Types (add to `shared/types.ts`)
```ts
// Person.source and Message gain "whatsapp"
export interface Person { id: string; name: string; color: string; source: "seed" | "phone" | "whatsapp"; }
export interface Message { id: string; personId: string; text: string; ts: number; source?: "seed" | "phone" | "whatsapp"; }

export interface Ask {
  id: string;
  personId: string;                 // who the agent is asking
  question: string;                 // Grok-written, one sentence
  proposal: { commitmentId: string; requires: Condition[] }; // what changes if they say yes
  status: "open" | "accepted" | "declined";
}

// State gains:
//   asks: Ask[];
//   agentLog: string[];             // short lines for the stage, e.g. "Asking Priya if 12 people is enough"
//   chatSource: { kind: "seed" | "whatsapp"; label: string };  // e.g. "WHATSAPP · London Grok builders"
```

### LLM functions (`server/src/llm/index.ts`, Person 2)
The three existing functions stay. Two are added:
```ts
// Incremental: one new message + current state → what changed. Faster than re-reading the chat.
extractDelta(message: Message, state: State): Promise<{
  plan?: Plan;                       // only when this message creates the plan
  upserts: Commitment[];             // new or changed commitments, each with exact quote
  removes: string[];                 // commitment ids withdrawn ("actually I can't host")
  askReply?: { askId: string; accept: boolean }; // message answers an open Ask
}>
// Agent step: run when the plan has been blocked for NEGOTIATE_AFTER_MS with no progress.
negotiate(state: State): Promise<{ action: "ask"; ask: Omit<Ask, "id" | "status"> } | { action: "wait"; reason: string }>
```
`negotiate` only sees the solver's `blocking` output and may only propose loosening an existing condition of an existing commitment. The server rejects any proposal that doesn't match a real commitment id.

### WhatsApp source (`server/src/sources/whatsapp.ts`, Person 2)
Uses the local `whatsapp-mcp` Go bridge (linked-device login, runs on the stage laptop, API bound to 127.0.0.1 only).
```ts
startWhatsApp(onMessage: (m: Message, sender: { jid: string; name: string }) => void): () => void // polls bridge SQLite ~1s
sendWhatsApp(personId: string, text: string): Promise<boolean>  // via bridge POST /api/send
```
Env: `CHAT_SOURCE=seed|whatsapp`, `WHATSAPP_CHAT_JID=` (the group), `WHATSAPP_DB=` (path to bridge `store/messages.db`), `WHATSAPP_API=http://127.0.0.1:8080`, `NEGOTIATE_AFTER_MS=8000`.
If the bridge is down or `CHAT_SOURCE=seed`, the demo runs on the seeded chat exactly as before.

### Socket events (new)
Server → one phone
- `ask` (Ask): the agent asks this phone person. Phone shows a yes/no card.

Client → server
- `ask:answer` ({ askId, accept })
- `chat:send` ({ personId, text }) may now also come from phones (audience can post to the chat).
- `admin:step` gains `"negotiate"`; `admin:answer` ({ askId, accept }) forces a reply; `admin:source` ({ kind: "seed" | "whatsapp" }).

Asks to WhatsApp people go out as a WhatsApp message; their reply comes back as a normal message and `extractDelta` returns `askReply`.

### New event + WhatsApp link (`/new`): SUPERSEDED, see "Current flow" at the top
A frontend page that sets up the demo from scratch, no terminal:
1. `/new` → **New event** button → server creates the event and asks the bridge for a link QR.
2. Page shows the WhatsApp **link QR** (the same one WhatsApp → Linked devices → Link a device scans). Refreshes every ~20s until scanned.
3. Once linked, the page lists the account's WhatsApp groups → pick one → the event is bound to that group, `chatSource.label` is set, and the page links to `/stage`.
One active event at a time (in-memory); "New event" replaces the current one (`admin:reset` semantics).

Bridge additions (Person 2, Go patch in `whatsapp-bridge/main.go`, all on 127.0.0.1):
- `GET /api/status` → `{ status: "qr" | "connected" | "disconnected", qr?: string }` (`qr` is the raw pairing code string; the page renders it with `qrcode.react`)
- `GET /api/groups` → `[{ jid, name, lastMessageTime }]`
- `POST /api/logout` → unlink, so the next "New event" shows a fresh QR

Server (Person 1):
- `POST /api/events` → `{ eventId }`, resets state
- Server → `/new` page: `wa:status` ({ status, qr?, groups? }), pushed whenever it changes (server polls the bridge ~1s while `/new` is open)
- Client → server: `wa:pickGroup` ({ jid, name }) → sets the WhatsApp source to that group and switches `chatSource` to whatsapp; `wa:logout`

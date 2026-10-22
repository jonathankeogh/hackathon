# Person 1 — Core server, solver & admin (team lead)

**Your job:** the backbone. Everyone else plugs into what you build, so ship the skeleton first and fast.

**Read first:** CLAUDE.md (sections 1, 2, 5, 7, 9) and CONTRACT.md.

## Do first (within 30–40 minutes)
1. Create the repo with the layout in CONTRACT.md: npm workspaces, TypeScript, Vite + React + Tailwind in `web/`, and Express + Socket.IO in `server/`.
2. Write `shared/types.ts` exactly as in CONTRACT.md.
3. Get one command (`npm run dev`) running the server on :3000 and the web app with routes `/stage`, `/join` and `/admin` (empty placeholders are fine).
4. Push to `main` and tell the team: "skeleton is up, branch off now."

## Then build
- **state.ts:** an in-memory store holding a `State`. Broadcast `state` to everyone on every change.
- **Socket handlers** for every client → server event in the contract. `join` creates a Person (random colour from a fixed list of 6 muted tones) and replies `joined`. Phones that reconnect with a saved personId (localStorage on their side) get reattached, not duplicated.
- **solver.ts:** a deterministic fixed-point solver (CLAUDE.md section 7). Input: commitments + attendeeCount. Output: which commitments unlocked, in what order, whether the plan is viable, and the `blocking` conditions. Write unit tests with vitest for 4–5 small graphs, including a chain of 3 and a case that never unlocks.
- **Wiring the flow:** when a chat message arrives, call Person 2's `detectAndExtract()`. When the plan exists, run the solver on every join/rsvp. When it turns viable, emit `cascade` with the order, then call Person 2's `book()` and emit `booked`, an `invite` to each joined phone, and `call` to the chosen phone.
- **/admin page:** plain and functional, no styling needed. Buttons for reset, seed, every `admin:step`, a mock toggle, "simulate 20 joins", a dropdown to pick the call target, and a text box to send a chat message as any person.
- **Serve the built web app** from Express in production (`npm run build && npm start`) so the demo is one process.

## Until Person 2 is ready
Stub `server/src/llm/index.ts` with functions that return hard-coded JSON matching the contract, so the flow runs end to end. Person 2 replaces the internals later; keep the function signatures:
```ts
detectAndExtract(messages: Message[], people: Person[]): Promise<{ plan: Plan | null; commitments: Commitment[] }>
explain(state: State, onChunk: (t: string) => void): Promise<string>
book(state: State): Promise<{ event: EventDetails; invites: Record<string, string>; callScript: string }>
```

## Done when
- [ ] 3 browsers (stage, phone, admin) stay in sync live
- [ ] the full demo runs end to end on stubs/mocks with no internet
- [ ] solver tests pass
- [ ] every demo step can be forced from /admin
- [ ] merged to `main` at least every hour

## Prompt for Claude Code
> Read CLAUDE.md, CONTRACT.md and TASK-1-core-server.md. I'm Person 1. Do the "Do first" section only, run it, fix errors, commit, then stop and tell me how to check it works.

## v2 additions (agent + WhatsApp, see CONTRACT.md "v2 additions")
- **Types + state:** add `Ask`, `asks`, `agentLog`, `chatSource`, and the `"whatsapp"` source to `shared/types.ts` and `emptyState()`.
- **Incremental flow:** on every new message (WhatsApp, phone or admin), call `extractDelta()` instead of re-running `detectAndExtract()` on the whole chat. Apply `upserts`/`removes`, re-run the solver, broadcast. Keep `detectAndExtract()` for `admin:step extract` and re-seed.
- **Negotiation loop:** when the plan is blocked and nothing has changed for `NEGOTIATE_AFTER_MS`, call `negotiate()`. Validate that the proposal targets a real commitment and only loosens it. Store the `Ask`, then send it: `ask` socket event to a phone person, or `sendWhatsApp()` for a WhatsApp person. On `ask:answer` or an `askReply` from `extractDelta`, apply the proposal on yes, mark declined on no, re-solve. One open ask at a time.
- **Sources:** if `CHAT_SOURCE=whatsapp`, call Person 2's `startWhatsApp()` on boot. Map each WhatsApp sender to a `Person` (source `"whatsapp"`) by jid. If the bridge fails, log it and fall back to seed.
- **Admin:** buttons for `negotiate`, accept/decline the open ask, and a seed/WhatsApp source toggle. Phones can now `chat:send`.
- **Tests:** a flow test where the plan stalls at 12/15, `negotiate` proposes 12, the answer is yes, and the cascade fires.
- **`/new` flow (server side):** `POST /api/events`, then relay the bridge's `/api/status` and `/api/groups` to the page as `wa:status`. Handle `wa:pickGroup` (bind the source to that jid and start `startWhatsApp`) and `wa:logout`. See CONTRACT.md "New event + WhatsApp link".

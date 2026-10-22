# DEADLOCK

> Every group chat has a "we should…" that dies. Deadlock makes it happen.

Built at the Grok Bot Community Engineering London Hackathon, 22 Oct 2026.

## What it is
Someone in a community chat says "we should run a workshop". People reply with conditions: "I'll teach it if we get a venue", "I can host if 15 people come". Nothing happens because everyone is waiting on someone else.

Deadlock uses Grok to read the chat, extract every conditional commitment, and work out the single thing blocking the plan. The audience joins from their phones, the conditions unlock one after another like railway signals turning green, and the bot books the event: it writes the event page, sends invites that buzz people's phones, and calls whoever hasn't replied.

## How it works
| Layer | Does what |
|---|---|
| Grok (xAI API) | Reads messy chat. Detects the plan, extracts commitments and their conditions, explains what's blocking it, writes the event, invites and call script. |
| Solver (code) | Deterministic. Works out what unlocks what, in which order, and whether the plan is viable. Grok never decides the logic. |
| Server | Node + Express + Socket.IO, in-memory state, broadcasts a full snapshot on every change. |
| /stage | Projector view: chat, signal-box track diagram, departures board, live counter, QR. |
| /join | Phone view: join, RSVP, invite, incoming call with text-to-speech. |
| /admin | Presenter controls: reset, force any step, mock mode, simulate joins. |

## Stack
TypeScript everywhere · Vite + React + Tailwind + Framer Motion · Express + Socket.IO · `openai` SDK pointed at `https://api.x.ai/v1` · zod · vitest · qrcode.react · browser speechSynthesis · cloudflared tunnel.

## Run
```bash
cp .env.example .env   # add XAI_API_KEY and GROK_MODEL, or set MOCK_LLM=true
npm install
npm run dev            # dev: server :3000 + web on http://localhost:5173 (/stage, /join, /admin)
npm run build && npm start   # demo: one process
cloudflared tunnel --url http://localhost:3000   # public URL for phones → put in JOIN_URL
```
Open `/stage` on the projector, `/admin` on the presenter's phone, and let the audience scan the QR.

`npm start` serves everything on one port (default 3000): the web app, `/api`, and the socket. It prints LAN URLs as a same-Wi-Fi fallback for phones.

Set `ADMIN_KEY` in `.env` before going on stage so the audience can't drive the demo from `/admin`. Open `/admin?key=<ADMIN_KEY>` once on the presenter's phone; it's remembered after that. Every demo step can be forced from `/admin` if something fails live.

## Team
| Person | Area | Label |
|---|---|---|
| 1 | Core server, solver, admin, repo (lead) | `area:core` |
| 2 | Grok brain: prompts, extraction, seed chat, mocks | `area:grok` |
| 3 | Stage screen: design, track diagram, animations | `area:stage` |
| 4 | Phone view + hosting, rehearsal, pitch | `area:phone-demo` |

See `CONTRACT.md` for shared types and socket events, and `CLAUDE.md` for the full build spec. All tasks are GitHub issues; run `./create-issues.sh` once to create them.

## Task list
Must-have unless marked (nice).

**Core (Person 1)**
- [ ] #1 Repo skeleton (blocks everyone)
- [ ] #2 Shared types
- [ ] #3 State store + broadcast
- [ ] #4 Socket handlers: join, RSVP, reconnect
- [ ] #5 Solver + tests
- [ ] #6 Demo flow orchestration
- [ ] #7 Admin panel
- [ ] #8 Production build, single process

**Grok (Person 2)**
- [ ] #9 xAI client wrapper with timeout, retry, mock fallback
- [ ] #10 Seeded community chat
- [ ] #11 detectAndExtract
- [ ] #12 explain (streamed)
- [ ] #13 book
- [ ] #14 Mocks + llm:test script

**Stage (Person 3)**
- [ ] #15 UI fixtures + dev toggle
- [ ] #16 Stage layout + chat panel
- [ ] #17 Track diagram (SVG)
- [ ] #18 Cascade animation
- [ ] #19 Split-flap departures board
- [ ] #20 Explanation panel, odometer counter, QR
- [ ] #21 Sound toggle (nice)

**Phone + demo (Person 4)**
- [ ] #22 Join + RSVP screens
- [ ] #23 Invite buzz card
- [ ] #24 Incoming call + text-to-speech
- [ ] #25 Hosting: tunnel + fallbacks
- [ ] #26 Run sheet + pitch
- [ ] #27 Rehearsals, backup recording, pre-flight

**Everyone**
- [ ] #28 Integration checkpoint: full run on main

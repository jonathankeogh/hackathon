#!/usr/bin/env bash
# Creates all Deadlock labels and issues in the current GitHub repo.
# Needs the GitHub CLI: https://cli.github.com  →  gh auth login
# Run from inside the repo:  chmod +x create-issues.sh && ./create-issues.sh
set -euo pipefail

label() { gh label create "$1" --color "$2" --description "$3" --force >/dev/null; }
label "area:core"        "3DDC84" "Person 1 — server, solver, admin"
label "area:grok"        "FFB000" "Person 2 — Grok prompts, extraction, mocks"
label "area:stage"       "FF3B30" "Person 3 — projector view"
label "area:phone-demo"  "8AB4F8" "Person 4 — phone view, hosting, pitch"
label "must"             "000000" "Needed for the demo"
label "nice"             "BBBBBB" "Only if time allows"
label "blocker"          "B60205" "Others are waiting on this"

issue() { # title, labels, body (stdin)
  gh issue create --title "$1" --label "$2" --body-file - >/dev/null
  echo "created: $1"
}

# ───────────────────────── Person 1 — core ─────────────────────────
issue "[core] Repo skeleton" "area:core,must,blocker" <<'EOF'
Set up the monorepo so everyone can branch off.

- npm workspaces: `server/`, `web/`, `shared/`
- TypeScript in all three
- `web`: Vite + React + Tailwind + Framer Motion, React Router with `/stage`, `/join`, `/admin` placeholders
- `server`: Express + Socket.IO on :3000
- `npm run dev` runs both; `.env.example` with `XAI_API_KEY`, `GROK_MODEL`, `MOCK_LLM`, `PORT`, `JOIN_URL`
- `.gitignore` includes `.env`

**Done when:** a fresh clone runs with `npm install && npm run dev` and all three routes load. Push to `main` and tell the team.
EOF

issue "[core] Shared types" "area:core,must,blocker" <<'EOF'
Create `shared/types.ts` exactly as in `CONTRACT.md` (Person, Message, Condition, Commitment, Plan, EventDetails, State) and import it from both server and web.

**Done when:** both workspaces compile importing these types.
EOF

issue "[core] State store + broadcast" "area:core,must" <<'EOF'
`server/src/state.ts`: in-memory `State`, with helpers to mutate it. After every change, emit `state` (full snapshot) to all sockets.

**Done when:** opening /stage in two tabs shows the same state, updating live.
EOF

issue "[core] Socket handlers: join, RSVP, reconnect" "area:core,must" <<'EOF'
Implement every client → server event in `CONTRACT.md`.

- `join {name}` → create Person (colour from a fixed list of 6 muted tones), reply `joined {personId}`
- `rsvp {personId, role}` → update attendee count
- Reconnect: a phone sending a saved personId is reattached, not duplicated
- `chat:send`, all `admin:*` events

**Done when:** joining from 3 phones updates the count on /stage; refreshing a phone doesn't double-count.
EOF

issue "[core] Solver + tests" "area:core,must" <<'EOF'
`server/src/solver.ts`, deterministic, no LLM.

Input: commitments, attendeeCount, requiredForPlan.
Output: unlock order (commitment ids), available resources, `blocking` conditions, plan viable yes/no.

Fixed-point loop: a commitment unlocks when all its conditions are met; its `offers` resource then becomes available. `attendees` with `minCount` compares against attendeeCount.

vitest tests: single commitment, chain of 3, two independent branches, one that never unlocks, threshold exactly met.

**Done when:** `npm test` passes.
EOF

issue "[core] Demo flow orchestration" "area:core,must" <<'EOF'
Wire the full flow on the server:

1. New chat message → `detectAndExtract()` → set plan + commitments → status `blocked`
2. Run solver → set `blocking` → `explain()` streaming `explain:chunk`
3. On every join/rsvp → re-run solver
4. Plan turns viable → emit `cascade {order}` → wait for the animation (~order.length × 400ms) → `book()` → emit `booked`, `invite` to each joined phone, `call` to the chosen call target

Use stubbed LLM functions until #11–#13 land (signatures in TASK-1).

**Done when:** the whole demo runs end to end on stubs with wifi off.
EOF

issue "[core] Admin panel" "area:core,must" <<'EOF'
`/admin`, functional and unstyled is fine. Must work on a phone.

Buttons: reset, re-seed, force each step (detect, extract, explain, cascade, book, call), mock mode toggle, simulate 20 joins, call-target dropdown, send a chat message as any person.

**Done when:** every demo step can be triggered by hand if something fails live.
EOF

issue "[core] Production build, single process" "area:core,must" <<'EOF'
`npm run build && npm start` builds the web app and serves it from Express alongside Socket.IO on one port.

**Done when:** the demo runs from one command and works through the cloudflared tunnel.
EOF

# ───────────────────────── Person 2 — Grok ─────────────────────────
issue "[grok] xAI client wrapper" "area:grok,must,blocker" <<'EOF'
Get an API key (organisers' credits or console.x.ai). Pick a fast model.

`server/src/llm/client.ts`: `openai` SDK with `baseURL: "https://api.x.ai/v1"`, key and model from env. `callGrok()` with an 8s timeout, one retry on invalid JSON, and fallback to the matching mock when it fails or `MOCK_LLM=true`.

**Done when:** a hello-world call returns in under 4s and mock mode works with wifi off.
EOF

issue "[grok] Seeded community chat" "area:grok,must" <<'EOF'
`server/src/seed.ts`: 6 London tech-community people (first names) and 8–12 casual messages.

Must include a chain of 3 conditions, e.g.
- Sam: "I'd happily teach it if someone sorts a room"
- Priya: "our office near Old Street works if we get 15+ people"
- Leo: "I'll bring pizza if Priya's office is confirmed"

Plus some noise (memes, Northern line complaints). Presenter's live line: "we should run a hands-on Grok agents workshop next week".

**Done when:** it reads like a real chat, not a test fixture.
EOF

issue "[grok] detectAndExtract" "area:grok,must" <<'EOF'
`detectAndExtract(messages, people)` → `{ plan, commitments }` matching CONTRACT types.

- Detect the "we should" intent → plan title + `requiredForPlan`
- Extract every conditional commitment with `offers`, `requires`, and the exact `quote`
- JSON output, validated with zod

**Done when:** all 3 chained commitments come out right 5 runs out of 5.
EOF

issue "[grok] explain (streamed)" "area:grok,must" <<'EOF'
`explain(state, onChunk)` → 1–2 plain sentences on what's blocking the plan, based on the solver's `blocking` output (Grok phrases it, it doesn't invent the logic). Stream tokens through `onChunk`.

Example: "Everything hinges on attendance: 3 more people unlocks Priya's office, which unlocks Sam's talk."

**Done when:** it streams in under 3s and sounds human.
EOF

issue "[grok] book" "area:grok,must" <<'EOF'
`book(state)` → `{ event, invites, callScript }`

- event: title, when, where, 4-item agenda, 1-line blurb
- invites: one short personal line per joined person, using their name
- callScript: 2 friendly, slightly funny sentences read aloud on the call

No emoji, no marketing tone.

**Done when:** output validates with zod and reads well aloud.
EOF

issue "[grok] Mocks + llm:test script" "area:grok,must" <<'EOF'
Run each function live once against the seed, save to `server/src/llm/mocks/*.json`.

`npm run llm:test` runs all three against the seed and prints output + timings, both live and with `MOCK_LLM=true`.

**Done when:** both modes pass, and Person 1's stubs are replaced on `main`.
EOF

# ───────────────────────── Person 3 — stage ─────────────────────────
issue "[stage] UI fixtures + dev toggle" "area:stage,must,blocker" <<'EOF'
`web/src/fixtures/`: 4 fake `State` snapshots (no plan / blocked / half unlocked / booked) and a dev-only key toggle to cycle through them. Lets stage and phone UI be built before the server is ready.

**Done when:** Person 4 can import them too.
EOF

issue "[stage] Stage layout + chat panel" "area:stage,must" <<'EOF'
`/stage` at 1920×1080. Chat left 30%, track diagram centre 45%, right column 25% (explanation, counter, QR). 1px dividers (#2A2925), big negative space.

Design tokens from CONTRACT.md only: bg #0E0E0C, text #EDEAE2, red/amber/green signals, IBM Plex Mono + Plex Sans. No gradients, glass, emoji, sparkles, pill cards, heavy shadows.

Chat: messages appear one by one, name in mono caps in the person's colour; extracted messages get a thin amber left rule.

**Done when:** all 4 fixtures look intentional and calm.
EOF

issue "[stage] Track diagram (SVG)" "area:stage,must" <<'EOF'
Hand-built SVG, no graph library. Railway signal-box style.

Horizontal track lines; each commitment is a signal lamp with a soft glow, the person's name beside it and their quote underneath in small mono. Lines run from conditions to what they unlock, ending at a final PLAN signal. Red = blocked, amber = waiting, green = unlocked.

**Done when:** a 3-link chain plus the attendee condition reads clearly from the back of a room.
EOF

issue "[stage] Cascade animation" "area:stage,must" <<'EOF'
On `cascade {order}`: lamps turn green in order, 400ms apart, each with a lamp-switch flash and a 1.05 "clunk" scale. Mechanical, not bouncy. Then the PLAN lamp goes green and the whole track briefly brightens.

**Done when:** it's the moment the team says "oh".
EOF

issue "[stage] Split-flap departures board" "area:stage,must" <<'EOF'
Reusable split-flap component: each character flips through a few glyphs before settling.

Shows plan title + status (BLOCKED → VIABLE → BOOKED) and, after booking, event when/where/agenda.

**Done when:** status changes look like a real departures board.
EOF

issue "[stage] Explanation panel, odometer counter, QR" "area:stage,must" <<'EOF'
- "Why it's stuck": streams `explain:chunk` word by word, large calm type
- Attendee counter "12 / 15" with odometer-style rolling digits
- Join QR (`qrcode.react`) from `JOIN_URL`, short URL printed below in mono

**Done when:** all three react live to the server.
EOF

issue "[stage] Sound toggle" "area:stage,nice" <<'EOF'
Optional: soft relay click per unlock, one chime when viable. Small local audio files, off by default, toggle on /admin.
EOF

# ───────────────────────── Person 4 — phone + demo ─────────────────────────
issue "[phone] Join + RSVP screens" "area:phone-demo,must" <<'EOF'
`/join`, mobile-first, same design tokens.

- Join: DEADLOCK wordmark, one sentence, first-name input, one huge button. Save personId in localStorage.
- RSVP: three big choices (coming / bringing a laptop / can help) → `rsvp`. Confirmation with live progress, e.g. "you're #13, 2 more unlocks the venue".
- Small signal lamp at the top mirroring plan status.

**Done when:** a stranger joins from the QR in under 10 seconds on iPhone and Android.
EOF

issue "[phone] Invite buzz card" "area:phone-demo,must" <<'EOF'
On `invite`: `navigator.vibrate([80, 40, 80])` and a ticket-style card slides up with the personal invite and event details.

**Done when:** it buzzes on Android and shows correctly on iPhone (iOS ignores vibrate; that's fine).
EOF

issue "[phone] Incoming call + text-to-speech" "area:phone-demo,must" <<'EOF'
On `call {script}`: full-screen incoming call that looks real (caller DEADLOCK, pulsing ring, accept/decline). Accept → `speechSynthesis` reads the script, words highlight as spoken. The accept tap unlocks audio on iOS.

**Done when:** it works on a real iPhone and a real Android, loud enough for a room.
EOF

issue "[demo] Hosting: tunnel + fallbacks" "area:phone-demo,must" <<'EOF'
- `cloudflared tunnel --url http://localhost:3000` → `JOIN_URL`
- Fallback: laptop LAN IP on the same wifi
- Plan C: phone hotspot
- Test with 5+ phones at once on the venue network

**Done when:** all three routes are tested.
EOF

issue "[demo] Run sheet + pitch" "area:phone-demo,must" <<'EOF'
3-minute script with exact lines and who clicks what (stage laptop, admin phone).

- Open: "every group chat has a 'we should' that dies"
- Show: seeded chat → live "we should" → blocked → audience joins → cascade → booked → call
- Be explicit: Grok reads messy chat and extracts the conditions; code does the logic
- Close: "we turn 'we should' into it actually happening"

**Done when:** written and timed under 3 minutes.
EOF

issue "[demo] Rehearsals, backup recording, pre-flight" "area:phone-demo,must" <<'EOF'
- 2+ full rehearsals on `main` once everything is merged; fix what breaks
- Screen-record one perfect run (stage + a phone), keep it on the desktop
- Pre-flight: laptop charged, zoom 100%, notifications off, mock mode ready, stage fullscreen, admin on presenter's phone, call target picked

**Done when:** backup video exists and the checklist is done.
EOF

# ───────────────────────── Everyone ─────────────────────────
issue "[all] Integration checkpoint: full run on main" "must" <<'EOF'
All branches merged. Run the full demo on `main` with live Grok, then again with `MOCK_LLM=true` and wifi off.

**Done when:** both runs work end to end without touching the code.
EOF

echo "All done."

# DEADLOCK — build spec (Grok Bot Community Engineering Hackathon, London)

You are building a hackathon demo that must work flawlessly live on stage. Reliability beats features. Build phase by phase, stop at the end of each phase, run it, fix it, commit, then continue only when asked.

## 1. The product in one line
A community chat says "we should run a workshop", and people reply with conditions like "I'll teach it if we get a venue" or "I can host if 15 people come". Nothing happens because everyone is waiting on someone else. DEADLOCK reads the chat with Grok, extracts every conditional commitment, works out what is blocking the plan, and shows it. Someone in the audience fills the missing piece from their phone, the plan cascades from blocked to viable, and the bot books it: it generates the event page, invites people, and "calls" whoever hasn't replied.

## 2. Demo script (build everything to serve this, ~3 minutes)
1. Stage screen shows a seeded community chat (8–12 realistic messages, London tech community).
2. Presenter types live: "we should run a hands-on Grok agents workshop next week".
3. Grok detects intent → creates the Plan. Plan appears as BLOCKED.
4. Seeded replies already contain conditions. Grok extracts them. The dependency view animates in, showing who offers what and what each person needs.
5. A "Why it's stuck" panel shows Grok's short reasoning: the single missing piece that would unlock everything (e.g. "needs 3 more confirmed attendees; that unlocks the venue, which unlocks the speaker").
6. Presenter: "scan the QR". Audience joins on phones at /join, enter first name, tap "I'm in" or pick a role (attendee / bring laptop / can help).
7. Counter climbs live. When the threshold hits, the chain cascades green one link at a time (attendees → venue → speaker → PLAN VIABLE). This is the wow moment; make it feel like a mechanism clicking into place.
8. WeShould finish: event page generates (title, time, place, agenda written by Grok), invites go out to joined phones (phones buzz/vibrate and show the invite), and one chosen phone gets a full-screen "incoming call" from the bot that reads a Grok-written message aloud.

## 3. Stack (all free, no paid services required)
- Monorepo, npm workspaces: `server/` and `web/`.
- Server: Node 20, TypeScript, Express, Socket.IO. In-memory state only (no database). One process serves the built web app and the socket.
- Web: Vite + React + TypeScript, Tailwind CSS, Framer Motion for animation. `qrcode.react` for the join QR.
- LLM: the official `openai` npm package pointed at xAI: `baseURL: "https://api.x.ai/v1"`, key from `XAI_API_KEY`, model from `GROK_MODEL` env var (use a fast model; do not hardcode the name).
- Voice: browser `speechSynthesis` on the phone (free, no keys). Optional later: Twilio trial for a real call, behind a flag, never required.
- Public access for phones: `cloudflared tunnel --url http://localhost:3000` (free, no account). Fallback: same Wi-Fi + laptop LAN IP.

`.env.example`:
```
XAI_API_KEY=
GROK_MODEL=
MOCK_LLM=false
PORT=3000
JOIN_URL=
```

## 4. Routes / views
- `/stage` — projector view, 1920×1080, the whole show happens here.
- `/join` — phone view, mobile-first, one big action at a time.
- `/admin` — hidden control panel for the presenter's phone/laptop: reset demo, re-seed chat, send a message as any persona, force-trigger each step, toggle mock mode, pick which phone gets "the call". Every demo step must be triggerable from here in case something fails live.

## 5. Data model (server, in memory)
```ts
Person { id, name, avatarColor, source: "seed" | "phone", socketId? }
Message { id, personId, text, ts }
Plan { id, title, createdFrom: messageId, status: "blocked" | "viable" | "booked" }
Resource { key: "venue" | "speaker" | "attendees" | "laptops" | "food" | string, label }
Commitment {
  id, personId, planId,
  offers: Resource key,           // what they will provide
  requires: Condition[],          // what must be true first
  quote: string,                  // exact chat text it came from
  status: "waiting" | "unlocked"
}
Condition { resource: string, minCount?: number }   // e.g. { resource: "attendees", minCount: 15 }
Event { title, when, where, agenda[], blurb }       // generated on booking
```

## 6. How Grok is used (3 calls, all structured JSON)
Grok does language. Code does logic. Never let the LLM decide if the plan is viable; the solver does.

**Call A — intent + extraction.** Input: the chat messages. Output (JSON mode / json_schema):
```json
{
  "plan": { "title": "Hands-on Grok agents workshop", "triggerMessageId": "m9" },
  "commitments": [
    { "personId": "p2", "offers": "speaker", "requires": [{ "resource": "venue" }], "quote": "I'll teach it if we sort a venue" },
    { "personId": "p4", "offers": "venue", "requires": [{ "resource": "attendees", "minCount": 15 }], "quote": "Our office works if 15+ come" }
  ],
  "requiredForPlan": ["speaker", "venue", "attendees"]
}
```
Validate with zod. On bad JSON, retry once, then fall back to the cached mock.

**Call B — explanation.** Input: solver output (graph + what is missing). Output: 1–2 plain sentences, for example "Everything hinges on attendance: 3 more people unlocks Priya's office, which unlocks Sam's talk." Short and human. Show it in the "Why it's stuck" panel and stream it in token by token.

**Call C — booking.** Input: plan + who committed. Output: event JSON (title, when, where, 4-item agenda, blurb), a 1-line personal invite per person, and a 2-sentence spoken call script for the chosen phone.

Every call has an 8s timeout. If it times out, or if `MOCK_LLM=true`, use a pre-written response from `server/mocks/*.json` that matches the seeded chat exactly. The demo must run end to end with no internet.

## 7. Solver (deterministic, in code)
- Attendee count = joined phones + seeded people marked attending.
- Loop to a fixed point: a commitment unlocks when all its conditions are met by resources already provided (by unlocked commitments or counts). Its `offers` resource then becomes available.
- Plan is viable when every `requiredForPlan` resource is available.
- "Blocking set" = the smallest unmet conditions at the root of the chain; this is what Call B explains and what the stage highlights.
- Emit the unlock order so the UI can animate the cascade link by link (300–500ms apart).
- Unit-test the solver with a few small graphs.

## 8. Design direction — must NOT look AI-generated
Concept: **a railway signal box / London departures board**. The plan is a train held at a red signal; each commitment is a signal on the line; unlocking turns them green in sequence. This fits "deadlock", fits London, and gives the project a real visual identity.

Rules:
- Dark, near-black warm background (#0E0E0C), off-white text (#EDEAE2). One accent: signal amber (#FFB000) for waiting, signal green (#3DDC84) for unlocked, signal red (#FF3B30) for blocked. No other colours.
- Type: IBM Plex Mono for data, labels, counters and the departures board; IBM Plex Sans for body. Big, confident sizes on stage (headline 72–96px). Tight letter-spacing on caps labels.
- Departures-board element: plan status and event details render with a split-flap character-flip animation (build it; each character flips through a few glyphs before settling).
- Dependency view: a track diagram. Horizontal lines, nodes as signal lamps with a soft glow, people's names beside their signal, their exact quote in small mono text underneath. Not a generic node-graph library look; draw it with SVG.
- Motion: purposeful and mechanical. Cascade unlocks with a lamp switch + a tiny "clunk" scale, never bouncy. Counters tick like an odometer.
- Banned: purple/blue gradients, glassmorphism, emoji, sparkle icons, rounded pill cards everywhere, generic hero sections, drop shadows on everything, "AI ✨" copy.
- Grid: 12-column, generous negative space, hairline 1px dividers (#2A2925). Stage layout: chat on the left (30%), track diagram centre (45%), "Why it's stuck" + attendee counter + QR on the right (25%).
- Phone view: full-bleed, one action per screen, huge tap targets, haptic `navigator.vibrate` on invite, full-screen incoming-call screen styled like a real one (caller "DEADLOCK", accept/decline). On accept, play the TTS script and show the words karaoke-style.
- Sound on stage (optional, toggle): a soft relay click per unlock and a chime when viable.

## 9. Build phases (stop after each one)
1. **Skeleton.** Monorepo, server + Socket.IO, the three routes, seeded chat on /stage, /join joins and the count updates live on /stage. Admin reset works.
2. **Solver + mock mode.** Data model, solver with tests, mock JSON for the seeded chat, the full demo runs end to end on mocks with a plain UI.
3. **Grok live.** Calls A/B/C with zod validation, timeouts, and mock fallback. Stream Call B.
4. **The design.** Signal-box stage, track diagram, split-flap board, cascade animation, phone screens, incoming call + TTS.
5. **Polish + bulletproofing.** Admin force-triggers for every step, reconnect handling (phones that drop rejoin silently), a dry-run button that simulates 20 phones joining, and a test pass at 1920×1080 and on an iPhone-sized viewport.

## 10. Run & present
- `npm install`, `npm run build`, `npm start`.
- `cloudflared tunnel --url http://localhost:3000` → put the URL in `JOIN_URL` → the QR on stage uses it.
- Laptop on the projector at `/stage` (fullscreen, browser zoom 100%). Admin on the presenter's phone.
- Before going on stage: run the whole demo twice, then screen-record a full successful run as a backup. Have mock mode ready to switch on if the venue wifi dies.

## 12. Current flow (22 Oct evening): this wins over section 11
- `/` is a Sign up page: scan the WhatsApp QR, done. No group picking.
- Tag **@deadlock** in any group chat to start a plan there. Attendance comes from the chat ("I'll come if someone hosts"), not from phones joining.
- The bot (`🤖 *Deadlock bot*`) posts the stuck summary with the `/stage` link, nudges the bottleneck in the chat, and posts "It's on!" when booked.
- Demo: a real circular deadlock in a WhatsApp group ("I'll host if someone brings pizza" / "I'll bring pizza if someone hosts"), the bot asks, someone says yes, the stage cascades. See `ARCHITECTURE.txt`.

## 11. v2: negotiator agent + real WhatsApp (agreed 22 Oct)
Why: a seeded chat plus a counter looks scripted. v2 makes the wow real: the chat is a live WhatsApp group, and Grok is an agent that *breaks* the deadlock by asking the bottleneck person to bend, instead of only explaining it.

Revised demo beats (replaces 2.2–2.7; 2.1 and 2.8 unchanged):
1. Stage shows a real WhatsApp group (team members, a few days of chat with conditions already in it). Label "WHATSAPP · <group name>".
2. Presenter sends "we should run a hands-on Grok agents workshop next week" **from their own phone in WhatsApp**. Stage lights up within ~2s.
3. Each message is extracted incrementally; signals appear on the track one by one with their quotes.
4. Audience scans the QR and joins; counter climbs but stalls short (e.g. 12/15).
5. The agent panel shows "Stuck 8s. Bottleneck: Priya's 15-person minimum." Grok WhatsApps Priya: "12 people are confirmed, would that work for the office?" Her phone buzzes on stage.
6. Priya replies "yeah 12 is fine" in WhatsApp. Code loosens the condition, solver re-runs, the cascade goes green.
7. Booking as before; the bot also posts the event into the WhatsApp group.

Rules: Grok never sets status or viability. A loosened condition only applies after an explicit yes. Every v2 step is forceable from /admin (`negotiate`, `admin:answer`), and `CHAT_SOURCE=seed` + `MOCK_LLM=true` still runs the whole show offline. Details in CONTRACT.md "v2 additions".

WhatsApp safety: use a spare number for the bridge, keep its API on 127.0.0.1, and only send to the demo group and its members.

Setup is a page, not a terminal: `/new` → New event → scan the WhatsApp link QR → pick the group → open `/stage`. See CONTRACT.md "New event + WhatsApp link".

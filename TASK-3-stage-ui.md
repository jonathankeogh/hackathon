# Person 3 — The stage screen (the wow)

**Your job:** `/stage`, the projector view judges stare at for 3 minutes. This is where the project looks either vibecoded or genuinely designed. Make it the second one.

**Read first:** CLAUDE.md (sections 2 and 8, the design direction) and CONTRACT.md.

## Concept
A London railway signal box. The plan is a train held at a red signal, each person's condition is a signal on the line, and when the audience unlocks it the signals flip green one by one until the board says the plan is go.

## Do first
Create `web/src/fixtures/`: 4 fake `State` snapshots (no plan / blocked / half unlocked / booked) plus a tiny dev toggle that cycles through them. That way you build the whole UI before the server is ready. Share these fixtures with Person 4.

## Build (1920×1080, fullscreen)
- **Layout:** chat on the left (30%), track diagram in the centre (45%), and on the right (25%) the "Why it's stuck" panel, attendee counter and join QR. 1px hairline dividers, big negative space.
- **Chat panel:** messages appear one by one, name in mono caps with the person's colour, text in Plex Sans. Messages that contain a commitment get a thin amber left rule once extracted.
- **Track diagram (SVG, hand-built, no graph library):** horizontal track lines. Each commitment is a signal lamp (circle with a soft glow) with the person's name beside it and their exact quote underneath in small mono. Lines connect each condition to what it unlocks, ending at a final "PLAN" signal. Red = blocked, amber = waiting, green = unlocked.
- **Cascade animation:** on `cascade`, light the lamps green in order, 400ms apart, with a lamp-switch flash and a tiny 1.05 "clunk" scale. Mechanical, not bouncy. Then the PLAN lamp goes green and the whole track briefly brightens.
- **Departures board:** the plan title and status (BLOCKED → VIABLE → BOOKED), and after booking the event details, shown with a split-flap animation where each character flips through a few glyphs before settling. Build this as a reusable component.
- **Why it's stuck:** streams `explain:chunk` text in word by word, in a calm large size.
- **Attendee counter:** odometer-style digits rolling up, shown as "12 / 15".
- **QR:** `qrcode.react` pointing at `JOIN_URL`, with the short URL printed underneath in mono.
- **Optional sound toggle:** a soft relay click per unlock and one chime on viable (small local audio files).

## Rules (from CLAUDE.md section 8)
Colours and fonts only from the tokens in CONTRACT.md. No gradients, glass, emoji, sparkles, pill cards or drop shadows everywhere. If something looks like a template, cut it.

## Done when
- [ ] all 4 fixtures look great at 1920×1080
- [ ] connected to the live socket, it reacts to the real demo flow
- [ ] the cascade + split-flap moment makes someone in your team say "oh"

## Prompt for Claude Code
> Read CLAUDE.md, CONTRACT.md and TASK-3-stage-ui.md. I'm Person 3. First create the fixtures and a dev toggle, then build the /stage view section by section, starting with layout and the track diagram. Follow the design rules strictly. Only touch web/src/stage and web/src/fixtures. Commit after each section.

## v2 additions (agent + WhatsApp, see CONTRACT.md "v2 additions")
- **Live commitments:** commitments now arrive one at a time as people type. Animate each new signal onto the track individually, and animate removals too.
- **Agent panel** (right column, above "Why it's stuck"): shows `agentLog` lines in mono, plus the open `Ask` as "ASKING PRIYA" with the question, and an amber lamp that turns green on accepted or red on declined. This is the second wow moment, so give it room.
- **Changed condition:** when an ask is accepted, show the old condition struck through next to the new one on that signal (for example ~~15+~~ 12+) before the cascade.
- **Chat panel:** header shows `chatSource.label` (for example "WHATSAPP · London Grok builders"). Phone and WhatsApp messages render the same as seeded ones.
- **Fixtures:** add two: "agent asking" and "ask accepted".

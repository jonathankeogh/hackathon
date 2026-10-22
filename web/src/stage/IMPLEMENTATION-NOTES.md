# Stage view: implementation notes (Person 3)

Branch: `person3/stage-ui`, rebased on `master` @ 9421abb. Spec: `CLAUDE.md` (sections 2
and 8), `CONTRACT.md`, `TASK-3-stage-ui.md` at the repo root.

## Starting state (2026-10-22)
- `master` has the spec, contract and task files plus the Python starter, but Person 1's
  skeleton (issue #1: npm workspaces, `web/`, `server/`, `shared/types.ts`) is not pushed.

## Decisions and deviations (conservative options, logged)
1. **Temporary scaffold outside my folders.** To build at all, this branch adds a minimal
   Vite + React + TypeScript + Tailwind + Framer Motion app in `web/` (stack from CLAUDE.md
   section 3) (package.json, vite config, tsconfig, index.html,
   `src/main.tsx`) and `shared/types.ts` copied verbatim from CONTRACT.md. These are
   placeholders: on merge, Person 1's versions win and only `web/src/stage` and
   `web/src/fixtures` are mine.
2. **Routing** is a pathname switch in `main.tsx` (no router dependency) so it is trivial to
   replace.
3. **Fixed 1920x1080 canvas** scaled with `transform: scale()` to fit any viewport, so the
   projector shows exactly what we designed.
4. **Fonts** via `@fontsource/ibm-plex-mono` and `@fontsource/ibm-plex-sans` (works offline
   at the venue, no Google Fonts dependency).
5. **Lamp colour rule** (contract only has `waiting | unlocked`): green if `unlocked`; red if
   any of its `requires` resources appear in `state.blocking`; otherwise amber. PLAN lamp:
   `none` dim/off, `blocked` red, `viable`/`booked` green.
6. **Cascade robustness.** The server may send the new `state` before or after `cascade`.
   The stage never shows a fresh unlock instantly: transitions to `unlocked` are queued and
   played 400ms apart, in `cascade.order` if one arrives, else in topological order.
7. **Sound** is synthesised with WebAudio (relay click, chime) instead of audio files: no
   asset hunting, nothing to license. Off by default, toggled with a key.
8. **Data source.** `?dev` in the URL uses fixtures plus a dev panel; otherwise the live
   socket at `VITE_SERVER_URL` (default: same origin; the temporary Vite config proxies
   `/socket.io` to the server on :3000). `JOIN_URL` from `VITE_JOIN_URL`,
   default `${location.origin}/join`.

## Lanes
- Unit A (scaffold, fixtures, dev toggle, layout, chat, track diagram): sonnet writer.
  Reason: design-heavy SVG layout plus graph layout logic.
- Unit B (cascade, split-flap, why panel, odometer, QR, socket, sound): sonnet writer.
  Reason: subtle async/animation state.
- Review: sonnet reviewer, read-only.

## Unit A deviations (2026-10-22)
1. **Person colours** in fixtures use six muted tones outside the 6-token palette
   (#C9B79C, #9FB3A8, #B8A1A1, #A9A9C2, #C2B280, #9DB4C0). `Person.color` is server data and
   names must stay distinguishable. Everything else uses tokens or opacity variants of them.
2. **12-column grid** is approximated by proportional columns 30% / 45% / 25% (576 / 864 /
   480 px at 1920). 30/45/25 does not land on whole 12-column units.
3. **Track labels hang below the lamp**, not beside it: the track line leaves the lamp
   horizontally, so text beside it would collide with the line, and the columns are too
   narrow for beside-lamp quotes. Name, offer and quote stack under the lamp.
4. **Transitive reduction when drawing connectors.** `buildGraph` keeps every edge
   (including offerer to PLAN for each required-for-plan resource), but `reduceEdges` drops
   an edge when its target is already reachable by a longer path (e.g. no venue-to-PLAN line
   when the venue reaches PLAN through the speaker). Drawing all of them produced long
   looping bypass lines. Cycle back-edges are not drawn.
5. **Connector routing** is orthogonal with 45-degree chamfered corners (the "rounded right
   angle" option), vertical pieces in channels between columns, long runs detouring around
   nodes via free lanes. Idle track is text at 30% opacity, green once the source lamp is green.
6. **Two node sizes.** LARGE metrics normally, COMPACT when any column holds more than four
   nodes, so six commitments in one column still fit 920px without overlap.
7. **halfUnlocked fixture** is a mid-cascade snapshot: attendees 15, venue unlocked, and
   `blocking` lists the resources still pending (speaker, laptops). Strictly a solver would
   have unlocked them already; this is what a frame mid-cascade looks like.
8. **noPlan fixture** keeps all 10 chat messages (so the amber rules animate in on the
   switch to `blocked`) but has no plan and no commitments. The audience lamp follows the
   documented rule, so it is amber there.
9. **Chat panel** hides rows that would be cut through the middle at the top rather than
   showing half a line. Opacity fades per row by rank (newest 1.0, minus 0.1 each). No
   `layout` animation: framer's layout measurement is unreliable under the scaled canvas,
   so older rows shift instantly when a new one arrives.
10. **Temporary placeholders for Unit B:** `board/DepartureBoardSlot.tsx` (plain mono text),
    `right/RightColumn.tsx` (explanation and "n / target" as plain text), and
    `data/useLiveData.ts` (returns the empty state, no socket).
11. Root `npm test` uses `--passWithNoTests`; `build` runs `tsc --noEmit` first.

## Final wiring deviations (2026-10-22)
1. **Displayed plan.** Viable and booked only show once the cascade lights the PLAN lamp
   (`planLit`): the header status flip, "why it's stuck" resolving, the PLAN lamp and the
   event board cross-fade all land together with the chime. `displayedPlan` and the
   `displayed` / `planLit` overrides live in `track/lampState.ts`, the one colour rule.
2. **Event board rows are 24 cells, not 20, and wrap.** Agenda items run 30-55 characters,
   so each wraps onto up to three flap rows (`board/wrapLines.ts`) instead of truncating.
   Flap font 24px (cell about 16px wide), 56px label gutter (WHEN, WHERE, 01-04).
3. **Header title** is 30 cells (the fixture title is 29 characters), cut at a word
   boundary when longer. Flap font 54px.
4. **Right column** body text is 28px (not WhyPanel's default 38px) so five lines of
   explanation, the odometer and a 192px QR fit 1080px with room; the explanation block has
   a fixed minimum height so nothing below it shifts while it streams. The QR has no inner
   margin so it shares the left edge (the surrounding background is the same colour).
5. **Streaming** (REVISED, see "Live integration"): live mode uses the skeleton's raw
   `streamed` string; `?dev` concatenates dev chunks raw (they carry their own spaces) and
   clears the stream whenever `state.explanation` changes.
6. **Bigger track**: LARGE lamps (housing 32, lamp 24), name 16 / offer 24 / quote 15 with
   three quote lines, slots up to 370px so two-per-column graphs use the column height.
   COMPACT (more than four in a column) stays close to the old size so six still fit.
7. **Dev director** (`dev/demoScript.ts`, `dev/useDemoDirector.ts`): `c` live moment
   (odometer 3 to 15 at 150ms, 250ms later viable plus a `cascade` event, 2.5s later booked
   with event details), `e` streams the blocked explanation at 70ms per word then restores
   the snapshot, `r` resets to fixture 2. Modifier combos (ctrl+r) are ignored.
8. The components demo harness (`ComponentsDemo.tsx`, `demoEntry.tsx`,
   `web/components-demo.html`) was removed.

## Live integration (2026-10-22, against the real server with `MOCK_LLM=true`)
Driven by a socket.io script (reset, chat:send of the presenter line, simulateJoins 3) with
the stage open at 1920x1080 in Playwright. Real flow: reset gives the seeded chat (12 of 15),
the host line triggers detect, the plan goes blocked, `explain:chunk` streams "word " chunks
every 60ms, joins climb 12 to 15, the server emits `cascade` then one `state` per unlock
every 400ms, then viable and booked.

Found and fixed on our side:
1. **Streaming.** Live mode now uses the skeleton's raw `streamed` (no guessed spaces; the
   old joiner broke sub-word deltas). `?dev` concatenates raw too and its chunks carry their
   own spaces. The gap and punctuation heuristics were deleted.
2. **Partial stream after a reload mid-stream.** `streamed` then holds only the tail, and
   `streaming ?? text` would show that fragment forever. `data/liveStreaming.ts` drops the
   stream once the finished explanation is in and is not the same words.
3. **Cascade lag.** The server drips unlocks 400ms apart, and the sequencer added another
   full 400ms gap on arrival, plus a 150ms order wait because it cleared the cascade order
   after each run. Lamps ended up about 400ms behind and the last two landed together with
   booked. The sequencer now waits only the remainder of the gap since the last reveal and
   keeps the order across runs. Result: venue, speaker, food go green one by one, about
   100ms after each server `state`, each with its flash, then the PLAN lamp, header status
   and event board 400ms after the last lamp.
4. **Reload replayed everything.** The stage mounted on the empty state and then animated
   to the real one (cascade, flaps, odometer showing a stuck digit). The stage now mounts
   only after the first server snapshot (`ready`), so first renders are the settled ones. The
   event board also takes `settled` when it is already up at load (no flap, no fade).
   Remaining on reload: the track and chat do their short entry fade.
5. Unknown resources (`food`, `attendees`, `speaker`, `venue`) and the real seed quotes (up
   to 80 characters) lay out correctly. The stub gives three commitments, so only one
   branch of the graph is exercised.

Server-side, not ours (reported, not fixed):
- `server/src/flow.ts` `settle()` never refreshes the explanation while joins arrive, so the
  stage shows "3 more people" while the odometer reads 14 and 15 of 15.
- With the stub LLM, `book()` returns instantly, so `viable` and `booked` states arrive in
  the same millisecond. The stage covers this (plan lights after the last lamp), but a
  real viable beat only exists if the real `book()` takes time.
- The first detect broadcast has `plan: blocked` with `blocking: []` for about 3ms before
  the solver fills it in; harmless here.

## v2: negotiator agent and live commitments (2026-10-22)
1. **Types.** `data/v2types.ts` mirrors the contract (`Ask`, `ChatSource`, `StateV2 = State & {asks?, agentLog?, chatSource?}`, `PersonV2`/`MessageV2` tolerating `"whatsapp"`). `shared/types.ts` is Person 1's and is untouched; the stage reads state as `StateV2` at the data seam (`StageData.state`). When Person 1 adds the real types, this file becomes a re-export.
2. **Fixtures 5 and 6** (`agentAsking`, `askAccepted`, in `fixtures/agent.ts`): 12 of 15, an agent log of 3 lines (4 once accepted), `chatSource` whatsapp, two messages with `source: "whatsapp"`. In askAccepted the plan is still blocked with `blocking: []` and everything waiting (just before the cascade); `attendeeTarget` stays 15 (server-owned), so the odometer reads 12 / 15 while the audience lamp reads 12 / 12.
3. **Right column rebalanced** to fit the agent panel at 1080: QR 192 to 128, odometer 80 to 56, padding tightened, why text 28 to 24 only while the agent panel shows. QR and odometer sizes are the same with or without the agent so nothing jumps when it appears. A 128px QR is smaller than before: check it scans from the projector distance.
4. **Agent panel** (`right/`): always mounted so lines arriving after load type in (22ms per char) while lines present at load do not; hidden when no log and no ask. Log keeps the last 4 lines, opacity steps 1 / 0.7 / 0.5 / 0.35. Ask block reserves room for two question lines, so its arrival shifts nothing.
5. **Changed condition** (`track/conditionDiff.ts`, pure and tested): per-commitment requires history kept in `useRequiresHistory`; shown only for an accepted ask whose proposal equals the commitment's current requires and only if the stage saw the old value. After a reload (stage only saw the new state) nothing is struck. The quote on that label clamps to one line fewer.
6. **Live commitments** (`track/entrances.ts`, `nodeMotion.ts`, `TrackNodeLamp.tsx`): nodes are positioned with transforms so layout changes glide (400ms ease-out); new nodes fade/scale from 0.9 over 300ms, staggered 120ms within a batch; removals fade 250ms (AnimatePresence); new connectors draw via pathLength (stroke-dashoffset) 200ms after the node starts, existing ones animate `d`. Nothing replays on first mount. Known limit: when a layout change alters a connector's number of segments, framer cannot interpolate `d` and that connector snaps while nodes glide.
7. **Scope change from the owner:** dev keys `n`, `a`, `d` and their scripts were NOT built (the stage is to stop being key-driven). Only the key hint now reads "1-6 fixture". Item 6 is therefore unfinished by instruction, and the add/remove/negotiation animations were not exercised in the browser, only entrance on fixture switch (1 to 2) and 5 to 6.

## Passive stage (2026-10-22, REVISED: supersedes the `?dev` director, the key hint and the `s` sound key above)
- The stage only renders; the server (WhatsApp or seed chat, extractDelta, solver, negotiate, `/admin`) drives everything. The keyboard dev director (keys 1-6, arrows, `c`/`e`/`r`, `s`), the dev label, the sound indicator and their scripts and tests are deleted.
- `/stage?fixture=<noPlan|blocked|halfUnlocked|booked|agentAsking|askAccepted>` renders one static snapshot with no chrome and no hint that it is a fixture (`data/urlParams.ts`). An unknown name goes live. The fixtures stay for Person 4 and the tests. A static snapshot cannot show the struck old condition (the stage never saw the old value), so `askAccepted` shows only the new one.
- Sound is on only with `?sound=1` (relay click per unlock, chime when the plan lights). No key, no on-screen marker; the first click or key press resumes the browser's AudioContext.
- **Reset** (`data/session.ts`, `data/useSession.ts`): when the plan goes away or is replaced by another plan id, the stage remounts under a new key and drops the transient events seen so far, so the remembered old conditions, the cascade sequencer and its order, the agent panel baseline, the flap state and the entrance bookkeeping all start fresh. A plan appearing for the first time (null to an id) keeps the session so the live flow still animates. Verified live: `wa:new` from a booked event clears to the seeded chat with 2 track nodes, no agent panel, no struck condition, and a second run still cascades.
- The server on this branch has no negotiator yet (no `asks` / `agentLog`), so the agent panel, ask and struck condition were verified against a throwaway socket.io mock that serves the fixtures (agentAsking, askAccepted, empty, askAccepted again).

## Design principles pass (2026-10-22)
Deadlock palette and IBM Plex kept; the principles, not the Crumbify colours or fonts.
1. **Rule zero.** Cut: chat timestamps, the PLAN and STATUS captions, the empty padding cells in every flap row (rows are as wide as their text, cells still flip), the "SCAN TO JOIN" label, the resource word on the struck condition, and the "WHY IT'S STUCK" heading while there is nothing to explain. The agent panel still takes no space without activity.
2. **No glow or halo.** Lamps are flat discs inside a solid 2.5px outline ring (foreground at 35%); the feGaussianBlur filter, the lamp glow and `TrackBrighten` are gone. The unlock keeps its flash and 1.05 clunk (opacity and scale only). The plan-lit moment is: the connectors into PLAN turn green and the PLAN lamp scales 1 to 1.08 to 1.
3. **Signal colours are fills.** Status flap cells are filled red/amber/green with background-colour letters; names are foreground text after a 10px square in the person's colour (`components/PersonName.tsx`); the ask heading ("PRIYA SAID YES") is foreground text and the lamp carries the meaning; "NOTHING. THE PLAN IS GO." is foreground text after a green disc; the struck old condition is foreground at 60% and the new one is foreground-on-bg text on an amber plate (`#0E0E0C` on amber). The amber commitment rule stays.
4. **One type scale** in `tokens.ts` (`type`): display 64 (header flaps, odometer value), title 32 (why text, agent question, "/ 15"), body 24 (chat text, track offer labels, event board rows and blurb), label 18 (names, log lines, headings), small 15 (quotes, URL). Labels are Plex Mono 600-700, body Plex Sans 400-500. Letter-spacing is 0 everywhere except a slight negative on display. `track/layout.ts` metrics use the scale (the compact set uses label 18 for the offer so six nodes still fit). `designRules.test.ts` statically rejects any other font size, positive tracking, glow, shadow, gradient, off-palette hex, dash or separator dot.
5. **Readable text.** `alphas.read` is 0.6; nothing readable is below it. Chat rows fade 1.0 down to 0.6 and then are hidden by the existing fit logic, never dimmed further; agent log steps are 1, .85, .7, .6. Only rings (35%) and idle rails (30%) are lower.
6. **Motion.** Fade, scale, translate, opacity and colour only; no overshoot. **Settle-net:** entrances are CSS animations (`stage.css` `dl-*` classes, no stored end state, so they always end on the normal style); framer elements (track nodes, labels, connectors, lamp colour, odometer digits) are remounted at their end state by `motion/useSettleKey.ts` a little after they should have finished; the split-flap, word reveal and typed log force their final state on a timer; the cascade sequencer forces the server's statuses and the plan lamp a while after the last update (`NET_MARGIN_MS`). **Reduced motion** (`motion/useReducedMotion.ts`): split-flaps, odometer, word reveals, the typed log and the lamp flash/scale render their end state at once; the cascade still sequences the colour changes, without flash or scale; CSS entrances are disabled.
7. **No decoration.** No dots, bullets, notches, shadows or gradients. `text/plainCopy.ts` turns em/en dashes and separator dots in server text (chat, quotes, explanation, ask, log, event) into commas, hyphens or colons at display time, so "WHATSAPP, London..." style labels read "WHATSAPP: London Grok builders".
8. **QR and right column.** QR is 232px (quiet zone of 4 modules inside the plate), dark modules on a light plate (the polarity phone cameras read most reliably) instead of the old inverted 128-192px code. Right column on one left edge: agent (display none without activity), why (takes the remaining room, so streaming text shifts nothing), then QR with the odometer beside it (value at 64, "/ 15" under it). Checked at 1920x1080 with the agent panel showing: no overflow (`scrollHeight - clientHeight` 0).

Deviations: the QR plate is a light surface on the dark stage (a fill, not a decoration). The header title cell width is the old 0.66 of the flap size (42px at 64), so the longest title (30 cells) plus BLOCKED fits 1920 with 127px to spare. A hooks-order bug (`flash && !useReducedMotion()`) was caught in the live run and fixed, with a regression test.

## Team collision (2026-10-22, evening)
- Master commit f1a9011 (another session) built a second signal-box stage directly in
  `web/src/stage/` (StagePage, TrackDiagram, SplitFlap, Odometer, sound). On rebase, our
  `StagePage` (mounts `StageApp`) was kept and those four files were removed as unused
  (3e16261). Their server change stays: the server holds VIABLE for `VIABLE_HOLD_MS`
  (2.5s) before booking, which gives the stage a real viable beat.
- Their join-page work (CallScreen, Ticket) is Person 4's area and untouched.
- Needs a team decision before merge: confirm with Person 1 that this stage replaces theirs.

## Phone layout (2026-10-22, branch `person3/stage-mobile`)
The bot posts the stage link into WhatsApp, so most viewers open `/stage` on a phone. The scaled 1920x1080 canvas was unreadable there; a portrait phone layout now exists next to it. The projector layout is untouched (1920x1080 screenshots of blocked and booked match geometry).
1. **Breakpoint** (`layout/layoutMode.ts`): phone layout when `width < 900` or `height > width`, otherwise the scaled canvas. A landscape phone (844x390) is narrower than 900 so it gets the phone layout; a landscape tablet (1024x768) gets the projector. Resize and `orientationchange` re-evaluate.
2. **One state, two layouts.** `StageApp` owns a stable root div; `Stage` (data, cascade sequencer, sound, session reset) picks `PhoneLayout` or `StageCanvas > StageLayout`. Rotating swaps what is drawn without a new data source; the cascade sequencer survives. `StageCanvas` no longer renders the fixed root (the stage root owns it, class `stage-root-projector` or `stage-root-phone`).
3. **Sizes.** Shared components (`WhyPanel`, `Odometer`, `AgentPanel`, `AskBlock`, `AgentLogLines`, `PersonName`, `MessageRow`, `DepartureBoard`, `ChangedConditionLine`, `SuggestionPanel`) read `useStageScale()` (`layout/StageScale.tsx`): the 1920 canvas `type` by default, the design system's responsive `typeScale` (CSS clamp strings, `phoneSize` in `tokens.ts`) inside `PhoneScale`. No second copy of any component or logic.
4. **Portrait track** is `computeTrackLayout(state, { orientation: "portrait", width })` in `track/layout.ts`, reusing the graph, column assignment, transitive reduction and parent-barycentre ordering. Columns become rows: one signal per row in level order, audience first, PLAN last, lamps on one vertical line, text beside the lamp (name aligned to the lamp, offer one line, quote clamped to 2 lines). A connector between neighbouring rows is a straight piece of track; one that skips rows jogs out to a lane left of the lamps and back in (45 degree corners, lanes shared by spans that do not overlap, so the gutter grows only as needed). Same `TrackNodeLamp`, `TrackConnector`, `SignalLampFx`, so the cascade flash and clunk are unchanged. Nodes carry `labelX/labelY/labelW` (landscape values are the old under-the-lamp ones). Phone metrics use the 390px design scale (14 / 16).
5. **Train on phone.** It works in portrait: it waits above the audience signal facing down and runs the line to PLAN (scale 0.8, lead-in from above, lead-out below, clipped by the svg). `TRAIN_ROOM` (104px) is reserved above the first signal only if the plan was not already lit at load (decided once, so the track never shifts under a running train). It is a side-view drawing turned 90 degrees, which reads as a train from above; kept rather than hidden.
6. **Order on the page:** sticky header (plan title in plain Plex Mono, 2-line clamp, because a flap row of 30 cells is wider than a phone; status as a split-flap row with signal fill), event board when booked (flap rows sized from the measured width, `rowCharsFor`), track, agent (when active), why it's stuck, attendee counter with a big Join button, chat last collapsed to the latest 3 with a Show chat / Hide chat toggle.
7. **Join.** The QR is replaced by a primary `Button` linking to `useJoinUrl()` (the `/api/config` join URL, same-origin `/join` fallback).
8. **Agent on a phone.** Log lines wrap instead of clipping to one line, the ask block has no reserved height (page flow, nothing below needs to stay still).
9. **Safe areas.** `viewport-fit=cover` was already in `index.html`; the phone column pads with `env(safe-area-inset-*)`, the sticky header with the top inset, the page bottom with the bottom inset. No horizontal scroll (`scrollWidth == clientWidth` at 390, 360, 844).
10. **Known limits.** The odometer on a phone is 56px (between the design scale's 40 and 96 display sizes); six commitments make a tall track (about 900px) in natural scroll; the vote count colour in `SuggestionPanel` (signal colour as text) predates this change and was left.

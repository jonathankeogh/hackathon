# Landing, organiser onboarding and design system: notes (Person 3)

Branch: `person3/design-system` (from `master` @ 4a529e6).

## Owner decisions (2026-10-22)
1. **Sign-up means organiser onboarding**, not real accounts: landing, then sign up (name and
   email, kept in memory, no database, works offline), then link WhatsApp by QR, then pick the
   group, then open the stage.
2. **We build it** (design system, landing page, setup flow); the owner tells Person 4 first
   because `web/src/new` and `web/src/join` are Person 4's. Person 4 restyles `/join` on the
   shared system.
3. **Design system:** Crumbify design principles (rule zero, no glow, accent as fill, one type
   scale, readable text, settle-net, reduced motion, ledge only on pressables), DEADLOCK's own
   colours and IBM Plex fonts.
4. Squash on merge, few commits (owner).

## Process
- Phase 1 (ultracode workflow, run `wf_21ea83fa-2d9`): the shared system in `web/src/design/`
  plus three landing directions (departures board, signal box manual, stripped back).
- The owner dropped the directions. One flow was built instead, in the stage's visual
  language (split-flap wordmark, signal lamps, mono labels, hairlines). The direction
  scaffolding (`LandingPreview`, `landing/directions/`, the `/landing` route) was deleted.
- The flow lives in `web/src/new/` (routes `/` and `/new`): landing, sign up, scan, live, one
  file per step, `flow.ts` for the pure logic, `useWaSocket.ts` for the bridge state.

## Deviations
- Organiser name and email stay in the browser session until Person 1 adds a server field;
  the conservative option, since the server is not ours.
- Sign-up is not sent anywhere. Name and email are in `sessionStorage` (`deadlock.organiser`),
  used only to greet the organiser on the live screen.
- After "Start over" or Continue, a still-linked `wa:status` is ignored until a status that is
  not linked arrives. The server polls every 1.5s and may report the old link right after
  `wa:new`, which would otherwise skip the QR step.
- A reload mid-flow returns to the landing page (the phase is not persisted); the landing page
  then offers "Open stage" if WhatsApp is still linked.
- Dev-only preview of the screens that need the bridge: `/?mock=signup|connecting|qr|live|active`
  (read by `new/devMock.ts`, off in production builds).
- Step changes play an enter transition only (rise and fade, 400ms, settle-net); there is no
  exit crossfade, to keep one step on screen at a time.
- Design system additions: `Screen desktopAction="inline"` (action follows the content from
  768px up instead of pinning to the viewport bottom) and `Button newTab`.

## Landing page revamp (2026-10-22, branch `person3/landing-revamp`)

The landing step is now a long, detailed scrolling page in `web/src/landing/`, mounted as the
landing step of `OnboardingFlow` through `new/LandingStep.tsx`. Sign up, scan and live are
unchanged, and so is the socket logic. The page's actions ("Sign up", and "Open stage" first
when an event is live) call the same `onSignUp` the old landing used.

### Deviation from rule zero (owner decision, logged on purpose)
Rule zero (one screen, one idea, one action) applies to sign up, scan and live. It does NOT
apply to the landing page: the owner asked for a page as detailed as landonorris.com, so the
landing has many scenes, many labels and several repeated calls to action (nav, hero, closing).
Everything else in the design system still holds: palette, no positive tracking, signal
colours as fills only, no glow, no gradients, no shadows, ledge only on pressable buttons, text
at 60% or more, nothing springy, settle-net, reduced motion shows a complete static page.

### Scenes (one per file)
Preloader (`Preloader.tsx`, once per session, under 1.5s, any key or press skips), nav with a
scroll progress rail (`Nav.tsx`), hero with the headline, a signal head and a live departures
strip (`Hero.tsx`, `DeparturesStrip.tsx`, `SignalHead.tsx`), an inverted two-row ticker of plans
that died in group chats (`Ticker.tsx`), the pinned signal box story (`SignalBoxScene.tsx` plus
`ChatColumn`, `TrackBoard`, `StatusRow`, `AgentStrip`, `BeatRail`), how it works with hover
reveals (`HowIt.tsx`), proof counters (`Proof.tsx`, labelled as demo numbers), the closing ask and
a full width split-flap wordmark footer (`Closing.tsx`, `FooterWordmark.tsx`), and a signal lamp
cursor (`Cursor.tsx`, mouse only, hidden under reduced motion).

### How the signature scene works
`storyMap.ts` is a pure function `storyAt(p)` of the scroll progress p in 0..1; the scene draws
whatever it returns. Nothing else holds story state, so scrolling back and forth always lands on
the same picture. Beats: chat (0), conditions (0.06), stall (0.34), ask (0.62), cascade (0.80),
booked (0.95). `trackLayout.ts` places the five signals and chamfered rails for the measured
panel size (phone and desktop use the same function, with a compact label set below 560 wide or
420 tall). The pinned section is 560svh tall on desktop and 420svh on phones.

### Decisions and deviations
- **Own scroll hook, not framer `useScroll`.** `hooks.ts` has a small passive, rAF-throttled
  scroll hook that feeds `storyAt`. It is testable in jsdom (framer's `useScroll` needs
  ResizeObserver and layout), and the story is discrete state, not a set of motion values.
  framer-motion is still used by the design system's `SplitFlap`; no new dependency was added.
- **The landing is not wrapped in `StepEnter`.** A transform on an ancestor breaks `position:
  fixed` and would misplace the preloader, so `OnboardingFlow` returns the landing page directly.
  Sign up, scan and live keep their enter transition.
- **Design system additions (with tests in `design/landingPrimitives.test.tsx`)**: `Odometer`,
  `StatusCell`, `Marquee`, `Reveal` and `useInView`, `Button size="sm"` (44px), and two oversize
  type roles `hero` and `mega` (`bigScale`, `bigStyle` in `tokens.ts`, mirrored in `design.css`).
  The gallery at `/design` shows them.
- **The design-rules static test now scans `landing/`.** The settle-net rule is unchanged; no
  landing file uses `<motion.` (scroll-linked values are plain inline transform and opacity).
- **Copy:** the numbers on the proof strip (47 plans, 312 people, 24 seconds) are demo numbers and
  the page says so. They are not measured metrics.
- **No sound.** The cascade has the visual flash and clunk only; no audio plays on scroll.
- **Reference research:** landonorris.com could not be fetched through the web tool (it is a
  client rendered Webflow page), so the pacing, signature object, tickers, hover reveals and
  closing wordmark were ported from knowledge of the site rather than from a live read.
- Existing flow tests now use `getAllByRole(...)[0]` for Sign up, because the landing has a nav,
  hero and closing button with the same name.

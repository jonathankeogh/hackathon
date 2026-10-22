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

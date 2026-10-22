# DEADLOCK integration rehearsal — 22 October 2026

The built seeded demo completes from a presenter typing the workshop proposal through three audience joins, the signal cascade, a visible VIABLE beat, booking, personal invitations, an incoming call, acceptance and automatic return to the invitation. Both final cloudflared rehearsals passed with zero browser console errors, page errors or failed requests. Physical-phone verification and real xAI responses remain pending.

Work was based on remote default `master` at `11251bd`; this repository has no `main` branch. Repairs are on `fix/demo-integration`. The design follows CLAUDE.md section 8: warm near-black, off-white, red/amber/green signals, local IBM Plex fonts, hairline divisions and mechanical motion. No v2 WhatsApp/negotiation expansion or unrelated product features were added.

## Bug and mismatch log

| Finding | Correction and evidence |
|---|---|
| Live/mock mode only changed a flag; all three LLM functions were hardcoded stubs. | Added official OpenAI SDK calls to xAI with env-selected model, Zod/source validation, an eight-second total deadline, one invalid-JSON retry and cached JSON fallback. 22 SDK/local-HTTP tests cover payloads, bad JSON, unknown people, fabricated quotes, hallucinated seed thresholds, refusal, API failure, missing config and timeout. Actual xAI is still unverified. |
| Cached extraction shared nested condition arrays between runs. | Deep-cloned cached responses; mutation regression proved the old mock could poison later rehearsals. |
| A presenter trigger arriving during a pending earlier extraction could be dropped. | Frozen request input plus queued re-detection; delayed-response regression now creates the plan without pressing Detect. |
| Force Book/Cascade/Call could return before asynchronous detection finished. | Presenter send/detect is now awaitable and force-steps wait for it. Deferred-network regressions pass, including chosen-phone invite/call delivery and stale-response rejection after reset. |
| Runtime mock toggle was omitted from detection calls. | Detection receives the state's current mock flag; regression observes distinct mock/live results. |
| VIABLE lasted 0–1ms before BOOKED, so the browser could skip the intended moment. | Added a 1.8-second server pause after the final relay and before booking. Final tunnel observations: 1810ms and 1944ms including network delivery jitter. |
| Audience joins erased the opening of a streaming explanation. | Preserved the stream across unrelated state snapshots; interleaved snapshot/chunk regression passes. |
| Restarting Explain during an initial stream could concatenate sentences after the preservation fix. | Added an additive `reset: true` explanation chunk and documented it in CONTRACT.md. Restart regression passes. |
| Re-seeding retained old invitations and ringing/active calls on phones whose IDs were preserved. | Clear event UI when the server event disappears; complete browser regression now returns to RSVP without refreshing. |
| Joining while disconnected had no feedback, and a missing joined response could strand the button. | Connection state disables the initial action, pending identity stays in memory even without storage, listeners attach before rejoining, and pending joins retry automatically without double counting. |
| Speech failure could leave a call permanently Connected; repeated calls could overlap speech. | Keyed call sessions cancel old speech/timers. Missing/erroring/silent voices use a timed read-along and finish automatically. Native boundary events drive karaoke; a tested timed fallback covers voices that start but never emit boundaries. |
| Seed mode eagerly loaded `node:sqlite`, unavailable on the documented Node 20 runtime. | SQLite loads only when explicitly starting the bridge. A real bundled subprocess regression blocks native SQLite and verifies seeded imports still work. |
| Optional offers and unused alternative venues could raise the attendance bar for the entire plan. | Infer the minimum threshold for the required graph. Tests cover venue alternatives at 12/15, optional food at 50, missing laptops, shared requirements and default 15. |
| Blocking explanations unioned every alternative provider, disagreeing with the minimum attendance target. | Select sufficient provider paths, merge shared roots, and respect counted resources. Regression: 11 confirmed / target 12 now reports one missing, not four. |
| Alternative providers rendered their lamps/quotes on the same coordinates. | Position signals by commitment ID and expand provider rows. Browser fixture verifies distinct venue rows at y=68 and y=286 with no page errors. |
| The merged stage lacked the specified track, flaps, PLAN lamp, odometer and chat following. | Implemented the prescribed presentation treatment without changing the visual identity; captured blocked, partially unlocked, viable and booked states. |

## Senior design critique and the five fixes

1. **The dependency list looked like a debug inspector.** Static dots did not explain causality. The SVG line now connects attendees → venue → speaker → PLAN, with the optional food branch, exact source quotes and a brief mechanical lamp click at each server-paced unlock.
2. **The status had no departures-board character.** A small plain word was too easy to miss. Per-character split flaps and the visible VIABLE hold give the cascade a readable conclusion.
3. **The projector layout was uncomposed.** A 48px title and loose lists left space without establishing hierarchy. The stage now uses the prescribed 30/45/25 balance, a 74px headline at 1920px, anchored counter/QR, stronger hairline structure and automatic chat following.
4. **The phone flow looked unfinished.** Centered forms and a bordered paragraph did not feel like a completed RSVP/invitation. Clear state headings, numbered role actions, confirmation progress and event metadata now carry the same signal-box vocabulary.
5. **The incoming call resembled a test form and revealed its script before acceptance.** A dedicated caller scene, large red/green controls, safe-area spacing and accepted-call karaoke make it a deliberate final beat.

Open `comparison.html` for embedded before/after screenshots. Final screenshots are in `final-tunnel-1/` (1920×1080 stage and 390×844 phone) and `final-tunnel-2/` (1920×1080 stage and 375×667 phone). Every phone screen is included, plus a full invitation image. The baseline VIABLE screenshot could not capture a stable VIABLE state because its dwell was zero; the final comparison includes the proper state.

## Verification

| Check | Result |
|---|---|
| Final `npm test` | 71 server + 4 frontend tests passed |
| `npm run typecheck` | All workspaces passed |
| `npm run build` followed by `npm start` | Passed; one process serves web/API/socket |
| `npm ls --depth=0`, `git diff --check` | Passed |
| Full local mock browser runs after corrections | Passed; detailed timelines retained in the corresponding output folders |
| Final tunnel run 1 | Passed; actual built app, 390×844 phones, native browser speech path, automatic call completion; zero browser errors |
| Final tunnel run 2 | Passed; same built app, 375×667 phones, reduced motion and simulated absent word-boundary callbacks; zero browser errors |
| Speech failure | Failed before the fix, then passed with read-along and automatic completion |
| Reconnect | Saved identity/name reattached without duplicate attendee count |
| Re-seed | Preserved phones return to RSVP and lose old invite/call state |
| Alternative-provider fixture | Distinct signals/quotes, no page errors |
| Independent review | No remaining important issue in the seeded demo; limitations below retained explicitly |

The presenter enters the proposal in the existing `/admin` chat form; a separate stage composer was not added. Final rehearsals used three independent phone browser contexts rather than the admin's simulated-join shortcut. Expected interactions—typing the proposal, entering names, choosing a role and accepting the call—were performed automatically by the runner. No force-detect, force-cascade, force-book, forced call, refresh to recover an error, manual scroll or manual hang-up was needed. The runner deliberately reloads the first phone once to test reconnect.

## Pending and limitations

- **Real Grok:** no `XAI_API_KEY` or `GROK_MODEL` was available in the process, local env files, tracked branches, repository variables or repository secret names. An env example is tracked with empty values. Local SDK transport tests and a complete `MOCK_LLM=false` fallback run are not substitutes for actual xAI success.
- **Physical phone:** the user explicitly chose emulation for now. A real phone scanning the QR, mobile connection behavior, audible speech and device haptics remain pending. The code treats vibration as optional because support varies by browser.
- **Cyclic graphs (fixed in the 3D follow-up):** the counted-cycle omission is corrected. Conservative fallback retains unresolved cyclic requirements and structural shortages, traversing every required branch. Regressions verify that supplying the reported conditions resolves both the three-venue example and an independent food cycle. Large alternative graphs still retain up to 128 paths and cap expansions at 4000; fallback may over-report rather than return a global minimum. Viability remains deterministic.
- **Environment:** initial socket tests and server startup hit sandbox `listen EPERM`; they passed once local listening was allowed. These were execution-environment failures. No sandbox approval remains blocked.
- **Preserved local file:** an untracked `web/src/stage/StagePage 2.tsx` is an exact copy of the original stage scaffold. It was not changed or included in the repair commit.

Reproduce with the documented `npm run test:demo -- <run-name>` command. Run it against a rehearsal server: it resets state. Credentials and generated screenshots/logs are not committed.

## 3D follow-up

The user subsequently requested a stronger 3D interface. The stage now uses an extruded instrument chassis, raised flip-board tiles, recessed rails and layered illuminated signal lenses. Phone entry and role controls have physical pressed states; invitations resemble perforated tickets; the incoming-call scene has a dimensional signal housing. Setup and presenter controls share the same hardware finish. These are CSS 3D transforms and SVG, with no new runtime dependency.

The counted-cycle limitation above was fixed with four added regressions, including an independent later cyclic branch. Final unit verification: 75 server + 4 frontend tests pass; all typechecks and the production build pass. Screenshots and the before/after comparison are delivered separately as local outputs. The existing credentials/device limitations still apply.

## Final closeout

Fixed two remaining integration issues: reconnecting phones now restore their server-held RSVP role, and malformed WhatsApp group selections are ignored without throwing. Added regressions for role restoration, changed roles, reset identities and malformed selections; the full browser rehearsal now also checks the restored confirmation screen after reload.

Final verification: 79 server and 4 frontend tests passed; workspace typechecks and the production build passed. The built app completed the full mock demo through the cloudflared tunnel at 375×667 with reduced motion and a forced speech failure, including automatic call completion. The run recorded zero browser errors and a 1829ms VIABLE dwell. Evidence is in the delivered `final-closeout/` screenshots and `run.json`. Live xAI and physical-phone verification remain pending for the reasons above.

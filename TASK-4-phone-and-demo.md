# Person 4 — Phone experience + running the demo

**Your job:** two things. First, the `/join` phone view that the audience uses. Second, you own the demo itself: hosting, rehearsals, backup recording and the pitch.

**Read first:** CLAUDE.md (sections 2, 8, 10) and CONTRACT.md.

## Part A: phone view (/join)
Build it against Person 3's fixtures until the server is ready. Same design tokens: dark, mono labels, signal colours, no gradients or emoji.

- **Join screen:** a big "DEADLOCK" wordmark, one sentence on what's happening, a first-name input and one huge button. Save the personId in localStorage so a refresh doesn't create a duplicate.
- **RSVP screen:** three big choices (I'm coming / I'll bring a laptop / I can help). Tapping sends `rsvp` and shows a confirmation with a live count ("you're #13 — 2 more unlocks the venue").
- **Live status:** a small signal lamp at the top that goes red → green with the plan.
- **Invite:** on `invite`, call `navigator.vibrate([80, 40, 80])` and slide up a ticket-style card with the personal invite text and event details.
- **Incoming call:** on `call`, a full-screen incoming-call screen that looks like a real one (caller "DEADLOCK", pulsing ring, accept/decline). On accept, read the script with `speechSynthesis` and show the words highlighted as they're spoken. iOS needs a tap before audio plays, and the accept button is that tap.
- Test on a real iPhone and a real Android. Thumb-sized targets, no horizontal scroll, works in portrait.

## Part B: owning the demo
- **Hosting:** install `cloudflared` and run `cloudflared tunnel --url http://localhost:3000`. Put the URL in `.env` as `JOIN_URL`. Also test the fallback: the laptop's LAN IP on the same wifi. Bring a phone hotspot as plan C.
- **Run sheet:** a 3-minute script with exact lines and who clicks what (stage laptop, admin phone). Follow the demo in CLAUDE.md section 2.
- **Pitch lines:**
  - Open with the problem everyone's lived: "every group chat has a 'we should' that dies."
  - Close with the line: "we turn 'we should' into it actually happening."
  - Say clearly what Grok does: it reads messy chat and extracts the conditions; code does the logic.
- **Rehearsals:** at least 2 full runs once everything is merged. Time them, then fix whatever broke.
- **Backup:** screen-record one perfect run (stage + a phone) and keep it on the laptop desktop.
- **Pre-flight checklist:** laptop charged, browser zoom 100%, notifications off, mock mode ready, stage tab fullscreen, admin open on the presenter's phone, one teammate's phone picked to receive the call.

## Done when
- [ ] a stranger can join from a QR in under 10 seconds
- [ ] the invite buzz and incoming call work on both iPhone and Android
- [ ] the run sheet is written and rehearsed twice
- [ ] the backup video is recorded

## Prompt for Claude Code
> Read CLAUDE.md, CONTRACT.md and TASK-4-phone-and-demo.md. I'm Person 4. Build the /join phone view against the fixtures in web/src/fixtures, screen by screen: join, RSVP, invite, incoming call with speechSynthesis. Follow the design rules strictly. Only touch web/src/join. Commit after each screen.

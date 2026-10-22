# Person 2 — The Grok brain (LLM + seeded chat + mocks)

**Your job:** make Grok actually understand the chat. You own everything inside `server/src/llm/` and `server/src/seed.ts`. You can build and test it all from the terminal without touching the UI.

**Read first:** CLAUDE.md (sections 1, 2, 6) and CONTRACT.md.

## Get the key now
1. Ask the organisers for xAI credits, or sign up at console.x.ai (new accounts get free credits).
2. Pick a fast model from the console's model list.
3. Put `XAI_API_KEY` and `GROK_MODEL` in `.env` (never commit it; it's already gitignored).

## Build
- **Client:** the `openai` npm package with `baseURL: "https://api.x.ai/v1"`. One wrapper `callGrok()` with an 8-second timeout, one retry on bad JSON, and a fallback to mocks.
- **seed.ts:** the seeded community. Make it feel real: 6 London tech-community people with first names, and 8–12 casual chat messages. Three of them must contain chained conditions, for example:
  - Sam: "I'd happily teach it if someone sorts a room"
  - Priya: "our office near Old Street works if we get 15+ people"
  - Leo: "I'll bring pizza if Priya's office is confirmed"
  - Plus some noise messages (memes, someone asking about the Northern line).
  The presenter's live message is "we should run a hands-on Grok agents workshop next week".
- **Three functions** with the exact signatures in TASK-1 (`detectAndExtract`, `explain`, `book`):
  - **A, detectAndExtract:** returns JSON matching the contract types. Validate with zod. Every commitment must carry the exact `quote` from the chat.
  - **B, explain:** streams 1–2 plain sentences like "Everything hinges on attendance: 3 more people unlocks Priya's office, which unlocks Sam's talk." Base it on the solver's `blocking` output; don't let Grok invent the logic.
  - **C, book:** event details (title, when, where, 4-item agenda, 1-line blurb), a short personal invite per joined person using their name, and a 2-sentence spoken call script that's friendly and slightly funny.
- **Prompts** live in `server/src/llm/prompts.ts` as plain template strings, short and specific, with an example output in each.
- **Mocks:** run each function for real once, save the outputs to `server/src/llm/mocks/*.json`, and serve those when `MOCK_LLM=true` or a call fails. The demo must work with the wifi off.
- **Test script:** `npm run llm:test` runs A, B and C against the seed and prints results with timings.

## Quality bar
- Extraction gets all 3 chained commitments right 5 runs out of 5. If not, tighten the prompt.
- Each call returns in under 4 seconds on your fast model.
- Copy sounds like a person, not a press release. No emoji, no "exciting opportunity".

## Done when
- [ ] `npm run llm:test` passes with live Grok and with `MOCK_LLM=true`
- [ ] Person 1's stubs replaced with your real functions on `main`
- [ ] you can explain to judges exactly what Grok does and what the code does

## Prompt for Claude Code
> Read CLAUDE.md, CONTRACT.md and TASK-2-grok-brain.md. I'm Person 2. Build the seed data and the three LLM functions with zod validation, timeouts and mock fallback, plus the llm:test script. Only touch server/src/llm and server/src/seed.ts. Run the test, fix errors, commit.

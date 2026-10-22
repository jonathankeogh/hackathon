// Prompts for the Grok calls. Short and specific, each with an example.
// Grok does language; the solver decides what is viable.

export const EXTRACT_SYSTEM = `You read a casual group chat and find a plan people want to do together, plus every conditional commitment toward it.

Return JSON only:
{
  "plan": { "title": string, "triggerMessageId": string } | null,
  "commitments": [
    { "personId": string, "messageId": string, "offers": string, "requires": [{ "resource": string, "minCount"?: number }], "quote": string }
  ],
  "requiredForPlan": string[]
}

Rules:
- The latest message that tags @deadlock (or says "we should...") is the trigger. If it, or the messages around it, suggest doing anything together ("pizza thursday", "a workshop next week"), there IS a plan, even if nobody has committed yet: then commitments is []. Only return plan null when nothing at all is being proposed.
- Ignore unrelated chatter before the trigger (links, usernames, tests).
- A commitment is one person offering something: a venue, teaching/speaking, food, drinks, laptops, a projector...
- "offers" and "resource" are short lowercase keys: venue, speaker, food, drinks, laptops, projector. Reuse the same key for the same thing.
- Headcount conditions use resource "attendees" with minCount ("if 15+ come" -> {"resource":"attendees","minCount":15}).
- Bringing or doing something offers that thing ("I'll bring my laptop" -> laptops), never "attendees".
- Someone saying they'll come ("I'm in", "count me in", "+1", "I'll come if someone hosts") also offers "attendees", with their condition if any ("I'll come if someone hosts" -> offers "attendees", requires [{"resource":"venue"}]). One per person. A message can hold several offers: "I'll come if someone hosts and I'll bring pizza" -> attendees if venue, and food if venue.
- A condition on someone else's offer uses that key ("if we get a venue" -> {"resource":"venue"}). Unconditional offers have requires [].
- "quote" is copied exactly, character for character, from that message's text. "personId" and "messageId" come from the tags.
- Ignore jokes, memes and chat unrelated to the plan.
- requiredForPlan lists what the plan cannot happen without: "attendees" plus the key offers (usually venue and speaker).
- title: short and plain, like "Hands-on Grok agents workshop".

Example output:
{"plan":{"title":"Hands-on Grok agents workshop","triggerMessageId":"m11"},"commitments":[{"personId":"p-sam","messageId":"m5","offers":"speaker","requires":[{"resource":"venue"}],"quote":"I'll teach it if we sort a venue"},{"personId":"p-priya","messageId":"m6","offers":"venue","requires":[{"resource":"attendees","minCount":15}],"quote":"I can host if 15+ people actually commit"},{"personId":"p-dan","messageId":"m7","offers":"food","requires":[{"resource":"venue"}],"quote":"I'll bring pizza if there's a venue"}],"requiredForPlan":["speaker","venue","attendees"]}`;

export const DELTA_SYSTEM = `You keep a plan's list of conditional commitments up to date as new chat messages arrive.

You get the plan, the current commitments (with ids), any open question the organiser bot asked, and the NEW messages only.
Return JSON only, describing what the new messages change:
{
  "upserts": [ { "id"?: string, "personId": string, "messageId": string, "offers": string, "requires": [{ "resource": string, "minCount"?: number }], "quote": string } ],
  "removes": string[],
  "askReply": { "accept": boolean } | null
}

Rules:
- Bringing or doing something ("I'll bring a projector", "I'll host") offers that thing (projector, venue), never "attendees".
- Only saying they'll come ("I'm in", "count me in", "+1", "I'll come if someone hosts") offers "attendees", with their condition if any. Skip it if that person already offers attendees.
- upserts: one entry per offered thing. A new offer has no id, even if the same person already offers something else. Use an existing id only when that same offer's conditions change. Same key conventions as before: lowercase keys, headcount conditions are {"resource":"attendees","minCount":N}.
- removes: ids of commitments someone withdraws ("actually I can't host anymore").
- askReply: only if there is an open question AND the person it was asked to answers it. "yeah 12 is fine" -> {"accept":true}. "no, need 15" -> {"accept":false}. Otherwise null.
- quote is copied exactly from the message text.
- Most messages change nothing: return {"upserts":[],"removes":[],"askReply":null}.

Example output:
{"upserts":[{"personId":"wa-4477","messageId":"wa-31","offers":"projector","requires":[{"resource":"food"}],"quote":"I'll bring a projector if someone gets food"}],"removes":[],"askReply":null}`;

export const NEGOTIATE_SYSTEM = `You are the organiser bot in a group chat. A plan is stuck because people's conditions aren't met. Your job: ask ONE person to bend their condition so the plan can happen.

You get the commitments (with ids), what is blocking, and the current headcount.
Return JSON only, either:
{ "action": "ask", "personId": string, "commitmentId": string, "requires": [{ "resource": string, "minCount"?: number }], "question": string }
or
{ "action": "wait", "reason": string }

Rules:
- Pick the condition closest to being met, usually a headcount minimum a few people short.
- "requires" is that commitment's full new condition list. Only loosen: lower a minCount (usually to the current headcount) or drop one condition. Never add.
- question: one casual sentence to that person by first name, plain and friendly, no emoji, ending so a yes/no answer works. Example: "Priya, 12 people are in, would that work for the office?"
- If nothing can sensibly be loosened, return wait.`;

export const EXPLAIN_SYSTEM = `In one or two short plain sentences, say why a group plan is stuck and what single thing would unlock it. Use people's first names. Follow the dependency chain you are given; do not invent facts or numbers. No emoji, no hype.
Example: "Everything hinges on attendance: 3 more people unlocks Priya's office, which unlocks Sam's talk."`;

export const BOOK_SYSTEM = `A group plan is now go. Write the event and short messages for the people involved. Sound like a friendly person, slightly funny, not a press release. No emoji, never "exciting opportunity".

Return JSON only:
{
  "event": { "title": string, "when": string, "where": string, "agenda": [string, string, string, string], "blurb": string },
  "invites": { "<personId>": string },
  "callScript": string
}

Rules:
- when: a concrete day and time next week, e.g. "Thu 29 Oct, 18:30". where: from the venue offer, e.g. "Priya's office".
- agenda: exactly 4 short items with times, using who offered what.
- blurb: one line.
- invites: one line per personId listed, using their first name.
- callScript: two spoken sentences from "Deadlock" telling someone the plan is on.
- Write fresh copy for this plan; the example below is only the shape, don't reuse its wording.

Example output (a different plan):
{"event":{"title":"Sunday five-a-side","when":"Sun 1 Nov, 10:00","where":"Hackney Marshes, pitch 4","agenda":["10:00 Warm up","10:15 First half","10:45 Second half","11:30 Pub"],"blurb":"Bring boots, Jo brought the bibs this time."},"invites":{"ph-1":"Ada, you're playing. Sunday 10am at Hackney Marshes, pitch 4."},"callScript":"Hi, it's Deadlock. Five-a-side is on, Sunday at ten on the Marshes, and Jo swears the bibs have been washed."}`;

import type { MeetExtras, MeetTip, Message, TipKind } from "@deadlock/shared/types";

// Reads the chat for practical clues that make the meet better: how to get
// there, where to meet, what to bring or wear, the weather, and what to do
// after. Plain keyword rules, no network: it runs the same offline.
// The area guide below suggests things to do nearby when no one has.

const MAX_PER_KIND = 3;
const MAX_LABEL = 60;

// ───────────── what to bring / wear ─────────────

/** [pattern, label]. First match wins per label. */
const BRING_ITEMS: [RegExp, string][] = [
  [/\blaptops?\b/i, "Laptop"],
  [/\b(chargers?|power ?banks?|usb-?c|adapters?)\b/i, "Charger"],
  [/\b(headphones|earphones|airpods)\b/i, "Headphones"],
  [/\b(umbrellas?|brollys?)\b/i, "Umbrella"],
  [/\bwater( bottle)?s?\b/i, "Water"],
  [/\b(photo )?id\b|\bpassport\b/i, "Photo ID"],
  [/\btickets?\b/i, "Ticket"],
  [/\bcash\b/i, "Cash"],
  [/\bsnacks?\b/i, "Snacks"],
  [/\btowels?\b/i, "Towel"],
  [/\b(sun ?cream|suncream|sunscreen|spf)\b/i, "Sun cream"],
  [/\b(notebooks?|pens?)\b/i, "Notebook and pen"],
  [/\b(picnic )?blankets?\b/i, "Blanket"],
  [/\b(yoga )?mats?\b/i, "Mat"],
  [/\b(swimsuit|swimwear|trunks|cossie)\b/i, "Swimwear"],
  [/\b(football|ball)\b/i, "A ball"],
  [/\b(rackets?|racquets?|paddles?)\b/i, "Racket"],
  [/\b(torch|head ?torch)\b/i, "Torch"],
  [/\b(hdmi|dongle)\b/i, "HDMI dongle"],
  [/\bextension (lead|cable)s?\b/i, "Extension lead"],
];

const WEAR_ITEMS: [RegExp, string][] = [
  [/\b(sports ?wear|gym (kit|clothes)|activewear|sports kit)\b/i, "Sportswear"],
  [/\b(trainers|running shoes|sneakers)\b/i, "Trainers"],
  [/\b(walking )?boots\b|\bwellies\b|\bwellingtons\b/i, "Boots"],
  [/\b(waterproofs?|rain ?coat|rain ?jacket|cagoule)\b/i, "Waterproof jacket"],
  [/\blayers\b|\bwarm (clothes|stuff)\b|\bjumpers?\b|\bcoats?\b/i, "Warm layers"],
  [/\b(comfy|comfortable) (shoes|clothes)\b/i, "Comfy shoes"],
  [/\b(smart casual|dress code|black tie|smart)\b/i, "Smart casual"],
  [/\b(sunglasses|shades|sun ?hat|cap)\b/i, "Sun hat and sunglasses"],
  [/\b(fancy dress|costumes?)\b/i, "Fancy dress"],
];

const BRING_VERB = /\b(bring|brings|pack|don'?t forget|remember|need|needs|grab|take|bringing)\b/i;
const WEAR_VERB = /\b(wear|wearing|dress|dressed|kit|outfit|dress code)\b/i;

// ───────────── sentence-level clues ─────────────

const TRAVEL =
  /\b(tube|station|overground|elizabeth line|dlr|bus(es)?|night bus|trains?|(northern|central|victoria|jubilee|piccadilly|district|circle|metropolitan|bakerloo|hammersmith|waterloo & city|lizzy) line|cycle|bike|santander|lime bike|parking|car park|uber|taxi|cab|walk from|mins? walk|minutes? walk|get off at|change at|step-free|thameslink)\b/i;
const MEETING_POINT =
  /\b(meet (at|by|outside|in front of|inside|under|near|in)|meeting point|reception|buzzer|ring the (bell|buzzer)|(main |side |back )?entrance|sign in|front desk|(\d+(st|nd|rd|th)|ground|top) floor|under the clock|by the (barriers|gates|fountain|statue))\b/i;
const WEATHER =
  /\b(rain|raining|rainy|showers?|drizzle|forecast|sunny|sunshine|heatwave|scorching|hot|cold|freezing|chilly|windy|snow|snowing|weather)\b/i;
const ACTIVITY_WHEN = /\b(after|afterwards|then|later|before|beforehand)\b/i;
const ACTIVITY_WHAT =
  /\b(pub|pints?|drinks?|dinner|curry|ramen|pizza after|bar|karaoke|bowling|walk|market|gallery|museum|coffee|brunch|food|gig|cinema|film|boat|swim|lido|rooftop|explore)\b/i;

// ───────────── plan-based inference ─────────────

/** Things the plan itself implies, when the chat hasn't said them. */
const PLAN_HINTS: { match: RegExp; tips: [TipKind, string][] }[] = [
  { match: /\b(workshop|hack(athon|ing)?|hands-on|coding|build|agents?|talk|meetup)\b/i, tips: [["bring", "Laptop"], ["bring", "Charger"]] },
  { match: /\b(five-a-side|5-a-side|football|footy|tennis|padel|basketball|netball|frisbee|sports?)\b/i, tips: [["wear", "Sportswear"], ["wear", "Trainers"], ["bring", "Water"]] },
  { match: /\b(run|running|5k|10k|parkrun|jog)\b/i, tips: [["wear", "Sportswear"], ["wear", "Trainers"], ["bring", "Water"]] },
  { match: /\b(hike|hiking|ramble|walk(ing)? tour|countryside)\b/i, tips: [["wear", "Boots"], ["wear", "Waterproof jacket"], ["bring", "Water"], ["bring", "Snacks"]] },
  { match: /\b(climb(ing)?|bouldering)\b/i, tips: [["wear", "Sportswear"], ["bring", "Water"]] },
  { match: /\b(yoga|pilates)\b/i, tips: [["wear", "Sportswear"], ["bring", "Mat"], ["bring", "Water"]] },
  { match: /\b(swim|swimming|lido|wild swim)\b/i, tips: [["bring", "Swimwear"], ["bring", "Towel"]] },
  { match: /\b(picnic|bbq|barbecue|park)\b/i, tips: [["bring", "Blanket"], ["bring", "Snacks"]] },
];

/** Weather in the chat → what to bring/wear for it. */
const WEATHER_HINTS: { match: RegExp; tips: [TipKind, string][] }[] = [
  { match: /\b(rain|raining|rainy|showers?|drizzle|wet)\b/i, tips: [["bring", "Umbrella"], ["wear", "Waterproof jacket"]] },
  { match: /\b(sunny|sunshine|heatwave|scorching|hot)\b/i, tips: [["bring", "Sun cream"], ["bring", "Water"]] },
  { match: /\b(cold|freezing|chilly|snow|snowing|windy)\b/i, tips: [["wear", "Warm layers"]] },
];

// ───────────── area guide ─────────────

export interface AreaGuide {
  name: string;
  aliases: RegExp;
  travel: string;
  nearby: string[];
}

export const AREAS: AreaGuide[] = [
  {
    name: "Shoreditch",
    aliases: /\b(shoreditch|old street|hoxton|brick lane|spitalfields|silicon roundabout)\b/i,
    travel: "Old Street (Northern line) or Shoreditch High Street (Overground)",
    nearby: ["Curry or a salt beef bagel on Brick Lane", "Street food and drinks at Boxpark Shoreditch", "Old Spitalfields Market, 10 min walk", "Street art on Redchurch Street"],
  },
  {
    name: "King's Cross",
    aliases: /\b(king'?s cross|kings x|st pancras|granary square|coal drops)\b/i,
    travel: "King's Cross St Pancras (six tube lines)",
    nearby: ["Shops and food at Coal Drops Yard", "Granary Square fountains and canal steps", "Word on the Water, the bookshop barge", "Canal towpath walk to Camden, 25 min"],
  },
  {
    name: "Soho",
    aliases: /\b(soho|tottenham court road|piccadilly circus|chinatown|oxford circus)\b/i,
    travel: "Tottenham Court Road (Elizabeth, Central, Northern lines)",
    nearby: ["Dumplings in Chinatown", "Late espresso at Bar Italia, Frith Street", "Foyles bookshop on Charing Cross Road", "Live jazz at Ronnie Scott's"],
  },
  {
    name: "Covent Garden",
    aliases: /\b(covent garden|leicester square|seven dials)\b/i,
    travel: "Covent Garden (Piccadilly line) or Leicester Square",
    nearby: ["Street performers on the Piazza", "Seven Dials and Neal's Yard", "London Transport Museum"],
  },
  {
    name: "Camden",
    aliases: /\b(camden|chalk farm|primrose hill)\b/i,
    travel: "Camden Town (Northern line)",
    nearby: ["Street food at Camden Market", "The view from Primrose Hill, 15 min walk", "Canal walk to Little Venice", "A gig at the Roundhouse or Jazz Cafe"],
  },
  {
    name: "Hackney",
    aliases: /\b(hackney|london fields|broadway market|dalston)\b/i,
    travel: "Hackney Central or London Fields (Overground)",
    nearby: ["Broadway Market (Saturdays)", "A swim at London Fields Lido", "Canal-side bars in Hackney Wick", "Victoria Park"],
  },
  {
    name: "Victoria Park",
    aliases: /\b(victoria park|vicky park|mile end|bethnal green)\b/i,
    travel: "Mile End or Bethnal Green (Central line)",
    nearby: ["Boating lake in Victoria Park", "Pavilion Cafe by the lake", "Canal walk along the Regent's Canal"],
  },
  {
    name: "South Bank",
    aliases: /\b(south ?bank|waterloo|london eye|embankment)\b/i,
    travel: "Waterloo (Jubilee, Northern, Bakerloo lines)",
    nearby: ["Book market under Waterloo Bridge", "Tate Modern, 15 min walk along the river", "A film at BFI Southbank", "Riverside walk to Borough Market"],
  },
  {
    name: "London Bridge",
    aliases: /\b(london bridge|borough|bermondsey|the shard|tower bridge)\b/i,
    travel: "London Bridge (Jubilee, Northern lines)",
    nearby: ["Borough Market for food", "Walk across Tower Bridge", "Maltby Street Market (weekends)"],
  },
  {
    name: "Canary Wharf",
    aliases: /\b(canary wharf|docklands|isle of dogs)\b/i,
    travel: "Canary Wharf (Elizabeth line, Jubilee line, DLR)",
    nearby: ["Crossrail Place roof garden", "Museum of London Docklands", "Thames path riverside walk"],
  },
  {
    name: "Greenwich",
    aliases: /\b(greenwich|cutty sark)\b/i,
    travel: "Cutty Sark (DLR) or Greenwich (National Rail)",
    nearby: ["Royal Observatory and the meridian line", "Greenwich Market", "The view from the top of Greenwich Park", "Cutty Sark"],
  },
  {
    name: "Farringdon",
    aliases: /\b(farringdon|clerkenwell|exmouth market|smithfield|barbican)\b/i,
    travel: "Farringdon (Elizabeth line, Thameslink)",
    nearby: ["Street food on Exmouth Market", "Mail Rail at the Postal Museum", "Barbican Conservatory (check opening days)"],
  },
  {
    name: "Islington",
    aliases: /\b(islington|angel|upper street|highbury)\b/i,
    travel: "Angel (Northern line)",
    nearby: ["Pubs and food on Upper Street", "Camden Passage antiques", "Regent's Canal towpath"],
  },
  {
    name: "Brixton",
    aliases: /\b(brixton|brockwell)\b/i,
    travel: "Brixton (Victoria line)",
    nearby: ["Food at Brixton Village", "A swim at Brockwell Lido", "Pop Brixton"],
  },
  {
    name: "Peckham",
    aliases: /\b(peckham)\b/i,
    travel: "Peckham Rye (Overground)",
    nearby: ["Peckham Levels", "Frank's rooftop bar (summer only)", "Peckham Rye Park"],
  },
  {
    name: "Hyde Park",
    aliases: /\b(hyde park|marble arch|kensington gardens|serpentine|hyde park corner)\b/i,
    travel: "Marble Arch (Central) or Hyde Park Corner (Piccadilly)",
    nearby: ["Row a boat on the Serpentine", "Serpentine Gallery", "Italian Gardens in Kensington Gardens"],
  },
  {
    name: "Battersea",
    aliases: /\b(battersea)\b/i,
    travel: "Battersea Power Station (Northern line)",
    nearby: ["Lift 109 up the Power Station chimney", "Battersea Park", "Riverside walk along the Thames"],
  },
];

/** First text (in the order given) that names a known area. */
export function findArea(texts: string[]): AreaGuide | null {
  for (const t of texts) {
    const hit = AREAS.find((a) => a.aliases.test(t));
    if (hit) return hit;
  }
  return null;
}

// ───────────── parsing ─────────────

const isBot = (text: string) => text.startsWith("🤖");

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+|;\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function clip(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= MAX_LABEL ? t : `${t.slice(0, MAX_LABEL - 3).trimEnd()}...`;
}

function items(sentence: string, list: [RegExp, string][]): string[] {
  return list.filter(([re]) => re.test(sentence)).map(([, label]) => label);
}

/** Every clue in one chat message, each with the exact sentence it came from. */
export function parseMessage(m: Message): MeetTip[] {
  if (isBot(m.text)) return [];
  const out: MeetTip[] = [];
  const add = (kind: TipKind, label: string, quote: string) => out.push({ kind, label, personId: m.personId, quote });

  for (const s of sentences(m.text)) {
    const wearing = items(s, WEAR_ITEMS);
    // Clothing words like "trainers" are clear on their own; "smart" or "cap" need a verb.
    if (WEAR_VERB.test(s)) wearing.forEach((w) => add("wear", w, s));
    else items(s, WEAR_ITEMS.slice(0, 4)).forEach((w) => add("wear", w, s));

    if (BRING_VERB.test(s)) items(s, BRING_ITEMS).forEach((b) => add("bring", b, s));
    else if (/\b(umbrella|brolly|sun ?cream|sunscreen|photo id)\b/i.test(s)) items(s, BRING_ITEMS).forEach((b) => add("bring", b, s));

    if (TRAVEL.test(s)) add("travel", clip(s), s);
    if (MEETING_POINT.test(s)) add("meetingPoint", clip(s), s);
    if (WEATHER.test(s)) add("weather", clip(s), s);
    if (ACTIVITY_WHEN.test(s) && ACTIVITY_WHAT.test(s)) add("activity", clip(s), s);
  }
  return out;
}

function inferred(kind: TipKind, label: string): MeetTip {
  return { kind, label };
}

/** Same kind + label once; chat tips beat inferred ones; a few per kind. */
function tidy(tips: MeetTip[]): MeetTip[] {
  const seen = new Set<string>();
  const perKind = new Map<TipKind, number>();
  const out: MeetTip[] = [];
  for (const t of tips) {
    const k = `${t.kind}:${t.label.toLowerCase()}`;
    if (seen.has(k)) continue;
    const n = perKind.get(t.kind) ?? 0;
    if (n >= MAX_PER_KIND) continue;
    seen.add(k);
    perKind.set(t.kind, n + 1);
    out.push(t);
  }
  return out;
}

/**
 * The whole chat → practical extras for the event. `where` (the booked venue)
 * wins over chat mentions when picking the area; newer messages beat older.
 */
export function meetExtras({ messages, planTitle = "", where = "" }: { messages: Message[]; planTitle?: string; where?: string }): MeetExtras {
  const chat = messages.filter((m) => !isBot(m.text));
  const fromChat = chat.flatMap(parseMessage);

  const implied: MeetTip[] = [];
  for (const h of [...WEATHER_HINTS.filter((h) => fromChat.some((t) => t.kind === "weather" && h.match.test(t.quote ?? ""))), ...PLAN_HINTS.filter((h) => h.match.test(planTitle))]) {
    for (const [kind, label] of h.tips) implied.push(inferred(kind, label));
  }

  const area = findArea([where, ...[...chat].reverse().map((m) => m.text)]);
  if (area && !fromChat.some((t) => t.kind === "travel")) implied.push(inferred("travel", `Nearest: ${area.travel}`));

  // Order on the board: getting there, meeting, weather, kit, after.
  const order: TipKind[] = ["travel", "meetingPoint", "weather", "bring", "wear", "activity"];
  const tips = tidy([...fromChat, ...implied]).sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));

  // Things people suggested in the chat come first, then the area guide.
  const suggested = tips.filter((t) => t.kind === "activity").map((t) => t.label);
  const nearby = [...new Set([...suggested, ...(area?.nearby ?? [])])].slice(0, 4);

  return { area: area?.name ?? null, tips, nearby };
}

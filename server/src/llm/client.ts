import OpenAI from "openai";
import type { z } from "zod";

// One way to call Grok: JSON out, zod-validated, 8s timeout, one retry on
// bad JSON. Callers pass a mock to fall back to, so the demo never stalls.

const TIMEOUT_MS = Number(process.env.GROK_TIMEOUT_MS ?? 8000);

let client: OpenAI | null = null;
let mockMode = process.env.MOCK_LLM === "true";

/** Flipped by the admin mock toggle. */
export function setMockMode(on: boolean) {
  mockMode = on;
}

export function live(): boolean {
  return !mockMode && Boolean(process.env.XAI_API_KEY && process.env.GROK_MODEL);
}

function grok(): OpenAI {
  client ??= new OpenAI({ apiKey: process.env.XAI_API_KEY, baseURL: "https://api.x.ai/v1", maxRetries: 0 });
  return client;
}

const model = () => process.env.GROK_MODEL!;

export async function callGrokJSON<T>(
  name: string,
  system: string,
  user: string,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  fallback: () => T | Promise<T>,
): Promise<T> {
  if (!live()) return fallback();
  for (let attempt = 1; attempt <= 2; attempt++) {
    const started = Date.now();
    try {
      const res = await grok().chat.completions.create(
        {
          model: model(),
          response_format: { type: "json_object" },
          temperature: 0.2,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        },
        { timeout: TIMEOUT_MS },
      );
      const parsed = schema.safeParse(JSON.parse(res.choices[0]?.message?.content ?? ""));
      if (parsed.success) {
        log(name, started, "ok");
        return parsed.data;
      }
      log(name, started, `bad shape: ${parsed.error.issues[0]?.message}`);
    } catch (err) {
      log(name, started, (err as Error).message);
      if (!(err instanceof SyntaxError)) break; // timeouts and API errors: straight to the mock
    }
  }
  console.warn(`[grok] ${name}: falling back to mock`);
  return fallback();
}

/** Streams plain text; falls back to `fallback` (streamed word by word) on any failure. */
export async function streamGrok(
  name: string,
  system: string,
  user: string,
  onChunk: (t: string) => void,
  fallback: (onChunk: (t: string) => void) => Promise<string>,
): Promise<string> {
  if (!live()) return fallback(onChunk);
  const started = Date.now();
  let text = "";
  try {
    const stream = await grok().chat.completions.create(
      {
        model: model(),
        stream: true,
        temperature: 0.4,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      },
      { timeout: TIMEOUT_MS },
    );
    for await (const part of stream) {
      const t = part.choices[0]?.delta?.content ?? "";
      if (t) {
        text += t;
        onChunk(t);
      }
    }
    log(name, started, "ok");
    if (text.trim()) return text.trim();
  } catch (err) {
    log(name, started, (err as Error).message);
  }
  // Nothing streamed yet: the mock streams cleanly. Part streamed: keep it.
  return text.trim() || fallback(onChunk);
}

function log(name: string, started: number, outcome: string) {
  if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
    console.log(`[grok] ${name} ${Date.now() - started}ms ${outcome}`);
  }
}

import OpenAI from "openai";
import { z } from "zod";

const TIMEOUT_MS = 8_000;

/** A bad model result can be retried; transport errors and refusals cannot. */
export class InvalidResponse extends Error {}

function failureReason(error: unknown, timedOut: boolean): string {
  if (timedOut || error instanceof OpenAI.APIConnectionTimeoutError) return "timeout after 8000ms";
  if (error instanceof InvalidResponse || error instanceof z.ZodError || error instanceof SyntaxError) return "invalid JSON or contract data";
  if (error instanceof OpenAI.APIError) return `API HTTP ${error.status ?? "connection error"}`;
  // Never log provider response bodies, prompts, headers, or credentials.
  return error instanceof Error && error.message === "model refused" ? "model refused" : "request failed";
}

/** One wall-clock budget covers both attempts, with SDK transport retries off. */
export async function structured<T, R>(options: {
  name: string;
  schema: z.ZodType<T>;
  system: string;
  input: unknown;
  mock: boolean;
  validate: (data: T) => R;
  fallback: () => R;
}): Promise<R> {
  const label = `[Grok ${options.name}]`;
  if (options.mock) {
    console.info(`${label} mock cache`);
    return options.fallback();
  }
  const apiKey = process.env.XAI_API_KEY?.trim();
  const model = process.env.GROK_MODEL?.trim();
  if (!apiKey || !model) {
    const missing = [!apiKey && "XAI_API_KEY", !model && "GROK_MODEL"].filter(Boolean).join(", ");
    console.warn(`${label} fallback: missing ${missing}`);
    return options.fallback();
  }

  const controller = new AbortController();
  const deadline = Date.now() + TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const client = new OpenAI({ apiKey, baseURL: "https://api.x.ai/v1", timeout: TIMEOUT_MS, maxRetries: 0 });
  let failure: unknown;
  try {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: options.system },
      { role: "user", content: JSON.stringify(options.input) },
    ];
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await client.chat.completions.create({
          model,
          messages,
          response_format: {
            type: "json_schema",
            json_schema: { name: options.name, strict: true, schema: z.toJSONSchema(options.schema) },
          },
        }, { signal: controller.signal, timeout: Math.max(1, deadline - Date.now()), maxRetries: 0 });
        const choice = response.choices[0];
        if (choice?.message.refusal) throw new Error("model refused");
        if (!choice?.message.content || choice.finish_reason !== "stop") throw new InvalidResponse("incomplete response");
        const value = options.validate(options.schema.parse(JSON.parse(choice.message.content)));
        console.info(`${label} live success`);
        return value;
      } catch (error) {
        failure = error;
        const invalid = error instanceof InvalidResponse || error instanceof z.ZodError || error instanceof SyntaxError;
        if (attempt === 0 && invalid && !controller.signal.aborted && Date.now() < deadline) {
          console.warn(`${label} invalid response; retrying once`);
          messages.push({ role: "user", content: "The previous response did not satisfy the JSON schema or source references. Return corrected JSON using only the supplied people, message IDs and exact quotes." });
          continue;
        }
        break;
      }
    }
  } finally {
    clearTimeout(timer);
  }
  console.warn(`${label} fallback: ${failureReason(failure, controller.signal.aborted || Date.now() >= deadline)}`);
  return options.fallback();
}

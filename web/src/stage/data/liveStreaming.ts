import { splitWords } from "../components/useWordReveal";

const words = (text: string) => splitWords(text).join(" ");

/**
 * The streamed text to show live. It is dropped once the finished explanation is in and the
 * stream is not simply that text, which happens after a reload mid-stream: `streamed` then
 * holds only the tail of the explanation, and the full snapshot should win.
 */
export function liveStreaming(streamed: string, explanation: string): string | null {
  if (streamed === "") return null;
  if (explanation !== "" && words(streamed) !== words(explanation)) return null;
  return streamed;
}

import type { SignupValues } from "./flow";

const KEY = "deadlock.organiser";

/** Organiser details live in the browser session until the server has a field for them. */
export function loadOrganiser(): SignupValues {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return { name: "", email: "" };
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      const { name, email } = parsed as Record<string, unknown>;
      return { name: typeof name === "string" ? name : "", email: typeof email === "string" ? email : "" };
    }
  } catch {
    // storage blocked or corrupt: start empty
  }
  return { name: "", email: "" };
}

export function saveOrganiser(values: SignupValues): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(values));
  } catch {
    // storage blocked: the details just live in memory for this page
  }
}

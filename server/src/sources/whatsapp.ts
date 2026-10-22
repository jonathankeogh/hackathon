import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import os from "node:os";
import path from "node:path";

// WhatsApp as a chat source, via the local whatsapp-mcp Go bridge
// (~/whatsapp-mcp/whatsapp-bridge, API on 127.0.0.1 only). We read new rows
// from the bridge's SQLite and send through its REST API.

const API = process.env.WHATSAPP_API ?? "http://127.0.0.1:8080";
const DB =
  process.env.WHATSAPP_DB ?? path.join(os.homedir(), "whatsapp-mcp/whatsapp-bridge/store/messages.db");
const POLL_MS = Number(process.env.WHATSAPP_POLL_MS ?? 1000);
/** Recent messages pulled in when a group is picked, so the stage isn't empty. */
const BACKFILL = Number(process.env.WHATSAPP_BACKFILL ?? 30);

export type BridgeStatus =
  | { status: "offline" }
  | { status: "connecting" }
  | { status: "qr"; qr: string }
  | { status: "connected" };

export interface WaGroup {
  jid: string;
  name: string;
  size: number;
}

export interface WaMessage {
  id: string;
  sender: string; // bare user id, stable per person
  name: string;
  text: string;
  ts: number;
}

async function api<T>(route: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${route}`, { ...init, signal: AbortSignal.timeout(12_000) });
  if (!res.ok) throw new Error(`bridge ${route}: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

export async function bridgeStatus(): Promise<BridgeStatus> {
  try {
    return await api<BridgeStatus>("/api/status");
  } catch {
    return { status: "offline" };
  }
}

export const listGroups = () => api<WaGroup[]>("/api/groups");

/** New sign-up: unlink, wipe the bridge's session + synced chats, restart with a fresh QR. */
export const reset = () => api<{ ok: boolean }>("/api/reset", { method: "POST" });

/** Unlinks the device. The bridge restarts itself and serves a fresh QR. */
export const logout = () => api<{ ok: boolean }>("/api/logout", { method: "POST" });

const bare = (sender: string) => sender.split("@")[0];

/**
 * Polls the bridge DB for new messages in `jid`. Calls `onMessage` for the
 * last BACKFILL messages first, then for each new one. Returns a stop function.
 */
export function startWhatsApp(jid: string, onMessage: (m: WaMessage) => void): () => void {
  // The bridge writes while history syncs: wait for its lock instead of failing.
  const db = new DatabaseSync(DB, { readOnly: true, timeout: 5000 });
  const names = (): Map<string, string> => {
    try {
      const rows = db.prepare("SELECT sender, name FROM sender_names").all() as { sender: string; name: string }[];
      return new Map(rows.map((r) => [r.sender, r.name]));
    } catch {
      return new Map(); // table appears once the bridge sees a named sender
    }
  };

  type Row = { rowid: number; id: string; sender: string; content: string; timestamp: string; is_from_me: number };
  const toMessage = (r: Row, known: Map<string, string>, fallback: Map<string, string>): WaMessage => {
    const sender = bare(r.sender);
    let name = known.get(sender) ?? fallback.get(sender);
    if (!name) {
      name = `Member ${fallback.size + 1}`;
      fallback.set(sender, name);
    }
    return { id: r.id, sender, name, text: r.content, ts: Date.parse(r.timestamp.replace(" ", "T")) || Date.now() };
  };

  const fallback = new Map<string, string>();
  const backfill = db
    .prepare(
      `SELECT rowid, id, sender, content, timestamp, is_from_me FROM messages
       WHERE chat_jid = ? AND content <> '' ORDER BY timestamp DESC LIMIT ?`,
    )
    .all(jid, BACKFILL) as Row[];
  let last = (db.prepare("SELECT max(rowid) AS r FROM messages").get() as { r: number | null }).r ?? 0;
  const known = names();
  for (const r of backfill.reverse()) onMessage(toMessage(r, known, fallback));

  const seen = new Set(backfill.map((r) => r.id));
  const next = db.prepare(
    `SELECT rowid, id, sender, content, timestamp, is_from_me FROM messages
     WHERE rowid > ? AND chat_jid = ? AND content <> '' ORDER BY rowid`,
  );
  const timer = setInterval(() => {
    try {
      const rows = next.all(last, jid) as Row[];
      if (!rows.length) return;
      last = rows[rows.length - 1].rowid;
      const known = names();
      for (const r of rows) {
        if (seen.has(r.id)) continue; // INSERT OR REPLACE re-inserts edits
        seen.add(r.id);
        onMessage(toMessage(r, known, fallback));
      }
    } catch (err) {
      console.warn("whatsapp poll failed:", (err as Error).message);
    }
  }, POLL_MS);

  return () => {
    clearInterval(timer);
    db.close();
  };
}

/** Posts into the picked group only; never to anyone else. */
export async function sendWhatsApp(jid: string, text: string): Promise<boolean> {
  try {
    const r = await api<{ success: boolean }>("/api/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient: jid, message: text }),
    });
    return r.success;
  } catch {
    return false;
  }
}

/** Only fresh messages trigger: history synced after a sign-up must not. */
const TRIGGER_MAX_AGE_MS = 2 * 60_000;

/**
 * Watches every chat of the linked account for a message matching `trigger`
 * and calls `onTrigger` with that chat. Survives bridge resets: the DB file
 * is replaced on each sign-up, so it reopens when the file changes.
 */
export function watchTriggers(trigger: RegExp, onTrigger: (chat: { jid: string; name: string }) => void): () => void {
  let db: DatabaseSync | null = null;
  let ino = 0;
  let last = 0;

  const open = () => {
    const st = fs.statSync(DB, { throwIfNoEntry: false });
    if (!st) {
      db?.close();
      db = null;
      return;
    }
    if (db && st.ino === ino) return;
    db?.close();
    db = new DatabaseSync(DB, { readOnly: true, timeout: 5000 });
    ino = st.ino;
    last = (db.prepare("SELECT max(rowid) AS r FROM messages").get() as { r: number | null }).r ?? 0;
  };

  const timer = setInterval(() => {
    try {
      open();
      if (!db) return;
      const rows = db
        .prepare(
          `SELECT m.rowid AS rowid, m.chat_jid AS jid, m.content AS content, m.timestamp AS timestamp, c.name AS name
           FROM messages m LEFT JOIN chats c ON c.jid = m.chat_jid
           WHERE m.rowid > ? AND m.content <> '' ORDER BY m.rowid`,
        )
        .all(last) as { rowid: number; jid: string; content: string; timestamp: string; name: string | null }[];
      if (!rows.length) return;
      last = rows[rows.length - 1].rowid;
      const hit = [...rows].reverse().find((r) => {
        const ts = Date.parse(r.timestamp.replace(" ", "T"));
        return trigger.test(r.content) && Date.now() - ts < TRIGGER_MAX_AGE_MS;
      });
      if (hit) onTrigger({ jid: hit.jid, name: hit.name || hit.jid });
    } catch (err) {
      console.warn("whatsapp trigger watch failed:", (err as Error).message);
      db?.close();
      db = null; // reopen next tick
    }
  }, POLL_MS);

  return () => {
    clearInterval(timer);
    db?.close();
  };
}

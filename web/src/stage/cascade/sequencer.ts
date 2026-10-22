import type { State } from "@deadlock/shared/types";

export type DisplayStatus = "waiting" | "unlocked";

export interface CascadeSnapshot {
  displayedStatus: Readonly<Record<string, DisplayStatus>>;
  flashing: ReadonlySet<string>;
  planLit: boolean;
}

export interface CascadeHooks {
  onReveal?: (id: string) => void;
  onPlanLit?: () => void;
}

export const REVEAL_GAP_MS = 400;
export const FLASH_MS = 250;
export const ORDER_WAIT_MS = 150;
export const PLAN_DELAY_MS = 400;
/** Slack on top of the longest the cascade should take before the settle-net forces the end state. */
export const NET_MARGIN_MS = 1500;

type Phase = "idle" | "gather" | "reveal" | "planwait";
type Timer = ReturnType<typeof setTimeout>;

interface Input {
  statuses: Record<string, DisplayStatus>;
  ids: string[];
  planLit: boolean;
}

function readInput(state: State): Input {
  const statuses: Record<string, DisplayStatus> = {};
  for (const c of state.commitments) statuses[c.id] = c.status;
  const planStatus = state.plan?.status;
  return {
    statuses,
    ids: state.commitments.map((c) => c.id),
    planLit: planStatus === "viable" || planStatus === "booked",
  };
}

export function initialSnapshot(state: State): CascadeSnapshot {
  const input = readInput(state);
  return { displayedStatus: input.statuses, flashing: new Set(), planLit: input.planLit };
}

export class CascadeSequencer {
  private snap: CascadeSnapshot;
  private queue: string[] = [];
  private order: string[] | null = null;
  private ids: string[];
  private planTarget: boolean;
  private phase: Phase = "idle";
  private timer: Timer | null = null;
  private lastRevealAt = Number.NEGATIVE_INFINITY;
  private flashTimers = new Map<string, Timer>();
  private net: Timer | null = null;
  private lastInput: Input;

  constructor(
    initial: State,
    private readonly listener: (snap: CascadeSnapshot) => void,
    private readonly hooks: CascadeHooks = {},
  ) {
    this.snap = initialSnapshot(initial);
    const input = readInput(initial);
    this.lastInput = input;
    this.ids = input.ids;
    this.planTarget = input.planLit;
  }

  snapshot(): CascadeSnapshot {
    return this.snap;
  }

  update(state: State): void {
    const input = readInput(state);
    this.lastInput = input;
    this.ids = input.ids;
    this.planTarget = input.planLit;
    if (this.isReset(input)) {
      this.hardReset(input);
      return;
    }
    this.syncQueue(input);
    this.kick();
    this.syncPlan();
    this.armNet();
  }

  setOrder(order: readonly string[]): void {
    this.order = [...order];
    if (this.phase === "gather") {
      this.clearTimer();
      this.revealNext();
    }
  }

  dispose(): void {
    this.clearTimer();
    if (this.net !== null) clearTimeout(this.net);
    this.net = null;
    this.flashTimers.forEach((t) => clearTimeout(t));
    this.flashTimers.clear();
    this.queue = [];
    this.phase = "idle";
  }

  /**
   * Settle-net: whatever the timers did (a throttled tab, a dropped frame), a while after the
   * last update every lamp shows the server's status, nothing is flashing and the plan lamp
   * matches. Each update re-arms it, so the server dripping unlocks never trips it early.
   */
  private armNet(): void {
    if (this.net !== null) clearTimeout(this.net);
    const longest = (this.queue.length + 1) * REVEAL_GAP_MS + PLAN_DELAY_MS;
    this.net = setTimeout(() => this.settleNow(), longest + NET_MARGIN_MS);
  }

  private settleNow(): void {
    this.net = null;
    const input = this.lastInput;
    const shown = this.snap.displayedStatus;
    const same =
      this.snap.flashing.size === 0 &&
      this.snap.planLit === input.planLit &&
      input.ids.length === Object.keys(shown).length &&
      input.ids.every((id) => shown[id] === input.statuses[id]);
    if (same) return;
    this.clearTimer();
    this.flashTimers.forEach((t) => clearTimeout(t));
    this.flashTimers.clear();
    this.queue = [];
    this.phase = "idle";
    const litNow = input.planLit && !this.snap.planLit;
    this.emit({ displayedStatus: { ...input.statuses }, flashing: new Set(), planLit: input.planLit });
    if (litNow) this.hooks.onPlanLit?.();
  }

  private emit(next: Partial<CascadeSnapshot>): void {
    this.snap = { ...this.snap, ...next };
    this.listener(this.snap);
  }

  private clearTimer(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }

  private isReset(input: Input): boolean {
    return Object.entries(this.snap.displayedStatus).some(
      ([id, shown]) => input.statuses[id] === undefined || (shown === "unlocked" && input.statuses[id] === "waiting"),
    );
  }

  private hardReset(input: Input): void {
    this.dispose();
    this.order = null;
    this.emit({ displayedStatus: { ...input.statuses }, flashing: new Set(), planLit: input.planLit });
  }

  private syncQueue(input: Input): void {
    const shown = this.snap.displayedStatus;
    const wants = (id: string) => input.statuses[id] === "unlocked" && shown[id] !== "unlocked";
    const kept = this.queue.filter(wants);
    const fresh = input.ids.filter((id) => wants(id) && !kept.includes(id));
    this.queue = [...kept, ...fresh];
    const missing = input.ids.filter((id) => shown[id] === undefined);
    if (missing.length === 0) return;
    const added = Object.fromEntries(missing.map((id) => [id, "waiting" as const]));
    this.emit({ displayedStatus: { ...shown, ...added } });
  }

  private syncPlan(): void {
    if (this.phase === "idle") this.setPlanLit(this.planTarget);
    else if (!this.planTarget && this.snap.planLit) this.setPlanLit(false);
  }

  private setPlanLit(lit: boolean): void {
    if (lit === this.snap.planLit) return;
    this.emit({ planLit: lit });
    if (lit) this.hooks.onPlanLit?.();
  }

  private kick(): void {
    if (this.queue.length === 0) return;
    if (this.phase === "planwait") {
      this.clearTimer();
      this.phase = "reveal";
      this.timer = setTimeout(() => this.revealNext(), this.remainingGap());
    } else if (this.phase === "idle") {
      if (this.order !== null) {
        const wait = this.remainingGap();
        if (wait === 0) this.revealNext();
        else this.timer = setTimeout(() => this.revealNext(), wait);
      } else {
        this.phase = "gather";
        this.timer = setTimeout(() => this.revealNext(), ORDER_WAIT_MS);
      }
    }
  }

  /**
   * The server drips unlocks one per gap, so reveal as soon as the gap since the last
   * reveal has passed instead of adding a second full gap on top of the arrival.
   */
  private remainingGap(): number {
    return Math.max(0, REVEAL_GAP_MS - (Date.now() - this.lastRevealAt));
  }

  private sortedQueue(): string[] {
    const order = this.order ?? [];
    const rank = (id: string): number => {
      const i = order.indexOf(id);
      return i === -1 ? order.length + this.ids.indexOf(id) : i;
    };
    return [...this.queue].sort((a, b) => rank(a) - rank(b));
  }

  private revealNext(): void {
    this.timer = null;
    const [id, ...rest] = this.sortedQueue();
    if (id === undefined) {
      this.finish();
      return;
    }
    this.queue = rest;
    this.lastRevealAt = Date.now();
    this.phase = rest.length > 0 ? "reveal" : "planwait";
    this.emit({
      displayedStatus: { ...this.snap.displayedStatus, [id]: "unlocked" },
      flashing: new Set([...this.snap.flashing, id]),
    });
    this.scheduleUnflash(id);
    this.hooks.onReveal?.(id);
    const next = rest.length > 0 ? () => this.revealNext() : () => this.finish();
    this.timer = setTimeout(next, rest.length > 0 ? REVEAL_GAP_MS : PLAN_DELAY_MS);
  }

  private scheduleUnflash(id: string): void {
    const prior = this.flashTimers.get(id);
    if (prior !== undefined) clearTimeout(prior);
    this.flashTimers.set(
      id,
      setTimeout(() => {
        this.flashTimers.delete(id);
        const flashing = new Set(this.snap.flashing);
        flashing.delete(id);
        this.emit({ flashing });
      }, FLASH_MS),
    );
  }

  private finish(): void {
    this.timer = null;
    this.phase = "idle";
    this.setPlanLit(this.planTarget);
  }
}

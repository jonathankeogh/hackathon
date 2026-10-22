import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { colors } from "../tokens";
import { useReducedMotion } from "../motion/useReducedMotion";
import { normalizeText, planFlips } from "./splitFlapSequence";

export interface SplitFlapProps {
  text: string;
  length?: number;
  size?: number;
  /** Signal colour that fills every cell (letters then take the background colour). */
  fill?: string;
  stagger?: number;
  flips?: number;
}

interface Cell {
  ch: string;
  tick: number;
}

const STEP_MS = 52;
/** Slack after the last flip before the settle-net forces the final text. */
const NET_MARGIN_MS = 300;

function toCells(text: string): Cell[] {
  return Array.from(text, (ch) => ({ ch, tick: 0 }));
}

function setAt(cells: Cell[], index: number, ch: string): Cell[] {
  return cells.map((cell, i) => (i === index ? { ch, tick: cell.tick + 1 } : cell));
}

/** When the last flip of a plan has landed, in ms from the start. */
export function flipsEndMs(plans: readonly { delayMs: number; glyphs: readonly string[] }[]): number {
  return plans.reduce((end, p) => Math.max(end, p.delayMs + p.glyphs.length * STEP_MS), 0);
}

/**
 * A row of split-flap cells. A change of text flips the changed cells through a few glyphs
 * and settles on the target. Settle-net: a timer after the last flip forces the final text
 * and a plain render, so a throttled tab or a dropped frame can never leave a cell mid-flip.
 * Under reduced motion the new text is shown at once. A row is only as wide as its text
 * unless `length` pads it.
 */
export function SplitFlap({
  text,
  length,
  size = 56,
  fill,
  stagger = 25,
  flips = 6,
}: SplitFlapProps) {
  const target = normalizeText(text, length);
  const reduced = useReducedMotion();
  const [cells, setCells] = useState<Cell[]>(() => toCells(target));
  const [settled, setSettled] = useState(true);
  const shown = useRef(target);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (shown.current === target) return;
    const clear = () => {
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current = [];
    };
    clear();
    if (reduced) {
      shown.current = target;
      setCells(toCells(target));
      setSettled(true);
      return;
    }
    const prev = shown.current.padEnd(target.length, " ");
    const plans = planFlips(prev, target, stagger, flips, Math.random);
    setSettled(false);
    setCells((old) => Array.from(target, (_, i) => old[i] ?? { ch: " ", tick: 0 }));
    for (const plan of plans) {
      plan.glyphs.forEach((glyph, k) => {
        const id = window.setTimeout(() => {
          const arr = Array.from(shown.current.padEnd(target.length, " "));
          arr[plan.index] = glyph;
          shown.current = arr.join("");
          setCells((old) => setAt(old, plan.index, glyph));
        }, plan.delayMs + k * STEP_MS);
        timers.current.push(id);
      });
    }
    // any unchanged trailing difference (length shrink) settles at once
    shown.current = shown.current.slice(0, target.length);
    const net = window.setTimeout(() => {
      shown.current = target;
      setCells(toCells(target));
      setSettled(true);
    }, flipsEndMs(plans) + NET_MARGIN_MS);
    timers.current.push(net);
    return clear;
  }, [target, stagger, flips, reduced]);

  const cellW = Math.round(size * 0.66);
  const cellH = Math.round(size * 1.2);
  return (
    <span className="inline-flex gap-[3px] font-mono text-fg" aria-label={text}>
      {cells.map((cell, i) => (
        <span
          key={i}
          className="relative inline-flex items-center justify-center overflow-hidden border border-rule bg-bg"
          style={{
            width: cellW,
            height: cellH,
            fontSize: size,
            lineHeight: 1,
            ...(fill ? { background: fill, color: colors.bg } : null),
          }}
          aria-hidden
        >
          {settled ? (
            <span style={{ display: "inline-block", fontWeight: 500 }}>{cell.ch}</span>
          ) : (
            <motion.span
              key={cell.tick}
              initial={cell.tick === 0 ? false : { scaleY: 0.1 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.05, ease: "easeOut" }}
              style={{ transformOrigin: "50% 0%", display: "inline-block", fontWeight: 500 }}
            >
              {cell.ch}
            </motion.span>
          )}
          <span className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-rule" />
        </span>
      ))}
    </span>
  );
}

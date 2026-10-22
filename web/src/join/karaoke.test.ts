import { describe, expect, it } from "vitest";
import { clockText, splitWords, wordIndexAt, wordState } from "./karaoke";

describe("splitWords", () => {
  it("keeps each word's start offset in the script", () => {
    const script = "Hi  Ada, it is you";
    const words = splitWords(script);
    expect(words.map((w) => w.w)).toEqual(["Hi", "Ada,", "it", "is", "you"]);
    for (const { w, start } of words) expect(script.slice(start, start + w.length)).toBe(w);
  });
  it("handles repeated words and empty scripts", () => {
    expect(splitWords("go go go").map((w) => w.start)).toEqual([0, 3, 6]);
    expect(splitWords("   ")).toEqual([]);
  });
});

describe("wordIndexAt", () => {
  const words = splitWords("one two three");
  it("maps a boundary char index to the word being spoken", () => {
    expect(wordIndexAt(words, 0)).toBe(0);
    expect(wordIndexAt(words, 2)).toBe(0);
    expect(wordIndexAt(words, 4)).toBe(1);
    expect(wordIndexAt(words, 9)).toBe(2);
    expect(wordIndexAt(words, 999)).toBe(2);
  });
  it("is 0 for an empty list", () => {
    expect(wordIndexAt([], 5)).toBe(0);
  });
});

describe("wordState and clockText", () => {
  it("marks words done, now and next", () => {
    expect([0, 1, 2].map((i) => wordState(i, 1))).toEqual(["done", "now", "next"]);
    expect([0, 1].map((i) => wordState(i, -1))).toEqual(["next", "next"]);
  });
  it("formats the call timer", () => {
    expect(clockText(0)).toBe("00:00");
    expect(clockText(9)).toBe("00:09");
    expect(clockText(125)).toBe("02:05");
    expect(clockText(-3)).toBe("00:00");
  });
});

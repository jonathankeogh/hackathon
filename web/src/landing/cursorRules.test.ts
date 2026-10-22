import { describe, expect, it } from "vitest";
import { cursorEnabled, cursorTone, cursorVisible, follow } from "./cursorRules";

const base = { reducedMotion: false, finePointer: true, hasMoved: true, inside: true };

describe("cursor visibility", () => {
  it("shows for a mouse with motion allowed, once it has moved and while inside", () => {
    expect(cursorVisible(base)).toBe(true);
  });
  it("is hidden on touch and under reduced motion", () => {
    expect(cursorEnabled({ reducedMotion: false, finePointer: false })).toBe(false);
    expect(cursorVisible({ ...base, finePointer: false })).toBe(false);
    expect(cursorVisible({ ...base, reducedMotion: true })).toBe(false);
  });
  it("is hidden before the first move and after the pointer leaves", () => {
    expect(cursorVisible({ ...base, hasMoved: false })).toBe(false);
    expect(cursorVisible({ ...base, inside: false })).toBe(false);
  });
});

describe("cursor tone", () => {
  it("is amber over plain content and green over anything pressable", () => {
    document.body.innerHTML = '<div id="a"><p id="p">text</p></div><a id="l" href="/x"><span id="s">go</span></a><button id="b">b</button><div id="d" data-cursor="press">x</div>';
    const el = (id: string) => document.getElementById(id);
    expect(cursorTone(el("p"))).toBe("amber");
    expect(cursorTone(el("s"))).toBe("green");
    expect(cursorTone(el("b"))).toBe("green");
    expect(cursorTone(el("d"))).toBe("green");
    expect(cursorTone(null)).toBe("amber");
  });
});

describe("follow", () => {
  it("moves toward the target and lands exactly on it", () => {
    expect(follow(0, 100)).toBe(40);
    let x = 0;
    for (let i = 0; i < 40; i += 1) x = follow(x, 100);
    expect(x).toBe(100);
  });
});

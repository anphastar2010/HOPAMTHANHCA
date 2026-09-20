import { describe, expect, it } from "vitest";
import { parseAudioLinks, transposeChord, transposeText } from "../src/chords.js";

describe("transposeChord", () => {
  it("transposes natural, sharp, flat, and qualified chords", () => {
    expect(transposeChord("C", 2)).toBe("D");
    expect(transposeChord("F#m7", 1)).toBe("Gm7");
    expect(transposeChord("Bb", 2)).toBe("C");
  });

  it("leaves unrecognized text unchanged", () => {
    expect(transposeChord("N.C.", 2)).toBe("N.C.");
  });
});

describe("transposeText", () => {
  it("transposes slash chords without touching lyrics", () => {
    expect(transposeText("Lời [C/E] hát [Am7]", 2)).toBe("Lời [D/F#] hát [Bm7]");
  });
});

describe("parseAudioLinks", () => {
  it("parses labeled and unlabeled versions", () => {
    expect(parseAudioLinks("Ca đoàn|https://a.test/file ;; https://b.test/file")).toEqual([
      { label: "Ca đoàn", url: "https://a.test/file" },
      { label: "Phát audio", url: "https://b.test/file" }
    ]);
  });

  it("preserves pipes inside a URL", () => {
    expect(parseAudioLinks("Bản thu|https://a.test/x|y")[0].url).toBe("https://a.test/x|y");
  });
});

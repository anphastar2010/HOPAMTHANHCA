import { describe, expect, it } from "vitest";
import { summarizeFindings, validateLibrary, validateSong } from "../src/song-validator.js";

function song(overrides = {}) {
  return {
    id: 1,
    title: "Bài hát",
    artist: "Tác giả",
    key: "C",
    audio: "",
    sheet: "",
    content: "1. [C] Lời bài hát",
    ...overrides
  };
}

describe("validateSong", () => {
  it("accepts the current complete schema", () => {
    expect(validateSong(song())).toEqual([]);
  });

  it("reports missing required fields and empty content as errors", () => {
    const item = song({ content: "" });
    delete item.artist;
    const findings = validateSong(item);
    expect(findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ severity: "error", code: "missing-field" }),
      expect.objectContaining({ severity: "error", code: "empty-content" })
    ]));
  });

  it("reports bracket imbalance without rewriting content", () => {
    const item = song({ content: "[C] Đúng rồi G] sai" });
    expect(validateSong(item)).toContainEqual(expect.objectContaining({
      severity: "warning",
      code: "unbalanced-chord-brackets"
    }));
    expect(item.content).toBe("[C] Đúng rồi G] sai");
  });

  it("reports invalid media URLs", () => {
    const findings = validateSong(song({ audio: "Bản thu|không-phải-url", sheet: "file.pdf" }));
    expect(findings.map(item => item.code)).toEqual(expect.arrayContaining([
      "invalid-audio-url",
      "invalid-sheet-url"
    ]));
  });
});

describe("validateLibrary", () => {
  it("reports duplicate IDs and normalized titles", () => {
    const findings = validateLibrary([
      song(),
      song({ title: "  BÀI HÁT  " })
    ]);
    expect(findings.map(item => item.code)).toEqual(expect.arrayContaining([
      "duplicate-id",
      "duplicate-title"
    ]));
  });

  it("summarizes severities", () => {
    expect(summarizeFindings([
      { severity: "error" },
      { severity: "warning" },
      { severity: "warning" }
    ])).toEqual({ error: 1, warning: 2, info: 0 });
  });
});

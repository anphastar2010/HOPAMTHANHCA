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

  it("reports malformed PDF collection codes", () => {
    expect(validateSong(song({ title: "[268 TVCHH] Sai định dạng" }))).toContainEqual(expect.objectContaining({
      severity: "warning", code: "invalid-tvchh-pdf-code"
    }));
  });

  it.each(["[0] Không hợp lệ", "[121] Không hợp lệ"])("warns about main PDF code outside 1–120: %s", title => {
    expect(validateSong(song({ title }))).toContainEqual(expect.objectContaining({
      severity: "warning", code: "main-pdf-number-out-of-range"
    }));
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

  it("finds duplicate PDF codes and treats absent main numbers as information", () => {
    const findings = validateLibrary([
      song({ id: 1, title: "[1] Một" }),
      song({ id: 2, title: "[1] Một bản khác" })
    ]);
    expect(findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ severity: "error", code: "duplicate-pdf-code" }),
      expect.objectContaining({ severity: "info", code: "missing-main-pdf-number" })
    ]));
  });
});

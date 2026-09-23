import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { analyzeCanonicalNormalization, normalizeSafeContent, normalizeSafeSong, renderNormalizationMarkdown } from "../src/canonical-normalization.js";

function song(content, overrides = {}) {
  return { id: 1, title: "Bài thử", artist: "Tác giả", key: "C", audio: "", sheet: "", content, ...overrides };
}

describe("canonical normalization dry-run", () => {
  it("changes only the approved technical representations", () => {
    const source = "\uFEFF[C]Lời\r\n   \r\nDòng [Am]hai \u200B";
    const result = normalizeSafeContent(source);
    expect(result.content).toBe("[C]Lời\n\nDòng [Am]hai");
    expect(result.changes).toEqual({
      crlfToLf: 2,
      bomOrControlCharacters: 2,
      unicodeNfc: 0,
      trailingWhitespaceLines: 1,
      whitespaceOnlyLines: 1
    });
  });

  it("returns a new song and leaves the source object untouched", () => {
    const source = song("[C]Lời ");
    const before = JSON.stringify(source);
    const result = normalizeSafeSong(source);
    expect(result.candidate).not.toBe(source);
    expect(result.candidate.content).toBe("[C]Lời");
    expect(JSON.stringify(source)).toBe(before);
  });

  it("passes invariants while reporting candidates and representative diff", () => {
    const source = [song("[C]Lời "), song("1. Hát [Am]lên", { id: 2, title: "Bài hai", key: "Am" })];
    const report = analyzeCanonicalNormalization(source);
    expect(report.passed).toBe(true);
    expect(report.songsAnalyzed).toBe(2);
    expect(report.affectedSongs).toHaveLength(1);
    expect(report.changes.trailingWhitespaceLines).toBe(1);
    expect(renderNormalizationMarkdown(report)).toContain("- 1: [C]Lời␠");
    expect(renderNormalizationMarkdown(report)).toContain("+ 1: [C]Lời");
  });

  it("does not write production data when the CLI produces generated reports", () => {
    const songsBefore = fs.readFileSync("songs.js");
    const result = spawnSync(process.execPath, ["tools/dry-run-canonical-normalization.mjs"], {
      cwd: process.cwd(), encoding: "utf8"
    });
    expect(result.status).toBe(0);
    expect(fs.readFileSync("songs.js").equals(songsBefore)).toBe(true);
    const reportDirectory = path.join(process.cwd(), "reports", "canonical-normalization");
    expect(fs.existsSync(path.join(reportDirectory, "phase-2a.json"))).toBe(true);
  });
});

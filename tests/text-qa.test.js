import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import {
  analyzeTextLibrary,
  projectLyricText,
  reportExitCode,
  renderHtmlReport,
  serializeJsonReport,
  tokenizeChordLine
} from "../src/text-qa.js";
import { loadSongs } from "../tools/load-songs.mjs";

const policy = JSON.parse(fs.readFileSync("qa/text-qa-policy.json", "utf8"));
const revision = policy.datasetRevision;
const sampleSongs = JSON.parse(fs.readFileSync("tests/fixtures/text-qa/sample-songs.json", "utf8"));
const temporaryDirectories = [];

afterEach(() => temporaryDirectories.splice(0).forEach(directory => fs.rmSync(directory, { recursive: true, force: true })));

function song(content, overrides = {}) {
  return {
    id: 1,
    title: "Bài thử",
    artist: "Tác giả",
    key: "C",
    audio: "",
    sheet: "",
    content,
    ...overrides
  };
}

function analyze(songs, customPolicy = policy) {
  return analyzeTextLibrary(songs, {
    policy: customPolicy,
    datasetRevision: revision,
    generatedAt: "2026-09-20T00:00:00.000Z"
  });
}

describe("chord-aware tokenization", () => {
  it("recognizes basic, slash and extended chords without losing source offsets", () => {
    const line = "[C]Chúa [Am7]ơi [G/B]và [F#maj7]con [Bb]ơi";
    const tokens = tokenizeChordLine(line);
    expect(tokens.filter(token => token.type === "chord").map(token => token.value)).toEqual([
      "C", "Am7", "G/B", "F#maj7", "Bb"
    ]);
    const projected = projectLyricText(tokens);
    expect(projected.text).toBe("Chúa ơi và con ơi");
    expect(line[projected.sourceColumns[0]]).toBe("C");
  });

  it("does not turn chord-adjacent text into whitespace or punctuation findings", () => {
    const report = analyze([song("[C]Chúa trong[Am]lòng [G/B]ơi [C], đi")]);
    const rules = report.findings.map(item => item.ruleId);
    expect(rules).not.toContain("repeated-internal-whitespace");
    expect(rules).not.toContain("punctuation-space-before");
    expect(rules).not.toContain("punctuation-missing-space-after");
  });
});

describe("logical text rules", () => {
  it("maps whitespace findings to the original logical line and column", () => {
    const report = analyze([song("Dòng một\n  Dòng  hai ")]);
    expect(report.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ ruleId: "leading-whitespace", logicalLine: 2, column: 1 }),
      expect.objectContaining({ ruleId: "repeated-internal-whitespace", logicalLine: 2 }),
      expect.objectContaining({ ruleId: "trailing-whitespace", logicalLine: 2 })
    ]));
  });

  it("reports Vietnamese normalization and invisible characters without changing text", () => {
    const source = structuredClone(sampleSongs);
    const before = JSON.stringify(source);
    const report = analyze(source);
    expect(report.findings.map(item => item.ruleId)).toEqual(expect.arrayContaining([
      "non-nfc-text",
      "invisible-control-character"
    ]));
    expect(JSON.stringify(source)).toBe(before);
  });

  it("keeps punctuation positives narrow and ignores chorus colon/chord boundaries", () => {
    const positive = analyze([song("Con đi,sẽ về;nguyện cầu")]);
    expect(positive.findings.filter(item => item.ruleId === "punctuation-missing-space-after")).toHaveLength(2);
    const negative = analyze([song("ĐK:Chúa [C], đi [Am]ơi")]);
    expect(negative.findings.filter(item => item.ruleId.startsWith("punctuation-"))).toHaveLength(0);
    expect(negative.findings).toContainEqual(expect.objectContaining({ ruleId: "chorus-label-style-review" }));
  });

  it("keeps numbering, long lines, repeated punctuation and repeated words non-blocking", () => {
    const text = `1.Bỏ Chúa Chúa... ${"lời ".repeat(30)}`;
    const report = analyze([song(text)]);
    expect(report.findings.map(item => item.ruleId)).toEqual(expect.arrayContaining([
      "verse-number-style-review",
      "long-line-review",
      "repeated-punctuation-review",
      "repeated-word-review"
    ]));
    expect(report.hasBlockingFindings).toBe(false);
  });
});

describe("structural baseline", () => {
  it("recognizes both legacy bracket fingerprints without failing CI", () => {
    const legacy = [
      song(`${"Dòng\n".repeat(23)}Hát Gm]lên hát lên người [Cm]ơi!`, {
        id: 1781861858714,
        title: "[72] MỪNG KHEN GIÊHÔVA"
      }),
      song("Dòng\nDm]Phước cho ai nào có sự vi [A]phạm được tha [F]thứ", {
        id: 1782379312906,
        title: "[116] XIN THA THỨ"
      })
    ];
    const report = analyze(legacy);
    const brackets = report.findings.filter(item => item.ruleId === "bracket-unmatched-close");
    expect(brackets).toHaveLength(2);
    expect(brackets.every(item => item.legacy && item.severity === "warning" && !item.ciFailure)).toBe(true);
    expect(report.hasBlockingFindings).toBe(false);
  });

  it("fails a new structural regression or a changed legacy location", () => {
    const fresh = analyze([song("G]Lời mới", { id: 999 })]);
    expect(fresh.hasBlockingFindings).toBe(true);
    expect(fresh.findings).toContainEqual(expect.objectContaining({ severity: "error", ciFailure: true }));

    const moved = analyze([song("Dòng một\nDòng hai\nDm]Phước cho ai nào có sự vi [A]phạm được tha [F]thứ", {
      id: 1782379312906,
      title: "[116] XIN THA THỨ"
    })]);
    expect(moved.hasBlockingFindings).toBe(true);
  });

  it("treats missing close, empty and nested chord brackets as structural regressions", () => {
    const report = analyze([song("[C Lời\n[]\n[C[G]")]);
    expect(report.findings.map(item => item.ruleId)).toEqual(expect.arrayContaining([
      "bracket-unmatched-open",
      "chord-empty-token",
      "chord-malformed-token"
    ]));
    expect(report.hasBlockingFindings).toBe(true);
  });
});

describe("reporting and integration", () => {
  it("includes trace fields and produces valid escaped JSON and HTML", () => {
    const report = analyze([song("Dòng  lỗi", { title: "Bài <script>alert('x')</script>" })]);
    const finding = report.findings.find(item => item.ruleId === "repeated-internal-whitespace");
    expect(finding).toMatchObject({
      severity: "warning",
      songId: 1,
      songTitle: "Bài <script>alert('x')</script>",
      logicalLine: 1
    });
    expect(finding).toHaveProperty("snippet");
    expect(finding).toHaveProperty("explanation");
    expect(finding.datasetRevision).toBe(revision);
    expect(JSON.parse(serializeJsonReport(report)).findings[0].songId).toBe(1);
    const html = renderHtmlReport(report);
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>alert('x')</script>");
    expect(html).toContain("Human decision:");
    expect(reportExitCode(report)).toBe(0);
  });

  it("validates the stable calibration and 15-batch manifest", async () => {
    const manifest = JSON.parse(fs.readFileSync("qa/batches.json", "utf8"));
    expect(manifest.datasetRevision).toBe(revision);
    expect(manifest.calibration.songIds).toHaveLength(8);
    expect(manifest.batches).toHaveLength(15);
    const ids = manifest.batches.flatMap(batch => batch.songIds);
    expect(ids).toHaveLength(121);
    expect(new Set(ids).size).toBe(121);
    const songs = await loadSongs("songs.js");
    expect(new Set(ids)).toEqual(new Set(songs.map(song => song.id)));
    expect(manifest.calibration.positions).toEqual(manifest.calibration.songIds.map(id => songs.findIndex(song => song.id === id) + 1));
    let nextPosition = 1;
    for (const batch of manifest.batches) {
      expect(batch.positions.start).toBe(nextPosition);
      expect(batch.positions.end).toBe(batch.positions.start + batch.songIds.length - 1);
      expect(songs.slice(batch.positions.start - 1, batch.positions.end).map(song => song.id)).toEqual(batch.songIds);
      nextPosition = batch.positions.end + 1;
    }
    expect(nextPosition).toBe(122);
  });

  it("rejects a policy bound to another dataset revision", () => {
    expect(() => analyzeTextLibrary([song("Lời")], {
      policy: { ...policy, datasetRevision: "0".repeat(40) },
      datasetRevision: revision
    })).toThrow(/revision/);
  });

  it("CLI writes reports only to requested outputs and leaves songs.js byte-identical", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "hopam-text-qa-"));
    temporaryDirectories.push(directory);
    const jsonPath = path.join(directory, "calibration.json");
    const songsBefore = fs.readFileSync("songs.js");
    const result = spawnSync(process.execPath, ["tools/report-text-qa.mjs", "--calibration", "--json", jsonPath], {
      cwd: process.cwd(), encoding: "utf8"
    });
    expect(result.status).toBe(0);
    expect(JSON.parse(fs.readFileSync(jsonPath, "utf8")).songsAnalyzed).toBe(8);
    expect(fs.readFileSync("songs.js").equals(songsBefore)).toBe(true);
  });

  it("refuses to use songs.js as a report destination", () => {
    const songsBefore = fs.readFileSync("songs.js");
    const result = spawnSync(process.execPath, ["tools/report-text-qa.mjs", "--calibration", "--json", "songs.js"], {
      cwd: process.cwd(), encoding: "utf8"
    });
    expect(result.status).toBe(1);
    expect(fs.readFileSync("songs.js").equals(songsBefore)).toBe(true);
  });

  it("maps structural blocking state to a failing exit code", () => {
    const report = analyze([song("G]Lời mới", { id: 999 })]);
    expect(reportExitCode(report)).toBe(1);
  });
});

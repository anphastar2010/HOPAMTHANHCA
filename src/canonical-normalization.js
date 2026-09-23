import { tokenizeChordLine } from "./text-qa.js";

const REMOVABLE_INVISIBLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200D\uFEFF]/gu;

function countMatches(value, expression) {
  expression.lastIndex = 0;
  return [...value.matchAll(expression)].length;
}

function chordFingerprint(content) {
  return String(content).split("\n").flatMap(line => tokenizeChordLine(line)
    .filter(token => token.type !== "text")
    .map(token => `${token.type}:${token.raw || token.value}`));
}

function comparableLyricText(content) {
  return String(content)
    .replace(/\r\n?/gu, "\n")
    .replace(REMOVABLE_INVISIBLE, "")
    .normalize("NFC")
    .split("\n")
    .map(line => tokenizeChordLine(line).filter(token => token.type === "text").map(token => token.value).join("").replace(/[ \t]+$/u, ""))
    .join("\n");
}

function changedLines(before, after) {
  const sourceLines = String(before).split("\n");
  const candidateLines = String(after).split("\n");
  return sourceLines.flatMap((line, index) => line === candidateLines[index] ? [] : [{
    line: index + 1,
    before: line,
    after: candidateLines[index]
  }]);
}

export function normalizeSafeContent(content) {
  const source = String(content ?? "");
  const changes = {
    crlfToLf: countMatches(source, /\r\n?/gu),
    bomOrControlCharacters: 0,
    unicodeNfc: 0,
    trailingWhitespaceLines: 0,
    whitespaceOnlyLines: 0
  };
  let candidate = source.replace(/\r\n?/gu, "\n");
  changes.bomOrControlCharacters = countMatches(candidate, REMOVABLE_INVISIBLE);
  candidate = candidate.replace(REMOVABLE_INVISIBLE, "");
  const nfc = candidate.normalize("NFC");
  if (nfc !== candidate) changes.unicodeNfc = 1;
  candidate = nfc;
  candidate = candidate.split("\n").map(line => {
    if (/^[ \t]+$/u.test(line)) changes.whitespaceOnlyLines += 1;
    else if (/[ \t]+$/u.test(line)) changes.trailingWhitespaceLines += 1;
    return line.replace(/[ \t]+$/u, "");
  }).join("\n");
  return { content: candidate, changes };
}

export function normalizeSafeSong(song) {
  const result = normalizeSafeContent(song.content);
  return {
    candidate: { ...song, content: result.content },
    changes: result.changes,
    changed: result.content !== song.content
  };
}

export function analyzeCanonicalNormalization(songs) {
  const candidates = [];
  const affectedSongs = [];
  const totals = {
    crlfToLf: 0,
    bomOrControlCharacters: 0,
    unicodeNfc: 0,
    trailingWhitespaceLines: 0,
    whitespaceOnlyLines: 0
  };
  for (const song of songs) {
    const result = normalizeSafeSong(song);
    candidates.push(result.candidate);
    for (const key of Object.keys(totals)) totals[key] += result.changes[key];
    if (result.changed) affectedSongs.push({
      id: song.id,
      title: song.title,
      changes: result.changes,
      lineChanges: changedLines(song.content, result.candidate.content)
    });
  }

  const beforeContentBytes = Buffer.byteLength(songs.map(song => song.content).join("\n"), "utf8");
  const afterContentBytes = Buffer.byteLength(candidates.map(song => song.content).join("\n"), "utf8");
  const invariants = {
    songCount: songs.length === candidates.length,
    ids: JSON.stringify(songs.map(song => song.id)) === JSON.stringify(candidates.map(song => song.id)),
    titles: JSON.stringify(songs.map(song => song.title)) === JSON.stringify(candidates.map(song => song.title)),
    artists: JSON.stringify(songs.map(song => song.artist)) === JSON.stringify(candidates.map(song => song.artist)),
    keys: JSON.stringify(songs.map(song => song.key)) === JSON.stringify(candidates.map(song => song.key)),
    contentLineCount: songs.every((song, index) => song.content.split("\n").length === candidates[index].content.split("\n").length),
    nonblankLineCount: songs.every((song, index) => song.content.split("\n").filter(line => line.trim()).length === candidates[index].content.split("\n").filter(line => line.trim()).length),
    chordTokens: songs.every((song, index) => JSON.stringify(chordFingerprint(song.content)) === JSON.stringify(chordFingerprint(candidates[index].content))),
    visibleLyrics: songs.every((song, index) => comparableLyricText(song.content) === comparableLyricText(candidates[index].content))
  };
  return {
    songsAnalyzed: songs.length,
    candidateSongs: candidates.length,
    candidates,
    affectedSongs,
    changes: totals,
    bytes: { contentUtf8Before: beforeContentBytes, contentUtf8After: afterContentBytes },
    invariants,
    passed: Object.values(invariants).every(Boolean)
  };
}

function displayLine(line) {
  return line.replace(/\t/gu, "⇥").replace(/ +$/u, spaces => "␠".repeat(spaces.length));
}

export function renderNormalizationMarkdown(report) {
  const lines = [
    "# Canonical Normalization Dry-Run",
    "",
    "Generated artifact. This report is an in-memory candidate comparison; it does not write `songs.js`.",
    "",
    "## Summary",
    "",
    `- Songs analyzed / candidate songs: ${report.songsAnalyzed} / ${report.candidateSongs}`,
    `- Safe candidate songs: ${report.affectedSongs.length}`,
    `- Content UTF-8 bytes before / after: ${report.bytes.contentUtf8Before} / ${report.bytes.contentUtf8After}`,
    `- Invariants: ${report.passed ? "PASS" : "FAIL"}`,
    "",
    "| Safe operation | Count |",
    "| --- | ---: |",
    `| CRLF → LF | ${report.changes.crlfToLf} |`,
    `| BOM/control characters removed | ${report.changes.bomOrControlCharacters} |`,
    `| Unicode NFC normalizations | ${report.changes.unicodeNfc} |`,
    `| Trailing-whitespace lines | ${report.changes.trailingWhitespaceLines} |`,
    `| Whitespace-only lines made empty | ${report.changes.whitespaceOnlyLines} |`,
    "",
    "## Invariants",
    ""
  ];
  for (const [name, passed] of Object.entries(report.invariants)) lines.push(`- ${passed ? "PASS" : "FAIL"}: ${name}`);
  lines.push("", "## SAFE CANDIDATES", "");
  if (!report.affectedSongs.length) lines.push("None.");
  else for (const song of report.affectedSongs) lines.push(`- ${song.title} (ID ${song.id}): ${Object.entries(song.changes).filter(([, value]) => value).map(([key, value]) => `${key}=${value}`).join(", ")}`);
  lines.push("", "## Representative diff", "");
  const samples = report.affectedSongs.slice(0, 5);
  for (const item of samples) {
    lines.push(`### ${item.title} (ID ${item.id})`, "```diff");
    for (const change of item.lineChanges.slice(0, 5)) {
      lines.push(`- ${change.line}: ${displayLine(change.before)}`);
      lines.push(`+ ${change.line}: ${displayLine(change.after)}`);
    }
    if (item.lineChanges.length > 5) lines.push(`  … ${item.lineChanges.length - 5} more changed lines`);
    lines.push("```");
  }
  lines.push("", "## REVIEW-ONLY FINDINGS", "", "- Existing Text QA findings remain review-only; this dry-run did not normalize punctuation, labels, capitalization, repeated words, lyrics, chords, keys, titles, credits, IDs, or section structure.", "- Bracket warnings remain review-only: `[72] MỪNG KHEN GIÊHÔVA` line 24 and `[116] XIN THA THỨ` line 2.");
  return `${lines.join("\n")}\n`;
}

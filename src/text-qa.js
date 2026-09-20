const CHORD_TOKEN = /^[A-G](?:#|b)?[^\s\[\]]*(?:\/[A-G](?:#|b)?[^\s\[\]]*)?$/u;
const SEVERITIES = ["error", "warning", "info", "review"];

function hashString(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function tokenizeChordLine(line) {
  const source = String(line ?? "");
  const tokens = [];
  let cursor = 0;

  const pushText = end => {
    if (end > cursor) tokens.push({ type: "text", value: source.slice(cursor, end), start: cursor, end });
  };

  while (cursor < source.length) {
    const nextOpen = source.indexOf("[", cursor);
    const nextClose = source.indexOf("]", cursor);
    let next = -1;
    if (nextOpen < 0) next = nextClose;
    else if (nextClose < 0) next = nextOpen;
    else next = Math.min(nextOpen, nextClose);

    if (next < 0) {
      pushText(source.length);
      cursor = source.length;
      break;
    }

    pushText(next);
    cursor = next;

    if (source[cursor] === "]") {
      tokens.push({ type: "unmatched-close", value: "]", start: cursor, end: cursor + 1 });
      cursor++;
      continue;
    }

    const close = source.indexOf("]", cursor + 1);
    if (close < 0) {
      tokens.push({ type: "unmatched-open", value: source.slice(cursor), start: cursor, end: source.length });
      cursor = source.length;
      break;
    }

    const raw = source.slice(cursor, close + 1);
    const value = source.slice(cursor + 1, close).trim();
    let type = "chord";
    if (!value) type = "empty-chord";
    else if (value.includes("[") || value.includes("]")) type = "malformed-chord";
    else if (!CHORD_TOKEN.test(value)) type = "bracket-token";
    tokens.push({ type, value, raw, start: cursor, end: close + 1 });
    cursor = close + 1;
  }

  return tokens;
}

export function projectLyricText(tokens) {
  let text = "";
  const sourceColumns = [];
  for (const token of tokens) {
    if (token.type !== "text") continue;
    for (let index = 0; index < token.value.length; index++) {
      text += token.value[index];
      sourceColumns.push(token.start + index);
    }
  }
  return { text, sourceColumns };
}

export function findingFingerprint({ ruleId, songId, logicalLine, matchSignature, snippet }) {
  const signature = `${matchSignature || ""}\n${String(snippet || "").trimEnd()}`;
  return `${ruleId}|${songId}|${logicalLine}|${hashString(signature)}`;
}

function policyRule(policy, ruleId) {
  const rule = policy?.rules?.[ruleId];
  if (!rule) throw new Error(`Text QA policy thiếu rule ${ruleId}.`);
  if (!SEVERITIES.includes(rule.severity)) throw new Error(`Rule ${ruleId} có severity không hợp lệ.`);
  return rule;
}

function makeFinding(policy, ruleId, song, position, logicalLine, column, snippet, matchSignature, details = {}) {
  const rule = policyRule(policy, ruleId);
  const finding = {
    severity: rule.severity,
    ruleId,
    songId: song.id,
    songTitle: song.title,
    songPosition: position,
    logicalLine,
    column,
    snippet: String(snippet ?? ""),
    explanation: rule.explanation,
    legacy: false,
    ciFailure: false,
    ...details
  };
  finding.fingerprint = findingFingerprint({ ...finding, matchSignature });
  return finding;
}

function matches(regex, value) {
  regex.lastIndex = 0;
  return [...value.matchAll(regex)];
}

function analyzeLine(song, position, line, logicalLine, policy) {
  const findings = [];
  const tokens = tokenizeChordLine(line);
  const add = (ruleId, column, matchSignature, details = {}) => findings.push(makeFinding(
    policy, ruleId, song, position, logicalLine, column + 1, line, matchSignature, details
  ));

  for (const token of tokens) {
    if (token.type === "unmatched-close") add("bracket-unmatched-close", token.start, token.value);
    else if (token.type === "unmatched-open") add("bracket-unmatched-open", token.start, token.value);
    else if (token.type === "empty-chord") add("chord-empty-token", token.start, token.raw);
    else if (token.type === "malformed-chord") add("chord-malformed-token", token.start, token.raw);
    else if (token.type === "bracket-token") add("chord-token-review", token.start, token.raw);
  }

  if (line.trim()) {
    const trailing = line.match(/[ \t]+$/u);
    if (trailing) add("trailing-whitespace", trailing.index, trailing[0]);
    const leading = line.match(/^[ \t]+(?=\S)/u);
    if (leading) add("leading-whitespace", 0, leading[0]);
  }

  for (const token of tokens.filter(item => item.type === "text")) {
    if (token.value.trim()) {
      for (const match of matches(/[ \t]{2,}/gu, token.value)) {
        add("repeated-internal-whitespace", token.start + match.index, match[0]);
      }
    }
    for (const match of matches(/[ \t]+(?=[,;!?])/gu, token.value)) {
      add("punctuation-space-before", token.start + match.index, match[0]);
    }
    for (const match of matches(/[,;!?](?=\p{L})/gu, token.value)) {
      add("punctuation-missing-space-after", token.start + match.index, match[0]);
    }
    for (const match of matches(/\.{2,}|,{2,}|!{2,}|\?{2,}/gu, token.value)) {
      add("repeated-punctuation-review", token.start + match.index, match[0]);
    }
  }

  for (let index = 0; index < line.length; index++) {
    const value = line[index];
    const code = value.charCodeAt(0);
    if (value === "\t" || value === "\u00a0" || /[\u200B-\u200D\uFEFF]/u.test(value) || code < 32 || code === 127) {
      add("invisible-control-character", index, `U+${code.toString(16).toUpperCase().padStart(4, "0")}`);
    }
  }
  if (line.normalize("NFC") !== line) add("non-nfc-text", 0, line.normalize("NFC"));

  const projected = projectLyricText(tokens);
  const projectedColumn = index => projected.sourceColumns[index] ?? 0;
  const verse = projected.text.match(/^\s*\d+\.(?=\S)/u);
  if (verse) add("verse-number-style-review", projectedColumn(verse.index), verse[0]);
  const chorus = projected.text.match(/^\s*(?:\d+\.\s*)?(ĐK|Đk|đk|DK|Điệp\s+khúc)\s*([.:])?/iu);
  if (chorus) add("chorus-label-style-review", projectedColumn(chorus.index), chorus[0].trim());
  if (projected.text.trim().length > (policy.thresholds?.longLineCharacters ?? 100)) {
    add("long-line-review", projectedColumn(projected.text.search(/\S/u)), `${projected.text.trim().length}`);
  }
  for (const match of matches(/(?<!\p{L})(\p{L}{2,})\s+\1(?!\p{L})/giu, projected.text)) {
    add("repeated-word-review", projectedColumn(match.index), match[0]);
  }

  return findings;
}

export function analyzeSongText(song, position, policy) {
  const findings = [];
  const content = String(song.content || "");
  content.split("\n").forEach((line, index) => findings.push(...analyzeLine(song, position, line, index + 1, policy)));
  const title = String(song.title || "");
  if (/\p{L}/u.test(title) && title === title.toLocaleUpperCase("vi")) {
    findings.push(makeFinding(policy, "title-capitalization-review", song, position, 0, 1, title, title));
  }
  return findings;
}

function summarize(findings) {
  const bySeverity = Object.fromEntries(SEVERITIES.map(level => [level, 0]));
  const byRule = {};
  for (const finding of findings) {
    bySeverity[finding.severity] = (bySeverity[finding.severity] || 0) + 1;
    byRule[finding.ruleId] = (byRule[finding.ruleId] || 0) + 1;
  }
  return {
    total: findings.length,
    bySeverity,
    byRule: Object.fromEntries(Object.entries(byRule).sort(([left], [right]) => left.localeCompare(right))),
    legacy: findings.filter(item => item.legacy).length,
    blocking: findings.filter(item => item.ciFailure).length
  };
}

export function analyzeTextLibrary(library, options) {
  if (!Array.isArray(library)) throw new Error("Text QA cần một array bài hát.");
  const { policy, datasetRevision, selectedSongIds = null, scope = "full", generatedAt = new Date().toISOString() } = options || {};
  if (!policy || typeof policy !== "object") throw new Error("Thiếu Text QA policy.");
  if (policy.datasetRevision !== datasetRevision) {
    throw new Error(`Text QA policy dùng revision ${policy.datasetRevision}, dữ liệu hiện tại là ${datasetRevision}.`);
  }

  const selected = selectedSongIds ? new Set(selectedSongIds.map(String)) : null;
  if (selected) {
    const available = new Set(library.map(song => String(song.id)));
    const missing = [...selected].filter(id => !available.has(id));
    if (missing.length) throw new Error(`Manifest chứa song ID không tồn tại: ${missing.join(", ")}.`);
  }

  let findings = [];
  library.forEach((song, index) => {
    if (!selected || selected.has(String(song.id))) findings.push(...analyzeSongText(song, index + 1, policy));
  });

  const baseline = new Set(policy.structuralBaseline || []);
  findings = findings.map(finding => {
    const rule = policyRule(policy, finding.ruleId);
    if (rule.ci === "structural-regression") {
      if (baseline.has(finding.fingerprint)) {
        return { ...finding, datasetRevision, severity: "warning", legacy: true, ciFailure: false };
      }
      return { ...finding, datasetRevision, severity: "error", legacy: false, ciFailure: true };
    }
    return { ...finding, datasetRevision };
  }).sort((left, right) =>
    left.songPosition - right.songPosition ||
    left.logicalLine - right.logicalLine ||
    left.column - right.column ||
    left.ruleId.localeCompare(right.ruleId)
  );

  return {
    schemaVersion: 1,
    generatedAt,
    datasetRevision,
    scope,
    songsAnalyzed: selected ? selected.size : library.length,
    findings,
    summary: summarize(findings),
    hasBlockingFindings: findings.some(item => item.ciFailure)
  };
}

export function serializeJsonReport(report) {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export function reportExitCode(report) {
  return report?.hasBlockingFindings ? 1 : 0;
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderHtmlReport(report) {
  const groups = new Map();
  for (const finding of report.findings) {
    const key = String(finding.songId);
    if (!groups.has(key)) groups.set(key, { title: finding.songTitle, position: finding.songPosition, findings: [] });
    groups.get(key).findings.push(finding);
  }
  const cards = [...groups.values()].map(group => `
    <section class="song">
      <h2>${escapeHtml(group.position)}. ${escapeHtml(group.title)}</h2>
      ${group.findings.map(item => `
      <article class="finding ${escapeHtml(item.severity)}">
        <p><strong>${escapeHtml(item.severity.toUpperCase())}</strong> · ${escapeHtml(item.ruleId)} · ${item.logicalLine === 0 ? "Tiêu đề" : `Dòng ${escapeHtml(item.logicalLine)}`}</p>
        <pre>${escapeHtml(item.snippet)}</pre>
        <p>${escapeHtml(item.explanation)}</p>
        <p class="decision">Human decision: □ Sửa &nbsp; □ Giữ nguyên &nbsp; □ Xem lại sau</p>
        <small>ID ${escapeHtml(item.songId)} · ${escapeHtml(item.fingerprint)}${item.legacy ? " · legacy" : ""}</small>
      </article>`).join("")}
    </section>`).join("");
  const counts = SEVERITIES.map(level => `<li><strong>${report.summary.bySeverity[level] || 0}</strong> ${escapeHtml(level)}</li>`).join("");
  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>HOPAMTHANHCA Text QA</title><style>
body{font:16px system-ui;max-width:1050px;margin:auto;padding:24px;background:#f5f7fa;color:#182838}header,.song{background:#fff;border:1px solid #d9e1ea;border-radius:12px;padding:18px;margin-bottom:18px}ul{display:flex;gap:20px;flex-wrap:wrap;padding:0;list-style:none}.finding{border-left:5px solid #8090a0;padding:8px 14px;margin:12px 0}.finding.error{border-color:#b42318}.finding.warning{border-color:#b26a00}.finding.info{border-color:#1670a8}.finding.review{border-color:#6b4bb3}pre{white-space:pre-wrap;background:#f7f9fb;padding:10px;border-radius:6px}small{color:#526579}
</style></head><body><header><h1>Text QA · ${escapeHtml(report.scope)}</h1><p>Dataset revision: <code>${escapeHtml(report.datasetRevision)}</code></p><p>${escapeHtml(report.songsAnalyzed)} bài · ${escapeHtml(report.summary.total)} findings · ${escapeHtml(report.summary.blocking)} blocking</p><ul>${counts}</ul><p>Báo cáo chỉ hỗ trợ human review và không tự sửa dữ liệu.</p></header>${cards || "<p>Không có finding.</p>"}</body></html>\n`;
}

export function renderTerminalSummary(report) {
  const lines = [
    `Text QA — ${report.scope}`,
    `Revision: ${report.datasetRevision}`,
    `Đã kiểm tra: ${report.songsAnalyzed} bài`,
    `Findings: ${report.summary.total} (${SEVERITIES.map(level => `${level} ${report.summary.bySeverity[level] || 0}`).join(", ")})`,
    `Legacy structural: ${report.summary.legacy} · CI blocking: ${report.summary.blocking}`,
    "Theo rule:"
  ];
  for (const [ruleId, count] of Object.entries(report.summary.byRule)) lines.push(`- ${ruleId}: ${count}`);
  return `${lines.join("\n")}\n`;
}

import { parseAudioLinks } from "./chords.js";

const REQUIRED_FIELDS = ["id", "title", "artist", "key", "audio", "sheet", "content"];
const STANDARD_KEY = /^[A-G](?:#|b)?m?$/;

function finding(severity, code, song, message) {
  return {
    severity,
    code,
    songId: song?.id ?? null,
    title: song?.title || "(không có tiêu đề)",
    message
  };
}

function isUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizedTitle(value) {
  return String(value || "").normalize("NFC").trim().toLocaleLowerCase("vi");
}

export function validateSong(song) {
  if (!song || typeof song !== "object" || Array.isArray(song)) {
    return [finding("error", "invalid-song", null, "Mục dữ liệu không phải object bài hát.")];
  }

  const findings = [];
  for (const field of REQUIRED_FIELDS) {
    if (!(field in song)) {
      findings.push(finding("error", "missing-field", song, `Thiếu field bắt buộc: ${field}.`));
    }
  }

  if (!Number.isFinite(song.id) && typeof song.id !== "string") {
    findings.push(finding("error", "invalid-id", song, "ID phải là số hữu hạn hoặc chuỗi."));
  }
  if (!String(song.title || "").trim()) {
    findings.push(finding("error", "empty-title", song, "Tên bài không được để trống."));
  }
  if (!String(song.content || "").trim()) {
    findings.push(finding("error", "empty-content", song, "Nội dung bài không được để trống."));
  }
  if (song.key && !STANDARD_KEY.test(String(song.key).trim())) {
    findings.push(finding("warning", "nonstandard-key", song, `Tông không theo dạng chuẩn: ${song.key}.`));
  }

  const content = String(song.content || "");
  const openCount = (content.match(/\[/g) || []).length;
  const closeCount = (content.match(/\]/g) || []).length;
  if (openCount !== closeCount) {
    findings.push(finding(
      "warning",
      "unbalanced-chord-brackets",
      song,
      `Số ngoặc hợp âm không cân bằng (${openCount} '[' và ${closeCount} ']').`
    ));
  }
  if (/^\s*\d+\.(?=\S)/m.test(content)) {
    findings.push(finding("info", "verse-spacing", song, "Có số thứ tự câu hát không có khoảng trắng sau dấu chấm."));
  }

  if (song.sheet && !isUrl(String(song.sheet).trim())) {
    findings.push(finding("warning", "invalid-sheet-url", song, "Liên kết Sheet PDF không phải URL HTTP(S) hợp lệ."));
  }
  for (const audio of parseAudioLinks(song.audio)) {
    if (!isUrl(audio.url)) {
      findings.push(finding("warning", "invalid-audio-url", song, `Liên kết audio không hợp lệ: ${audio.label}.`));
    }
  }

  return findings;
}

export function validateLibrary(songs) {
  if (!Array.isArray(songs)) {
    return [finding("error", "invalid-library", null, "Thư viện phải là một array.")];
  }

  const findings = songs.flatMap(validateSong);
  const ids = new Map();
  const titles = new Map();

  for (const song of songs) {
    if (!song || typeof song !== "object") continue;
    const id = String(song.id ?? "");
    if (ids.has(id)) {
      findings.push(finding("error", "duplicate-id", song, `ID trùng với bài "${ids.get(id)}".`));
    } else {
      ids.set(id, song.title || "(không có tiêu đề)");
    }

    const title = normalizedTitle(song.title);
    if (title && titles.has(title)) {
      findings.push(finding("warning", "duplicate-title", song, `Tên bài trùng với ID ${titles.get(title)}.`));
    } else if (title) {
      titles.set(title, song.id);
    }
  }

  return findings;
}

export function summarizeFindings(findings) {
  return findings.reduce(
    (summary, item) => {
      summary[item.severity] = (summary[item.severity] || 0) + 1;
      return summary;
    },
    { error: 0, warning: 0, info: 0 }
  );
}

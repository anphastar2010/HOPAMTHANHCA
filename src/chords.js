export const PITCH_CLASSES = {
  "C": 0, "B#": 0,
  "C#": 1, "Db": 1,
  "D": 2,
  "D#": 3, "Eb": 3,
  "E": 4, "Fb": 4,
  "F": 5, "E#": 5,
  "F#": 6, "Gb": 6,
  "G": 7,
  "G#": 8, "Ab": 8,
  "A": 9,
  "A#": 10, "Bb": 10,
  "B": 11, "Cb": 11
};

// Bảng quy tắc chọn tên nốt (12 cao độ chromatic tương ứng 0..11) theo từng tông đích
// Đảm bảo tính nhất quán của bậc âm tự nhiên và các dấu hóa đặc thù (E# trong F#, Cb trong Gb)
export const KEY_SPELLINGS = {
  // Tông trưởng (Major keys)
  "C":   ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"],
  "G":   ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "Bb", "B"],
  "D":   ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
  "A":   ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
  "E":   ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
  "B":   ["C", "C#", "D", "D#", "E", "E#", "F#", "G", "G#", "A", "A#", "B"],
  "F#":  ["B#", "C#", "D", "D#", "E", "E#", "F#", "G", "G#", "A", "A#", "B"],
  "C#":  ["B#", "C#", "D", "D#", "E", "E#", "F#", "G", "G#", "A", "A#", "B"],
  "F":   ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"],
  "Bb":  ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"],
  "Eb":  ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"],
  "Ab":  ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"],
  "Db":  ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "Cb"],
  "Gb":  ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "Cb"],
  "Cb":  ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "Cb"],

  // Tông thứ (Minor keys)
  "Am":  ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "G#", "A", "Bb", "B"],
  "Em":  ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
  "Bm":  ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
  "F#m": ["C", "C#", "D", "D#", "E", "E#", "F#", "G", "G#", "A", "A#", "B"],
  "C#m": ["B#", "C#", "D", "D#", "E", "E#", "F#", "G", "G#", "A", "A#", "B"],
  "G#m": ["C", "C#", "D", "D#", "E", "E#", "F#", "G", "G#", "A", "A#", "B"],
  "D#m": ["C", "C#", "D", "D#", "E", "E#", "F#", "G", "G#", "A", "A#", "B"],
  "Dm":  ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "G#", "A", "Bb", "B"],
  "Gm":  ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"],
  "Cm":  ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"],
  "Fm":  ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"],
  "Bbm": ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "Cb"],
  "Ebm": ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "Cb"],
  "Abm": ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "Cb"]
};

// Bảng mặc định khi không truyền tông ngữ cảnh
const DEFAULT_MAJOR_SPELLING = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const DEFAULT_MINOR_SPELLING = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "G#", "A", "Bb", "B"];

const MAJOR_TONICS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const MINOR_TONICS = ["Cm", "C#m", "Dm", "Ebm", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "Bbm", "Bm"];

export function parseKey(keyStr) {
  if (!keyStr || typeof keyStr !== "string") return null;
  const trimmed = keyStr.trim();
  const match = trimmed.match(/^([A-G][b#]?)(.*)$/);
  if (!match) return null;
  const root = match[1];
  const suffix = match[2].trim();
  const isMinor = /^(m(in(or)?)?|-)$/i.test(suffix) || (suffix.startsWith("m") && !suffix.toLowerCase().startsWith("maj"));
  const pitch = PITCH_CLASSES[root];
  if (pitch === undefined) return null;
  return {
    root,
    suffix: isMinor ? "m" : suffix,
    isMinor,
    pitch,
    original: trimmed
  };
}

export function transposeKey(keyStr, step) {
  if (!keyStr || typeof keyStr !== "string") return keyStr || "C";
  const trimmed = keyStr.trim();
  if (step === 0) return trimmed;

  const parsed = parseKey(trimmed);
  if (!parsed) return trimmed;

  const targetPitch = (parsed.pitch + step + 1200) % 12;
  const isSharpSource = parsed.root.includes("#") || ["G", "D", "A", "E", "B"].includes(parsed.root);
  const isFlatSource = parsed.root.includes("b") || ["F"].includes(parsed.root);

  if (parsed.isMinor) {
    let tonic = MINOR_TONICS[targetPitch];
    if (targetPitch === 3) {
      tonic = isSharpSource ? "D#m" : "Ebm";
    } else if (targetPitch === 6) {
      tonic = "F#m";
    }
    return tonic;
  }

  let tonic = MAJOR_TONICS[targetPitch];
  if (targetPitch === 6) {
    tonic = isFlatSource ? "Gb" : "F#";
  } else if (targetPitch === 1 && isSharpSource && !["G", "D"].includes(parsed.root)) {
    tonic = "C#";
  }
  return tonic;
}

export function transposeChord(chord, step, targetKeyOrOptions) {
  if (typeof chord !== "string" || !chord) return chord;
  if (step === 0) return chord;

  const leadingWs = chord.match(/^\s*/)[0];
  const trailingWs = chord.match(/\s*$/)[0];
  const trimmed = chord.trim();

  // Xử lý hợp âm có nốt bass (/bass)
  if (trimmed.includes("/")) {
    const parts = trimmed.split("/");
    if (parts.length === 2) {
      const base = transposeChord(parts[0], step, targetKeyOrOptions);
      const bass = transposeChord(parts[1], step, targetKeyOrOptions);
      return leadingWs + base + "/" + bass + trailingWs;
    }
  }

  const match = trimmed.match(/^([A-G][b#]?)(.*)$/);
  if (!match) return chord;

  const root = match[1];
  const suffix = match[2];
  const currentPitch = PITCH_CLASSES[root];
  if (currentPitch === undefined) return chord;

  const targetPitch = (currentPitch + step + 1200) % 12;

  // Xác định tông đích để lấy bảng quy tắc nốt
  let targetKey = null;
  if (typeof targetKeyOrOptions === "string") {
    targetKey = targetKeyOrOptions.trim();
  } else if (targetKeyOrOptions && typeof targetKeyOrOptions === "object") {
    if (targetKeyOrOptions.targetKey) {
      targetKey = targetKeyOrOptions.targetKey.trim();
    } else if (targetKeyOrOptions.fromKey) {
      targetKey = transposeKey(targetKeyOrOptions.fromKey, step);
    } else if (targetKeyOrOptions.key) {
      targetKey = transposeKey(targetKeyOrOptions.key, step);
    }
  }

  let spellingTable = null;
  if (targetKey) {
    if (KEY_SPELLINGS[targetKey]) {
      spellingTable = KEY_SPELLINGS[targetKey];
    } else {
      const parsedKey = parseKey(targetKey);
      if (parsedKey) {
        const canonicalKey = parsedKey.isMinor ? (parsedKey.root + "m") : parsedKey.root;
        if (KEY_SPELLINGS[canonicalKey]) {
          spellingTable = KEY_SPELLINGS[canonicalKey];
        }
      }
    }
  }

  if (!spellingTable) {
    const isMinorChord = suffix.startsWith("m") && !suffix.toLowerCase().startsWith("maj");
    spellingTable = isMinorChord ? DEFAULT_MINOR_SPELLING : DEFAULT_MAJOR_SPELLING;
  }

  const newRoot = spellingTable[targetPitch];
  return leadingWs + newRoot + suffix + trailingWs;
}

export function transposeText(text, step, targetKeyOrOptions) {
  if (typeof text !== "string" || !text) return text || "";
  if (step === 0) return text;

  return text.replace(/\[([^\]]+)\]/g, (fullMatch, chordContent) => {
    return "[" + transposeChord(chordContent, step, targetKeyOrOptions) + "]";
  });
}

export function parseAudioLinks(value) {
  return (value || "")
    .split(";;")
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => {
      const parts = item.split("|");
      return {
        label: parts.length > 1 ? parts[0].trim() : "Phát audio",
        url: (parts.length > 1 ? parts.slice(1).join("|") : parts[0]).trim()
      };
    });
}

import { describe, expect, it } from "vitest";
import {
  parseAudioLinks,
  transposeChord,
  transposeText,
  transposeKey,
  parseKey,
  KEY_SPELLINGS,
  PITCH_CLASSES
} from "../src/chords.js";

describe("transposeChord (legacy compatibility)", () => {
  it("transposes natural, sharp, flat, and qualified chords", () => {
    expect(transposeChord("C", 2)).toBe("D");
    expect(transposeChord("F#m7", 1)).toBe("Gm7");
    expect(transposeChord("Bb", 2)).toBe("C");
  });

  it("leaves unrecognized text unchanged", () => {
    expect(transposeChord("N.C.", 2)).toBe("N.C.");
  });
});

describe("transposeText (legacy compatibility)", () => {
  it("transposes slash chords without touching lyrics", () => {
    expect(transposeText("Lời [C/E] hát [Am7]", 2)).toBe("Lời [D/F#] hát [Bm7]");
  });
});

describe("Context-aware transposition (Yêu cầu & Kiểm thử tối thiểu)", () => {
  it("Eb, bước 0 → Eb; [Eb][Ab][Bb/D] giữ nguyên không bị ép thành D# hay A#", () => {
    expect(transposeKey("Eb", 0)).toBe("Eb");
    expect(transposeChord("Eb", 0)).toBe("Eb");
    expect(transposeChord("Ab", 0)).toBe("Ab");
    expect(transposeChord("Bb/D", 0)).toBe("Bb/D");
    expect(transposeText("[Eb][Ab][Bb/D]", 0)).toBe("[Eb][Ab][Bb/D]");
  });

  it("C trưởng lên 3 bán âm, chọn tông đích Eb: [C][F][G/B] → [Eb][Ab][Bb/D]", () => {
    const targetKey = transposeKey("C", 3);
    expect(targetKey).toBe("Eb");
    expect(transposeChord("C", 3, "Eb")).toBe("Eb");
    expect(transposeChord("F", 3, "Eb")).toBe("Ab");
    expect(transposeChord("G/B", 3, "Eb")).toBe("Bb/D");
    expect(transposeText("[C][F][G/B]", 3, "Eb")).toBe("[Eb][Ab][Bb/D]");
  });

  it("Nhận diện đúng tông thứ và cách viết nốt trong F# trưởng/Gb trưởng", () => {
    // Nhận diện cấu trúc tông
    expect(parseKey("F#")).toMatchObject({ root: "F#", isMinor: false });
    expect(parseKey("Gb")).toMatchObject({ root: "Gb", isMinor: false });
    expect(parseKey("F#m")).toMatchObject({ root: "F#", isMinor: true });
    expect(parseKey("Ebm")).toMatchObject({ root: "Eb", isMinor: true });
    expect(parseKey("D#m")).toMatchObject({ root: "D#", isMinor: true });

    // F# trưởng cần E# (bậc 7 dẫn âm) thay vì F
    expect(transposeChord("B", 6, "F#")).toBe("E#");
    expect(transposeChord("D/F#", -1, "F#")).toBe("C#/E#");
    expect(transposeText("[F#][B][C#/E#]", 0, "F#")).toBe("[F#][B][C#/E#]");

    // Gb trưởng cần Cb (bậc 4) thay vì B
    expect(transposeChord("F", 6, "Gb")).toBe("Cb");
    expect(transposeText("[C][F][G]", 6, "Gb")).toBe("[Gb][Cb][Db]");

    // Tông thứ: D#m có E#, Ebm có Cb
    expect(transposeChord("B", 6, "D#m")).toBe("E#");
    expect(transposeChord("F", 6, "Ebm")).toBe("Cb");
  });

  it("Tăng tông rồi trở về bước 0 (Gốc) phục hồi đúng cách viết ban đầu", () => {
    const originalKey = "Eb";
    const originalContent = "Điệp khúc: [Ebmaj7] ngợi khen [Ab] danh [Bb/D] Chúa";

    // Tăng 2 bán âm lên F
    const stepUpKey = transposeKey(originalKey, 2);
    expect(stepUpKey).toBe("F");
    const stepUpContent = transposeText(originalContent, 2, stepUpKey);
    expect(stepUpContent).toBe("Điệp khúc: [Fmaj7] ngợi khen [Bb] danh [C/E] Chúa");

    // Về 0 (Gốc)
    const resetKey = transposeKey(originalKey, 0);
    expect(resetKey).toBe("Eb");
    const resetContent = transposeText(originalContent, 0, resetKey);
    expect(resetContent).toBe(originalContent);
  });

  it("Bảo toàn mọi hậu tố hợp âm phức tạp (m, maj7, sus4, dim, add9, b5, #11) và nốt bass", () => {
    const complex = "[Cmaj7] [Dsus4] [Edim] [Fadd9] [Am7b5] [Gmaj7#11] [Bb/D]";
    // Chuyển C lên 3 bán âm sang Eb
    const result = transposeText(complex, 3, "Eb");
    expect(result).toBe("[Ebmaj7] [Fsus4] [Gdim] [Abadd9] [Cm7b5] [Bbmaj7#11] [Db/F]");
  });

  it("Không tự quy đổi nốt giáng sang thăng khi step = 0 đối với các tông phổ biến", () => {
    expect(transposeKey("Bb", 0)).toBe("Bb");
    expect(transposeKey("Ab", 0)).toBe("Ab");
    expect(transposeKey("Db", 0)).toBe("Db");
    expect(transposeKey("Bbm", 0)).toBe("Bbm");
    expect(transposeKey("D#", 0)).toBe("D#");
  });
});

describe("Kiểm thử bất biến cao độ (Pitch Class Invariant) cho toàn bộ KEY_SPELLINGS", () => {
  it("Mỗi tên nốt tại index i trong mọi bảng tông phải quy đổi lại đúng pitch class i", () => {
    for (const [key, spelling] of Object.entries(KEY_SPELLINGS)) {
      expect(spelling).toHaveLength(12);
      for (let i = 0; i < 12; i++) {
        const note = spelling[i];
        expect(PITCH_CLASSES[note], `Lệch cao độ tại KEY_SPELLINGS["${key}"][${i}] = "${note}"`).toBe(i);
      }
    }
  });

  it("Kiểm tra bất biến cao độ cho cả gốc hợp âm và nốt bass sau dấu /", () => {
    const allKeys = Object.keys(KEY_SPELLINGS);
    for (const key of allKeys) {
      for (let step = -12; step <= 12; step++) {
        // Hợp âm slash: C/E (gốc C pitch 0, bass E pitch 4)
        const transposedSlash = transposeChord("C/E", step, key);
        const [rootPart, bassPart] = transposedSlash.split("/");

        const expectedRootPitch = (0 + step + 1200) % 12;
        const expectedBassPitch = (4 + step + 1200) % 12;

        const actualRoot = rootPart.match(/^([A-G][b#]?)/)[1];
        const actualBass = bassPart.match(/^([A-G][b#]?)/)[1];

        expect(PITCH_CLASSES[actualRoot], `Lỗi pitch class gốc hợp âm trong tông ${key} bước ${step}`).toBe(expectedRootPitch);
        expect(PITCH_CLASSES[actualBass], `Lỗi pitch class nốt bass trong tông ${key} bước ${step}`).toBe(expectedBassPitch);
      }
    }
  });
});

describe("Kiểm thử toàn diện mọi tông đích của transposeKey", () => {
  it("Mọi tông đích mà transposeKey có thể trả về đều tồn tại trong KEY_SPELLINGS và không trả về Gbm", () => {
    const sourceKeys = Object.keys(KEY_SPELLINGS);
    for (const sourceKey of sourceKeys) {
      for (let step = -24; step <= 24; step++) {
        const target = transposeKey(sourceKey, step);
        expect(typeof target).toBe("string");
        expect(target).not.toBe("Gbm");
        expect(KEY_SPELLINGS, `Tông đích "${target}" từ nguồn "${sourceKey}" bước ${step} không có trong KEY_SPELLINGS`).toHaveProperty(target);
      }
    }
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

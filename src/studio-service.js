import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { applyChangeset } from "./changesets.js";
import { summarizeFindings, validateLibrary } from "./song-validator.js";
import { analyzeTextLibrary } from "./text-qa.js";

// In-process lock / queue for serializing library updates and restores
let updateLock = Promise.resolve();
export function withUpdateLock(fn) {
  const next = updateLock.then(fn, fn);
  updateLock = next.catch(() => {});
  return next;
}

// In-process lock / queue for serializing draft reads, checks, writes, and deletions
let draftLock = Promise.resolve();
export function withDraftLock(fn) {
  const next = draftLock.then(fn, fn);
  draftLock = next.catch(() => {});
  return next;
}

export function computeLibraryHash(source) {
  return crypto.createHash("sha256").update(source).digest("hex");
}

export function getSafeOrigins(port) {
  return new Set([
    `http://127.0.0.1:${port}`,
    `http://localhost:${port}`,
    `http://[::1]:${port}`,
    `https://127.0.0.1:${port}`,
    `https://localhost:${port}`
  ]);
}

export function isAllowedHost(host, port) {
  if (!host) return false;
  const cleanHost = host.trim().toLowerCase();
  return (
    cleanHost === `127.0.0.1:${port}` ||
    cleanHost === `localhost:${port}` ||
    cleanHost === "127.0.0.1" ||
    cleanHost === "localhost"
  );
}

export function isAllowedOrigin(origin, port) {
  if (!origin) return false;
  const clean = origin.trim().toLowerCase();
  const allowed = getSafeOrigins(port);
  return allowed.has(clean);
}

export async function ensureStudioDirs(rootDir) {
  const studioDir = path.join(rootDir, ".studio");
  const draftsDir = path.join(studioDir, "drafts");
  const backupsDir = path.join(studioDir, "backups");
  await fs.mkdir(draftsDir, { recursive: true });
  await fs.mkdir(backupsDir, { recursive: true });
  return { studioDir, draftsDir, backupsDir };
}

export async function readSongsFromDisk(rootDir) {
  const songsPath = path.join(rootDir, "songs.js");
  const source = await fs.readFile(songsPath, "utf8");
  const match = source.match(/const\s+songs\s*=\s*(\[[\s\S]*\])\s*;?\s*$/);
  if (!match) throw new Error("Không thể phân tích mảng bài hát từ songs.js.");
  const songs = JSON.parse(match[1]);
  const hash = computeLibraryHash(source);
  return { songs, source, hash, path: songsPath };
}

export async function readCurrentRevision(rootDir) {
  try {
    const revPath = path.join(rootDir, "data-revision.js");
    const source = await fs.readFile(revPath, "utf8");
    const match = source.match(/HOPAM_DATA_REVISION\s*=\s*["']([0-9a-f]+)["']/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export async function getDraft(rootDir) {
  return withDraftLock(async () => {
    const { draftsDir } = await ensureStudioDirs(rootDir);
    const draftFile = path.join(draftsDir, "draft.json");
    try {
      const content = await fs.readFile(draftFile, "utf8");
      const parsed = JSON.parse(content);
      // If draft is an empty/tombstone record with no active content
      const hasContent = Boolean(
        parsed.song ||
        (parsed.changes && parsed.changes.length > 0) ||
        (parsed.songForms && Object.keys(parsed.songForms).length > 0)
      );
      return {
        ...parsed,
        hasContent
      };
    } catch (error) {
      if (error.code === "ENOENT") return null;
      throw error;
    }
  });
}

export async function saveDraft(rootDir, draftData) {
  if (!draftData || typeof draftData !== "object") {
    throw new Error("Dữ liệu bản nháp không hợp lệ.");
  }

  return withDraftLock(async () => {
    const { draftsDir } = await ensureStudioDirs(rootDir);
    const draftFile = path.join(draftsDir, "draft.json");

    // Read current draft under lock
    let existingDraft = null;
    try {
      const raw = await fs.readFile(draftFile, "utf8");
      existingDraft = JSON.parse(raw);
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
    }

    const currentRev = typeof existingDraft?.draftRevision === "number" ? existingDraft.draftRevision : 0;
    const clientExpectedRev = typeof draftData.expectedDraftRevision === "number"
      ? draftData.expectedDraftRevision
      : (existingDraft ? null : 0);

    // Strict equality check on draft revision
    if (clientExpectedRev === null || clientExpectedRev !== currentRev) {
      const conflict = new Error(
        `Bản nháp đã bị thay đổi bởi phiên làm việc khác (phiên bản máy chủ là ${currentRev}, phiên bản client gửi là ${clientExpectedRev ?? "không xác định"}). Vui lòng tải lại trước khi ghi.`
      );
      conflict.statusCode = 409;
      conflict.code = "DRAFT_CONFLICT";
      conflict.serverRevision = currentRev;
      conflict.serverDraft = existingDraft;
      throw conflict;
    }

    // Capture baseLibraryHash if not explicitly provided
    let baseLibraryHash = draftData.baseLibraryHash;
    if (!baseLibraryHash) {
      try {
        const { hash } = await readSongsFromDisk(rootDir);
        baseLibraryHash = hash;
      } catch {
        baseLibraryHash = null;
      }
    }

    const nextRevision = currentRev + 1;
    const tempFile = path.join(draftsDir, `draft-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`);
    const record = {
      ...draftData,
      baseLibraryHash,
      draftRevision: nextRevision,
      updatedAt: new Date().toISOString()
    };

    await fs.writeFile(tempFile, JSON.stringify(record, null, 2), "utf8");
    await fs.rename(tempFile, draftFile);
    return record;
  });
}

export async function deleteDraft(rootDir, expectedDraftRevision) {
  if (typeof expectedDraftRevision !== "number" || isNaN(expectedDraftRevision)) {
    const error = new Error("Yêu cầu xóa nháp bắt buộc phải có expectedDraftRevision hợp lệ.");
    error.statusCode = 400;
    error.code = "INVALID_DRAFT_REVISION";
    throw error;
  }

  return withDraftLock(async () => {
    const { draftsDir } = await ensureStudioDirs(rootDir);
    const draftFile = path.join(draftsDir, "draft.json");

    let existingDraft = null;
    try {
      const raw = await fs.readFile(draftFile, "utf8");
      existingDraft = JSON.parse(raw);
    } catch (err) {
      if (err.code === "ENOENT") return false;
      throw err;
    }

    const currentRev = typeof existingDraft?.draftRevision === "number" ? existingDraft.draftRevision : 0;
    if (expectedDraftRevision !== currentRev) {
      const conflict = new Error(
        `Bản nháp đã được lưu phiên bản mới hơn từ tab khác (phiên bản hiện tại là ${currentRev}, yêu cầu xóa là ${expectedDraftRevision}). Từ chối xóa nháp.`
      );
      conflict.statusCode = 409;
      conflict.code = "DRAFT_CONFLICT";
      conflict.serverRevision = currentRev;
      throw conflict;
    }

    // Advance revision to maintain persistent generation and reset content
    const nextRevision = currentRev + 1;
    const cleanRecord = {
      draftRevision: nextRevision,
      baseLibraryHash: existingDraft?.baseLibraryHash || null,
      activeSongId: null,
      song: null,
      songForms: {},
      changes: [],
      updatedAt: new Date().toISOString()
    };

    const tempFile = path.join(draftsDir, `draft-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`);
    await fs.writeFile(tempFile, JSON.stringify(cleanRecord, null, 2), "utf8");
    await fs.rename(tempFile, draftFile);
    return { ok: true, deleted: true, newDraftRevision: nextRevision };
  });
}

export function computeDetailedFieldDiff(oldSong, newSong) {
  const fields = [
    { key: "title", label: "Tiêu đề" },
    { key: "artist", label: "Tác giả" },
    { key: "key", label: "Điệu / Tông" },
    { key: "audio", label: "Audio URL" },
    { key: "sheet", label: "Sheet URL" }
  ];

  const fieldChanges = [];
  for (const { key, label } of fields) {
    const oldVal = oldSong ? String(oldSong[key] || "") : "";
    const newVal = newSong ? String(newSong[key] || "") : "";
    if (oldVal !== newVal) {
      fieldChanges.push({ field: key, label, oldValue: oldVal, newValue: newVal });
    }
  }

  // Compare chords and lyrics content
  const oldContent = oldSong ? String(oldSong.content || "").replace(/\r\n/g, "\n") : "";
  const newContent = newSong ? String(newSong.content || "").replace(/\r\n/g, "\n") : "";
  const contentChanged = oldContent !== newContent;

  // Provenance metadata
  const sourceUrl = newSong?.sourceUrl || oldSong?.sourceUrl || "";
  const importedAt = newSong?.importedAt || oldSong?.importedAt || "";

  return {
    fieldChanges,
    contentChanged,
    oldContent,
    newContent,
    sourceUrl,
    importedAt
  };
}

export async function computeDiff(rootDir, { changes, baseRevision, baseLibraryHash }) {
  if (!Array.isArray(changes)) throw new Error("Thiếu danh sách changes.");
  const { songs: currentSongs, hash: currentLibraryHash } = await readSongsFromDisk(rootDir);
  const currentRevision = await readCurrentRevision(rootDir);

  const changeset = {
    author: "Studio",
    baseCommit: baseRevision || currentRevision,
    exportedAt: new Date().toISOString(),
    changes
  };

  const { songs: newSongs, risks } = applyChangeset(currentSongs, changeset, currentRevision);
  const findings = validateLibrary(newSongs);
  const summary = summarizeFindings(findings);

  const staleBase = Boolean(baseLibraryHash && baseLibraryHash !== currentLibraryHash);
  if (staleBase) {
    risks.push({
      index: -1,
      code: "library-content-changed",
      message: `Nội dung songs.js trên đĩa đã thay đổi ngoài dự kiến so với lúc bắt đầu chỉnh sửa (hash gốc: ${baseLibraryHash.slice(0, 8)}, hash hiện tại: ${currentLibraryHash.slice(0, 8)}).`
    });
  }

  // Aggregate final diff per song ID from baseline to final applied state
  const affectedIds = new Set();
  for (const c of changes) {
    const sid = c.op === "delete" ? (c.songId || c.song?.id) : c.song?.id;
    if (sid != null) affectedIds.add(String(sid));
  }

  const detailedDiff = [];
  for (const targetId of affectedIds) {
    const oldSong = currentSongs.find(s => String(s.id) === String(targetId));
    const newSong = newSongs.find(s => String(s.id) === String(targetId));

    let op = "update";
    if (!oldSong && newSong) op = "create";
    else if (oldSong && !newSong) op = "delete";

    const diff = computeDetailedFieldDiff(oldSong, newSong);

    detailedDiff.push({
      op,
      id: Number(targetId) || targetId,
      title: newSong?.title || oldSong?.title || `ID ${targetId}`,
      fieldChanges: diff.fieldChanges,
      contentChanged: diff.contentChanged,
      oldContent: diff.oldContent,
      newContent: diff.newContent,
      sourceUrl: diff.sourceUrl,
      importedAt: diff.importedAt
    });
  }

  const changeSummary = detailedDiff.map(d => ({
    op: d.op,
    id: d.id,
    title: d.title,
    fieldChangeCount: d.fieldChanges.length + (d.contentChanged ? 1 : 0)
  }));

  // Generate unique review token binding exact changes with current library hash and preview target
  const newSongsSerialized = JSON.stringify(newSongs);
  const newSongsHash = computeLibraryHash(newSongsSerialized);
  const reviewPayload = JSON.stringify({
    baseLibraryHash: currentLibraryHash,
    changes,
    newSongsHash
  });
  const reviewToken = crypto.createHash("sha256").update(reviewPayload).digest("hex");

  return {
    beforeCount: currentSongs.length,
    afterCount: newSongs.length,
    risks,
    summary,
    hasErrors: summary.error > 0,
    changeSummary,
    detailedDiff,
    currentRevision,
    currentLibraryHash,
    staleBase,
    reviewToken
  };
}

export async function updateLibrary(rootDir, {
  changes,
  expectedRevision,
  baseLibraryHash,
  expectedLibraryHash,
  reviewToken,
  expectedDraftRevision,
  remainingDraft = null,
  author = "Studio",
  _simulateDraftWriteError = false
}) {
  if (!Array.isArray(changes) || changes.length === 0) {
    throw new Error("Không có thay đổi nào để cập nhật vào thư viện.");
  }

  return withUpdateLock(async () => {
    // 1. Re-read songs.js and compute fresh hash right before writing
    const { songs: currentSongs, hash: currentLibraryHash, path: songsPath } = await readSongsFromDisk(rootDir);
    const currentRevision = await readCurrentRevision(rootDir);

    // 2. Strict concurrency checks: library baseline hash
    if (!expectedLibraryHash && !baseLibraryHash) {
      const error = new Error("Thiếu mốc hash thư viện (baseLibraryHash / expectedLibraryHash) để kiểm tra xung đột.");
      error.statusCode = 400;
      throw error;
    }

    if (baseLibraryHash && baseLibraryHash !== currentLibraryHash) {
      const error = new Error(
        `Nội dung songs.js trên đĩa đã bị thay đổi bên ngoài kể từ khi bắt đầu chỉnh sửa (mốc gốc: ${baseLibraryHash.slice(0, 8)}, hiện tại: ${currentLibraryHash.slice(0, 8)}). Vui lòng tải lại thư viện.`
      );
      error.statusCode = 409;
      error.code = "STALE_BASE_CONFLICT";
      throw error;
    }

    if (expectedLibraryHash && expectedLibraryHash !== currentLibraryHash) {
      const error = new Error(
        `Nội dung songs.js trên đĩa đã bị thay đổi ngoài dự kiến (hash không khớp: ${currentLibraryHash.slice(0, 8)}). Vui lòng xem trước lại diff.`
      );
      error.statusCode = 409;
      error.code = "LIBRARY_CONTENT_CONFLICT";
      throw error;
    }

    // 3. Concurrency check: git revision
    if (expectedRevision && currentRevision && expectedRevision !== currentRevision) {
      const error = new Error(
        `Thư viện đã thay đổi từ revision ${expectedRevision} sang ${currentRevision}. Hãy xem lại diff trước khi ghi đè.`
      );
      error.statusCode = 409;
      error.code = "CONCURRENCY_CONFLICT";
      throw error;
    }

    const changeset = {
      author: String(author || "Studio").trim(),
      baseCommit: expectedRevision || currentRevision,
      exportedAt: new Date().toISOString(),
      changes
    };

    const { songs: newSongs, risks } = applyChangeset(currentSongs, changeset, currentRevision);

    // 4. Structural validation
    const findings = validateLibrary(newSongs);
    const summary = summarizeFindings(findings);
    if (summary.error > 0) {
      const errorFindings = findings.filter(f => f.severity === "error").map(f => f.message).join("; ");
      const error = new Error(`Dữ liệu không hợp lệ cấu trúc, từ chối ghi thư viện: ${errorFindings}`);
      error.statusCode = 400;
      error.code = "VALIDATION_FAILED";
      error.findings = findings;
      throw error;
    }

    // 5. Review Token Verification (binds confirmation to exact reviewed diff)
    if (!reviewToken) {
      const error = new Error("Thiếu mã xác nhận xem trước (reviewToken). Vui lòng xem trước thay đổi trước khi cập nhật.");
      error.statusCode = 400;
      throw error;
    }
    const newSongsSerialized = JSON.stringify(newSongs);
    const newSongsHash = computeLibraryHash(newSongsSerialized);
    const expectedReviewPayload = JSON.stringify({
      baseLibraryHash: currentLibraryHash,
      changes,
      newSongsHash
    });
    const expectedToken = crypto.createHash("sha256").update(expectedReviewPayload).digest("hex");
    if (reviewToken !== expectedToken) {
      const error = new Error("Nội dung thay đổi không khớp với bản đã xem trước (reviewToken lệch). Vui lòng xem trước lại thay đổi trước khi ghi.");
      error.statusCode = 409;
      error.code = "REVIEW_TOKEN_MISMATCH";
      throw error;
    }

    // 6. Text QA validation - DO NOT swallow errors!
    const policyPath = path.join(rootDir, "qa", "text-qa-policy.json");
    let policySource;
    try {
      policySource = await fs.readFile(policyPath, "utf8");
    } catch (readErr) {
      const error = new Error(`Không thể đọc tệp chính sách Text QA (qa/text-qa-policy.json): ${readErr.message}`);
      error.statusCode = 500;
      error.code = "TEXT_QA_POLICY_READ_ERROR";
      throw error;
    }

    let policy;
    try {
      policy = JSON.parse(policySource);
    } catch (parseErr) {
      const error = new Error(`Tệp chính sách Text QA bị lỗi cú pháp JSON: ${parseErr.message}`);
      error.statusCode = 500;
      error.code = "TEXT_QA_POLICY_PARSE_ERROR";
      throw error;
    }

    let qaReport;
    try {
      qaReport = analyzeTextLibrary(newSongs, {
        policy,
        datasetRevision: policy.datasetRevision,
        scope: "studio-prewrite"
      });
    } catch (engineErr) {
      const error = new Error(`Lỗi engine phân tích Text QA: ${engineErr.message}`);
      error.statusCode = 500;
      error.code = "TEXT_QA_ENGINE_ERROR";
      throw error;
    }

    if (qaReport.hasBlockingFindings) {
      const error = new Error("Dữ liệu vi phạm chính sách Text QA (phát hiện lỗi chặn mới).");
      error.statusCode = 400;
      error.code = "TEXT_QA_FAILED";
      error.findings = qaReport.findings.filter(f => f.ciFailure);
      throw error;
    }

    // 7. Create safety backup before writing
    const { backupsDir, studioDir } = await ensureStudioDirs(rootDir);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFileName = `songs-backup-${timestamp}-${currentLibraryHash.slice(0, 8)}.js`;
    const backupPath = path.join(backupsDir, backupFileName);
    await fs.copyFile(songsPath, backupPath);

    // 8. Atomic write to songs.js
    const tempPath = path.join(studioDir, `songs-${Date.now()}.tmp`);
    const newContent = `const songs = ${JSON.stringify(newSongs, null, 2)};\n`;
    await fs.writeFile(tempPath, newContent, "utf8");
    await fs.rename(tempPath, songsPath);

    const newLibraryHash = computeLibraryHash(newContent);

    // 9. Coordinate Draft Persistence & Safe Cleanup
    let draftCleared = false;
    let draftWarning = null;
    let newDraftRevision = null;
    let actualDraftRevision = null;
    let draftSaved = true;
    let draftConflict = false;
    let draftConflictCode = null;
    let draftError = null;
    let tempDraft = null;

    try {
      await withDraftLock(async () => {
        const { draftsDir } = await ensureStudioDirs(rootDir);
        const draftFile = path.join(draftsDir, "draft.json");

        let diskDraft = null;
        try {
          const raw = await fs.readFile(draftFile, "utf8");
          diskDraft = JSON.parse(raw);
        } catch (err) {
          if (err.code !== "ENOENT") throw err;
        }

        const diskRev = typeof diskDraft?.draftRevision === "number" ? diskDraft.draftRevision : 0;
        actualDraftRevision = diskRev;

        // If client supplied expectedDraftRevision, ensure it matches current disk revision
        if (typeof expectedDraftRevision === "number" && expectedDraftRevision !== diskRev) {
          draftSaved = false;
          draftConflict = true;
          draftConflictCode = "DRAFT_REVISION_CONFLICT";
          draftCleared = false;
          newDraftRevision = null; // Tuyệt đối KHÔNG cấp revision mới của tab khác cho client cũ để tiếp tục ghi!
          actualDraftRevision = diskRev;
          draftWarning = `Thư viện songs.js đã được cập nhật thành công, nhưng bản nháp trên đĩa thuộc về một phiên làm việc khác (phiên bản trên đĩa: ${diskRev}, phiên bản của bạn: ${expectedDraftRevision}). Bản nháp của phiên khác được bảo toàn nguyên vẹn; bản nháp của bạn chưa được lưu tự động để tránh ghi đè.`;
          return;
        }

        // Check if there are remaining forms/content to persist
        const hasRemainingContent = Boolean(
          remainingDraft && (
            (remainingDraft.songForms && Object.keys(remainingDraft.songForms).length > 0) ||
            remainingDraft.song ||
            (remainingDraft.changes && remainingDraft.changes.length > 0)
          )
        );

        const nextRev = diskRev + 1;

        const recordToPersist = hasRemainingContent ? {
          ...remainingDraft,
          baseLibraryHash: newLibraryHash,
          draftRevision: nextRev,
          updatedAt: new Date().toISOString()
        } : {
          draftRevision: nextRev,
          baseLibraryHash: newLibraryHash,
          activeSongId: null,
          song: null,
          songForms: {},
          changes: [],
          updatedAt: new Date().toISOString()
        };

        tempDraft = path.join(draftsDir, `draft-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`);
        await fs.writeFile(tempDraft, JSON.stringify(recordToPersist, null, 2), "utf8");

        if (_simulateDraftWriteError) {
          throw new Error("SIMULATED_DRAFT_RENAME_ERROR");
        }

        await fs.rename(tempDraft, draftFile);
        tempDraft = null;

        // ONLY assign newDraftRevision AFTER write & rename succeeded!
        newDraftRevision = nextRev;
        actualDraftRevision = nextRev;
        draftCleared = !hasRemainingContent;
        draftSaved = true;
        draftConflict = false;
      });
    } catch (draftErr) {
      draftSaved = false;
      draftConflict = false; // Phân biệt rõ lỗi I/O với xung đột phiên làm việc!
      draftConflictCode = null;
      draftError = draftErr.message;
      newDraftRevision = null; // Do NOT guess or set nextRev on write failure!
      draftWarning = `Thư viện songs.js đã cập nhật thành công, nhưng thao tác lưu/dọn bản nháp thất bại: ${draftErr.message}. Vui lòng thử lại lưu nháp.`;
      if (tempDraft) {
        await fs.unlink(tempDraft).catch(() => {});
      }
    }

    return {
      ok: true,
      previousCount: currentSongs.length,
      newCount: newSongs.length,
      backupFile: backupFileName,
      libraryUpdated: true,
      draftSaved,
      draftConflict: Boolean(draftConflict),
      draftConflictCode: draftConflict ? draftConflictCode : null,
      draftError,
      draftCleared,
      draftWarning,
      newDraftRevision,
      actualDraftRevision,
      risks,
      summary,
      newLibraryHash
    };
  });
}

export async function listBackups(rootDir) {
  const { backupsDir } = await ensureStudioDirs(rootDir);
  try {
    const files = await fs.readdir(backupsDir);
    const backups = [];
    for (const f of files) {
      if (f.startsWith("songs-backup-") && f.endsWith(".js")) {
        const stat = await fs.stat(path.join(backupsDir, f));
        backups.push({ name: f, size: stat.size, createdAt: stat.birthtime || stat.mtime });
      }
    }
    return backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch {
    return [];
  }
}

export async function restoreBackup(rootDir, { backupFileName, expectedCurrentHash }) {
  if (!backupFileName || !/^songs-backup-[\w.-]+\.js$/.test(backupFileName)) {
    throw new Error("Tên file sao lưu không hợp lệ.");
  }

  return withUpdateLock(async () => {
    const { backupsDir, studioDir } = await ensureStudioDirs(rootDir);
    const backupPath = path.join(backupsDir, backupFileName);
    const backupSource = await fs.readFile(backupPath, "utf8");

    // Validate backup content
    const match = backupSource.match(/const\s+songs\s*=\s*(\[[\s\S]*\])\s*;?\s*$/);
    if (!match) throw new Error("Bản sao lưu không chứa mảng bài hát hợp lệ.");
    const backupSongs = JSON.parse(match[1]);
    const findings = validateLibrary(backupSongs);
    const summary = summarizeFindings(findings);
    if (summary.error > 0) {
      throw new Error("Bản sao lưu có lỗi cấu trúc, không thể phục hồi.");
    }

    // Check current state strictly against expectedCurrentHash
    const { hash: currentHash, path: songsPath } = await readSongsFromDisk(rootDir);
    if (!expectedCurrentHash) {
      const error = new Error("Thiếu mốc hash thư viện hiện tại (expectedCurrentHash) để kiểm tra xung đột phục hồi.");
      error.statusCode = 400;
      throw error;
    }

    if (expectedCurrentHash !== currentHash) {
      const error = new Error("Thư viện hiện tại đã bị thay đổi bên ngoài. Vui lòng kiểm tra lại trước khi phục hồi.");
      error.statusCode = 409;
      error.code = "RESTORE_CONFLICT";
      throw error;
    }

    // Create safety pre-restore backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const safetyBackup = `songs-backup-prerestore-${timestamp}-${currentHash.slice(0, 8)}.js`;
    await fs.copyFile(songsPath, path.join(backupsDir, safetyBackup));

    // Atomically write backup into songs.js
    const tempPath = path.join(studioDir, `restore-${Date.now()}.tmp`);
    await fs.writeFile(tempPath, backupSource, "utf8");
    await fs.rename(tempPath, songsPath);

    return {
      ok: true,
      restoredSongCount: backupSongs.length,
      backupRestored: backupFileName,
      safetyBackup,
      newLibraryHash: computeLibraryHash(backupSource)
    };
  });
}

export async function getPublishStatus(rootDir) {
  try {
    const statusOutput = execFileSync("git", ["status", "--porcelain"], { cwd: rootDir, encoding: "utf8" });
    const branch = execFileSync("git", ["branch", "--show-current"], { cwd: rootDir, encoding: "utf8" }).trim();
    const lines = statusOutput.split("\n").map(l => l.trim()).filter(Boolean);

    const dataModified = lines.some(l => l.includes("songs.js"));
    const uncommittedNonData = lines.filter(l =>
      !l.includes("songs.js") &&
      !l.includes("data-revision.js") &&
      !l.includes(".gitignore") &&
      !l.includes("qa/batches.json") &&
      !l.includes("qa/text-qa-policy.json")
    );

    return {
      ok: true,
      branch,
      isClean: lines.length === 0,
      dataModified,
      uncommittedNonDataFiles: uncommittedNonData,
      readyForPublish: dataModified && uncommittedNonData.length === 0 && branch === "main",
      message: "Chế độ an toàn: Tính năng tự động push remote GitHub không được kích hoạt trong đợt này. Sau khi Cập nhật thư viện cục bộ, vui lòng chạy 'npm run validate:songs' và 'npm run qa:text' trước khi commit."
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message
    };
  }
}

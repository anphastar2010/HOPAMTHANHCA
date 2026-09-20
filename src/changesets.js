function clone(value) {
  return structuredClone(value);
}

function risk(index, code, message) {
  return { index, code, message };
}

function requireSong(change, index) {
  if (!change.song || typeof change.song !== "object" || Array.isArray(change.song)) {
    throw new Error(`Thay đổi ${index + 1} thiếu object song.`);
  }
  if (change.song.id === undefined || change.song.id === null || change.song.id === "") {
    throw new Error(`Thay đổi ${index + 1} thiếu song.id.`);
  }
}

function contentChangeIsLarge(before, after) {
  if (before === after) return false;
  const baseline = Math.max(String(before || "").length, 1);
  return Math.abs(String(after || "").length - baseline) / baseline >= 0.35;
}

export function applyChangeset(library, changeset, currentRevision = null) {
  if (!Array.isArray(library)) throw new Error("Thư viện gốc phải là array.");
  if (!changeset || typeof changeset !== "object" || !Array.isArray(changeset.changes)) {
    throw new Error("Changeset phải có array changes.");
  }

  const songs = clone(library);
  const risks = [];

  changeset.changes.forEach((change, index) => {
    if (!change || typeof change !== "object") {
      throw new Error(`Thay đổi ${index + 1} không hợp lệ.`);
    }

    if (change.op === "create") {
      requireSong(change, index);
      if (songs.some(song => String(song.id) === String(change.song.id))) {
        throw new Error(`Không thể tạo ID ${change.song.id}: ID đã tồn tại.`);
      }
      songs.push(clone(change.song));
      risks.push(risk(index, "create-song", `Tạo bài mới "${change.song.title || change.song.id}".`));
      return;
    }

    if (change.op === "update") {
      requireSong(change, index);
      const songIndex = songs.findIndex(song => String(song.id) === String(change.song.id));
      if (songIndex < 0) throw new Error(`Không thể cập nhật ID ${change.song.id}: không tìm thấy bài gốc.`);

      const before = songs[songIndex];
      const after = { ...before, ...clone(change.song), id: before.id };
      if (before.title !== after.title) {
        risks.push(risk(index, "title-change", `Đổi tên "${before.title}" thành "${after.title}".`));
      }
      if (contentChangeIsLarge(before.content, after.content)) {
        risks.push(risk(index, "large-content-change", `Nội dung "${before.title}" thay đổi từ ${String(before.content || "").length} thành ${String(after.content || "").length} ký tự.`));
      }
      for (const field of ["audio", "sheet", "sourceUrl", "importedAt"]) {
        if (before[field] && field in change.song && !after[field]) {
          risks.push(risk(index, "metadata-cleared", `Field ${field} của "${before.title}" bị xóa.`));
        }
      }
      songs[songIndex] = after;
      return;
    }

    if (change.op === "delete") {
      const id = change.songId ?? change.song?.id;
      const songIndex = songs.findIndex(song => String(song.id) === String(id));
      if (songIndex < 0) throw new Error(`Không thể xóa ID ${id}: không tìm thấy bài gốc.`);
      const [removed] = songs.splice(songIndex, 1);
      risks.push(risk(index, "delete-song", `Xóa bài "${removed.title}" (ID ${removed.id}).`));
      return;
    }

    throw new Error(`Thay đổi ${index + 1} có op không hỗ trợ: ${change.op}.`);
  });

  if (!changeset.baseCommit) {
    risks.push(risk(-1, "missing-base-commit", "Changeset không ghi baseCommit; cần xác nhận nó được tạo từ songs.js hiện tại."));
  } else if (currentRevision && changeset.baseCommit !== currentRevision) {
    risks.push(risk(-1, "stale-base", `Changeset dựa trên ${changeset.baseCommit}, revision hiện tại là ${currentRevision}.`));
  }

  return { songs, risks };
}

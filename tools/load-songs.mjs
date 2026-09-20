import fs from "node:fs/promises";

export async function loadSongs(filePath) {
  const source = await fs.readFile(filePath, "utf8");
  const start = source.indexOf("[");
  const end = source.lastIndexOf("]");
  if (start < 0 || end < start) {
    throw new Error("Không tìm thấy array dữ liệu trong songs.js.");
  }

  const prefix = source.slice(0, start).trim();
  const suffix = source.slice(end + 1).trim();
  if (!/^const\s+songs\s*=\s*$/.test(prefix) || !/^;?$/.test(suffix)) {
    throw new Error("songs.js không còn ở định dạng dữ liệu tĩnh được hỗ trợ.");
  }

  const songs = JSON.parse(source.slice(start, end + 1));
  if (!Array.isArray(songs)) throw new Error("Dữ liệu songs.js không phải array.");
  return songs;
}

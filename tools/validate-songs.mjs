#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateLibrary, summarizeFindings } from "../src/song-validator.js";
import { loadSongs } from "./load-songs.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const filePath = path.resolve(process.argv[2] || path.join(root, "songs.js"));

try {
  const songs = await loadSongs(filePath);
  const findings = validateLibrary(songs);
  for (const item of findings) {
    const song = item.songId === null ? item.title : `${item.title} (ID ${item.songId})`;
    console.log(`${item.severity.toUpperCase()} ${item.code} — ${song}: ${item.message}`);
  }
  const summary = summarizeFindings(findings);
  console.log(`\nĐã kiểm tra ${songs.length} bài: ${summary.error} lỗi, ${summary.warning} cảnh báo, ${summary.info} thông tin.`);
  process.exitCode = summary.error ? 1 : 0;
} catch (error) {
  console.error(`ERROR load-library — ${error.message}`);
  process.exitCode = 1;
}

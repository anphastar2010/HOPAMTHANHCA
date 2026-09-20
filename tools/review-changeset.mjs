#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { create } from "jsondiffpatch";
import { applyChangeset } from "../src/changesets.js";
import { summarizeFindings, validateLibrary } from "../src/song-validator.js";
import { loadSongs } from "./load-songs.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const outputIndex = args.indexOf("--out");
const outputArg = outputIndex >= 0 ? args[outputIndex + 1] : null;
const allowStaleBase = args.includes("--allow-stale-base");
const changesetArg = args.find((arg, index) => !arg.startsWith("--") && args[index - 1] !== "--out");

if (!changesetArg || (outputIndex >= 0 && !outputArg)) {
  console.error("Cách dùng: npm run review:changeset -- <changeset.json> [--out <candidate.js>] [--allow-stale-base]");
  process.exit(1);
}

try {
  const changesetPath = path.resolve(changesetArg);
  const changeset = JSON.parse(await fs.readFile(changesetPath, "utf8"));
  const before = await loadSongs(path.join(root, "songs.js"));
  const revisionSource = await fs.readFile(path.join(root, "data-revision.js"), "utf8");
  const currentRevision = revisionSource.match(/HOPAM_DATA_REVISION\s*=\s*["']([0-9a-f]+)["']/)?.[1];
  if (!currentRevision) throw new Error("Không đọc được revision hiện tại từ data-revision.js.");
  const { songs: after, risks } = applyChangeset(before, changeset, currentRevision);
  const findings = validateLibrary(after);
  const summary = summarizeFindings(findings);
  const delta = create({ objectHash: song => String(song.id), arrays: { detectMove: false } }).diff(before, after);

  console.log(`Tác giả: ${changeset.author || "không ghi"}`);
  console.log(`Thao tác: ${changeset.changes.length}`);
  console.log(`Kết quả: ${before.length} → ${after.length} bài`);
  console.log(`Validator: ${summary.error} lỗi, ${summary.warning} cảnh báo, ${summary.info} thông tin`);
  console.log("\nCác điểm bắt buộc review:");
  if (!risks.length) console.log("- Không có thay đổi rủi ro cao được phát hiện.");
  for (const item of risks) console.log(`- ${item.code}: ${item.message}`);
  console.log("\nData diff (jsondiffpatch):");
  console.log(JSON.stringify(delta ?? {}, null, 2));

  const staleBase = risks.some(item => item.code === "stale-base");
  if (summary.error) {
    console.error("\nKhông tạo candidate vì dữ liệu sau changeset có lỗi cấu trúc.");
    process.exitCode = 1;
  } else if (outputArg && staleBase && !allowStaleBase) {
    console.error("\nKhông tạo candidate từ revision cũ. Chỉ dùng --allow-stale-base sau khi đã review và chấp nhận rủi ro ghi đè.");
    process.exitCode = 1;
  } else if (outputArg) {
    const outputPath = path.resolve(outputArg);
    const sourcePath = path.resolve(root, "songs.js");
    if (outputPath === sourcePath) throw new Error("Không được ghi đè trực tiếp songs.js; hãy tạo file candidate riêng để review.");
    await fs.writeFile(outputPath, `const songs = ${JSON.stringify(after, null, 2)};\n`, "utf8");
    console.log(`\nĐã ghi candidate để review: ${outputPath}`);
  }
} catch (error) {
  console.error(`ERROR review-changeset — ${error.message}`);
  process.exitCode = 1;
}

#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const expected = String(process.argv[2] || execFileSync("git", ["rev-list", "-1", "HEAD", "--", "songs.js"], { cwd: new URL("../", import.meta.url), encoding: "utf8" })).trim();
if (!/^[0-9a-f]{40}$/.test(expected)) {
  console.error("ERROR data-revision — thiếu revision Git hợp lệ của songs.js.");
  process.exit(1);
}
const source = await fs.readFile(path.join(root, "data-revision.js"), "utf8");
const actual = source.match(/HOPAM_DATA_REVISION\s*=\s*["']([0-9a-f]+)["']/)?.[1];

if (!actual) {
  console.error("ERROR data-revision — không đọc được HOPAM_DATA_REVISION.");
  process.exit(1);
}
if (actual !== expected) {
  console.error(`ERROR data-revision — đang là ${actual}, revision của songs.js là ${expected}. Chạy npm run update:data-revision.`);
  process.exit(1);
}
console.log(`Data revision hợp lệ: ${actual}`);

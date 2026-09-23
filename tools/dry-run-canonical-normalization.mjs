#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeCanonicalNormalization, renderNormalizationMarkdown } from "../src/canonical-normalization.js";
import { loadSongs } from "./load-songs.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reportRoot = path.join(root, "reports", "canonical-normalization");

function assertGeneratedPath(filePath) {
  const target = path.resolve(filePath);
  if (target === path.join(root, "songs.js")) throw new Error("Dry-run không được ghi đè songs.js.");
  if (!target.startsWith(`${reportRoot}${path.sep}`)) throw new Error("Report dry-run chỉ được ghi dưới reports/canonical-normalization/.");
  return target;
}

async function writeReport(filePath, content) {
  const target = assertGeneratedPath(filePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content, "utf8");
}

try {
  const songs = await loadSongs(path.join(root, "songs.js"));
  const report = analyzeCanonicalNormalization(songs);
  const jsonPath = path.join(reportRoot, "phase-2a.json");
  const markdownPath = path.join(reportRoot, "phase-2a.md");
  await Promise.all([
    writeReport(jsonPath, `${JSON.stringify({ ...report, candidates: undefined }, null, 2)}\n`),
    writeReport(markdownPath, renderNormalizationMarkdown(report))
  ]);
  console.log(`Dry-run: ${report.passed ? "PASS" : "FAIL"}`);
  console.log(`Songs: ${report.songsAnalyzed} → ${report.candidateSongs}; affected: ${report.affectedSongs.length}`);
  console.log(`Reports: ${jsonPath} and ${markdownPath}`);
  if (!report.passed) process.exitCode = 1;
} catch (error) {
  console.error(`ERROR canonical-normalization-dry-run — ${error.message}`);
  process.exitCode = 1;
}

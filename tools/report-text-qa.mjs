#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  analyzeTextLibrary,
  reportExitCode,
  renderHtmlReport,
  renderTerminalSummary,
  serializeJsonReport
} from "../src/text-qa.js";
import { loadSongs } from "./load-songs.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

function option(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}

function readRevision(source) {
  const revision = source.match(/HOPAM_DATA_REVISION\s*=\s*["']([0-9a-f]{40})["']/)?.[1];
  if (!revision) throw new Error("Không đọc được dataset revision từ data-revision.js.");
  return revision;
}

function assertSafeOutput(filePath) {
  if (!filePath) return;
  if (path.resolve(filePath) === path.join(root, "songs.js")) {
    throw new Error("Text QA không được ghi đè songs.js.");
  }
}

async function writeReport(filePath, content) {
  if (!filePath) return;
  assertSafeOutput(filePath);
  const target = path.resolve(filePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content, "utf8");
}

try {
  const jsonPath = option("--json");
  const htmlPath = option("--html");
  const batchId = option("--batch");
  const calibration = args.includes("--calibration");
  if (batchId && calibration) throw new Error("Chỉ chọn --calibration hoặc --batch, không dùng đồng thời.");

  const [songs, policy, manifest, revisionSource] = await Promise.all([
    loadSongs(path.join(root, "songs.js")),
    fs.readFile(path.join(root, "qa/text-qa-policy.json"), "utf8").then(JSON.parse),
    fs.readFile(path.join(root, "qa/batches.json"), "utf8").then(JSON.parse),
    fs.readFile(path.join(root, "data-revision.js"), "utf8")
  ]);
  const datasetRevision = readRevision(revisionSource);
  if (manifest.datasetRevision !== datasetRevision) {
    throw new Error(`Batch manifest dùng revision ${manifest.datasetRevision}, dữ liệu hiện tại là ${datasetRevision}.`);
  }

  let selectedSongIds = null;
  let scope = "full-library";
  if (calibration) {
    selectedSongIds = manifest.calibration.songIds;
    scope = "calibration";
  } else if (batchId) {
    const batch = manifest.batches.find(item => item.id === String(batchId).padStart(2, "0"));
    if (!batch) throw new Error(`Không tìm thấy batch ${batchId}.`);
    selectedSongIds = batch.songIds;
    scope = `batch-${batch.id}`;
  }

  const report = analyzeTextLibrary(songs, { policy, datasetRevision, selectedSongIds, scope });
  process.stdout.write(renderTerminalSummary(report));
  await writeReport(jsonPath, serializeJsonReport(report));
  await writeReport(htmlPath, renderHtmlReport(report));
  if (jsonPath) console.log(`JSON: ${path.resolve(jsonPath)}`);
  if (htmlPath) console.log(`HTML: ${path.resolve(htmlPath)}`);
  process.exitCode = reportExitCode(report);
} catch (error) {
  console.error(`ERROR text-qa — ${error.message}`);
  process.exitCode = 1;
}

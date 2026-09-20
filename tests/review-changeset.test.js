import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const temporaryDirectories = [];
afterEach(() => temporaryDirectories.splice(0).forEach(directory => fs.rmSync(directory, { recursive: true, force: true })));

function runReview(extraArgs = []) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "hopam-review-"));
  temporaryDirectories.push(directory);
  const changeset = path.join(directory, "stale.json");
  const candidate = path.join(directory, "candidate.js");
  fs.writeFileSync(changeset, JSON.stringify({
    baseCommit: "0000000000000000000000000000000000000000", author: "Test", changes: []
  }));
  const result = spawnSync(process.execPath, ["tools/review-changeset.mjs", changeset, "--out", candidate, ...extraArgs], {
    cwd: process.cwd(), encoding: "utf8"
  });
  return { result, candidate };
}

describe("review-changeset stale base guard", () => {
  it("từ chối tạo candidate stale nếu chưa override", () => {
    const { result, candidate } = runReview();
    expect(result.status).toBe(1);
    expect(fs.existsSync(candidate)).toBe(false);
  });

  it("chỉ tạo candidate stale với override rõ ràng", () => {
    const { result, candidate } = runReview(["--allow-stale-base"]);
    expect(result.status).toBe(0);
    expect(fs.existsSync(candidate)).toBe(true);
  });
});

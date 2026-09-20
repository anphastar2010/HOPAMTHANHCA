import { describe, expect, it } from "vitest";
import { applyChangeset } from "../src/changesets.js";

const original = [{
  id: 1,
  title: "Bài cũ",
  artist: "Tác giả",
  key: "C",
  audio: "audio-url",
  sheet: "sheet-url",
  content: "[C] Nội dung cũ",
  sourceUrl: "https://source.test",
  importedAt: "2026-09-19T00:00:00.000Z"
}];

describe("applyChangeset", () => {
  it("merges updates so omitted metadata is preserved", () => {
    const result = applyChangeset(original, {
      baseCommit: "abc1234",
      changes: [{ op: "update", song: { id: 1, content: "[D] Nội dung mới" } }]
    });
    expect(result.songs[0]).toMatchObject({
      content: "[D] Nội dung mới",
      sourceUrl: "https://source.test",
      importedAt: "2026-09-19T00:00:00.000Z"
    });
    expect(original[0].content).toBe("[C] Nội dung cũ");
  });

  it("rejects create operations with duplicate IDs", () => {
    expect(() => applyChangeset(original, {
      changes: [{ op: "create", song: { ...original[0] } }]
    })).toThrow(/đã tồn tại/);
  });

  it("flags deletion and missing base revision for review", () => {
    const result = applyChangeset(original, {
      changes: [{ op: "delete", songId: 1 }]
    });
    expect(result.songs).toEqual([]);
    expect(result.risks.map(item => item.code)).toEqual(expect.arrayContaining([
      "delete-song",
      "missing-base-commit"
    ]));
  });

  it("flags explicit metadata loss", () => {
    const result = applyChangeset(original, {
      baseCommit: "abc1234",
      changes: [{ op: "update", song: { id: 1, audio: "" } }]
    });
    expect(result.risks).toContainEqual(expect.objectContaining({ code: "metadata-cleared" }));
  });
  it("flags a stale base revision", () => {
    const result = applyChangeset(original, { baseCommit: "old", changes: [] }, "current");
    expect(result.risks).toContainEqual(expect.objectContaining({ code: "stale-base" }));
  });

  it("rejects unsupported operations", () => {
    expect(() => applyChangeset(original, {
      changes: [{ op: "rename", song: { id: 1 } }]
    })).toThrow(/không hỗ trợ/);
  });
});

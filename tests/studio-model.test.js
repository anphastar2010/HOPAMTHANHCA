import { describe, expect, it } from "vitest";
import { makeChangeset, saveSong, snapshotStudio } from "../src/studio-model.js";

const old = [{
  id: 1,
  title: "A",
  audio: "x",
  sheet: "y",
  content: "z",
  sourceUrl: "https://source.test/original",
  importedAt: "first"
}];

describe("Studio model", () => {
  it("giữ metadata khi edit", () => {
    expect(saveSong(old, 1, { title: "B" }).song).toMatchObject({
      audio: "x",
      sheet: "y",
      sourceUrl: "https://source.test/original",
      importedAt: "first"
    });
  });

  it("tạo provenance một lần", () => {
    const created = saveSong([], 2, { title: "A", content: "x" }, {
      sourceUrl: "https://source.test/new"
    }, () => "first").song;
    const edited = saveSong([created], 2, { title: "B" }, {}, () => "second").song;
    expect(edited.importedAt).toBe("first");
  });

  it("giữ provenance khi URL trong form bị để trống", () => {
    const song = saveSong(old, 1, { title: "B" }, { sourceUrl: "" }).song;
    expect(song).toMatchObject({ sourceUrl: "https://source.test/original", importedAt: "first" });
  });

  it("cho phép cập nhật URL mà không reset importedAt", () => {
    const song = saveSong(old, 1, { title: "B" }, {
      sourceUrl: "https://source.test/replacement"
    }, () => "second").song;
    expect(song).toMatchObject({ sourceUrl: "https://source.test/replacement", importedAt: "first" });
  });

  it("changeset có baseCommit", () => {
    expect(makeChangeset("A", [], "abc", () => "now")).toMatchObject({ baseCommit: "abc", author: "A" });
  });

  it("save rồi undo không để lại update trong changeset export", () => {
    const before = snapshotStudio(old, [], 1);
    const result = saveSong(old, 1, { title: "B" });
    expect([{ op: result.op, song: result.song }]).toHaveLength(1);
    expect(before.library).toEqual(old);
    expect(before.selectedId).toBe(1);
    expect(makeChangeset("A", before.changes, "abc", () => "now").changes).toEqual([]);
  });

  it("delete rồi undo không để lại delete trong changeset export", () => {
    const before = snapshotStudio(old, [], 1);
    expect([{ op: "delete", songId: 1 }]).toHaveLength(1);
    expect(before.library).toEqual(old);
    expect(makeChangeset("A", before.changes, "abc", () => "now").changes).toEqual([]);
  });
});

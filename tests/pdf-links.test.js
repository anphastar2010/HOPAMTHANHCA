import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadSongs } from "../tools/load-songs.mjs";
import { PDF_PUBLIC_BASE_URL, isSecurePdfUrl, parsePdfCode, resolvePdfUrl } from "../src/pdf-links.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("PDF resolver", () => {
  it.each([
    ["[1] Bài một", `${PDF_PUBLIC_BASE_URL}/thanhca/1.pdf`],
    ["[18] Bài mười tám", `${PDF_PUBLIC_BASE_URL}/thanhca/18.pdf`],
    ["[120] Bài một trăm hai mươi", `${PDF_PUBLIC_BASE_URL}/thanhca/120.pdf`],
    ["[268-TVCHH] Ngài Là Ai", `${PDF_PUBLIC_BASE_URL}/tvchh/268.pdf`],
    ["[337-TVCHH] Đồi Vắng", `${PDF_PUBLIC_BASE_URL}/tvchh/337.pdf`]
  ])("resolves %s", (title, expected) => {
    expect(resolvePdfUrl({ title, sheet: "" })).toBe(expected);
    expect(isSecurePdfUrl(expected)).toBe(true);
  });

  it.each(["[0] Ngoài khoảng", "[268 TVCHH] Ngài Là Ai", "[TVCHH-268] Ngài Là Ai", "[268-TVCHH Ngài Là Ai", "[-TVCHH] Ngài Là Ai", "[121] Ngoài khoảng"])("rejects %s", title => {
    expect(parsePdfCode(title)).toBeNull();
  });

  it("uses a valid sheet only as fallback", () => {
    expect(resolvePdfUrl({ title: "Không mã", sheet: "" })).toBeNull();
    expect(resolvePdfUrl({ title: "Không mã", sheet: "https://example.test/fallback.pdf" })).toBe("https://example.test/fallback.pdf");
    expect(resolvePdfUrl({ title: "Không mã", sheet: "file.pdf" })).toBeNull();
  });

  it("prioritizes R2 and does not mutate input", () => {
    const song = { title: "[1] Bài một", sheet: "https://drive.google.com/file/d/old/view" };
    const before = structuredClone(song);
    expect(resolvePdfUrl(song)).toBe(`${PDF_PUBLIC_BASE_URL}/thanhca/1.pdf`);
    expect(song).toEqual(before);
  });
});

describe("PDF-linked song library", () => {
  it("contains only approved retained records and normalized TVCHH titles", async () => {
    const songs = await loadSongs(path.join(root, "songs.js"));
    expect(songs).toHaveLength(121);
    expect(songs.find(song => song.id === 1767000271760)).toBeUndefined();
    expect(songs.find(song => song.id === 1782288509642)).toBeUndefined();
    expect(songs.find(song => song.id === 1782379843052)?.title).toBe("[118] YÊN VUI MỘT ĐỜI");
    expect(songs.find(song => song.id === 1782288527182)?.title).toBe("[95] TÌNH CON DÂNG HIẾN");
    expect(songs.find(song => song.id === 1767001582485)?.title).toBe("[337-TVCHH] Đồi Vắng");
    expect(songs.find(song => song.id === 1789300042893)?.title).toBe("[268-TVCHH] Ngài Là Ai");
  });
});

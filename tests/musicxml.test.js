import fs from "node:fs";
import { DOMParser } from "@xmldom/xmldom";
import { describe, expect, it } from "vitest";
import { parseMusicXml } from "../src/musicxml.js";

const fixture = name => fs.readFileSync(`tests/fixtures/musicxml/${name}`, "utf8");

describe("MusicXML", () => {
  it("khóa hành vi title/composer/key/harmony/verses", () => {
    expect(parseMusicXml(fixture("basic.xml"), "x.xml", DOMParser)).toEqual({
      title: "Bài thử", artist: "Tác giả", key: "F", content: "1. [Bb7]Lời\n\n2. Hai"
    });
  });

  it("khóa minor, sharp/flat, nhiều measure, verse và harmony chờ lyric", () => {
    expect(parseMusicXml(fixture("advanced.xml"), "x.xml", DOMParser)).toEqual({
      title: "Nâng cao", artist: "Nhạc sĩ", key: "Dm", content: "1. [F#maj7][Bbm]Một [G7]Sau\n\n2. Hai"
    });
  });

  it("trả nội dung rỗng khi MusicXML không có part", () => {
    expect(parseMusicXml(fixture("no-part.xml"), "fallback.xml", DOMParser)).toEqual({
      title: "Không có part", artist: "", key: "C", content: ""
    });
  });

  it("từ chối XML lỗi", () => expect(() => parseMusicXml("<bad>", "x.xml", DOMParser)).toThrow());
});

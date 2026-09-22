import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { validateLibrary, summarizeFindings } from "../src/song-validator.js";
import { loadSongs } from "../tools/load-songs.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("songs.js integration", () => {
  it("loads the real static library without structural errors", async () => {
    const songs = await loadSongs(path.join(root, "songs.js"));
    const summary = summarizeFindings(validateLibrary(songs));

    expect(songs).toHaveLength(121);
    expect(summary.error).toBe(0);
  });
});

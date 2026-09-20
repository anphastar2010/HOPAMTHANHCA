const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_MAP = {
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
  Cb: "B",
  Fb: "E",
  "E#": "F",
  "B#": "C"
};

export function transposeChord(chord, step) {
  const match = chord.trim().match(/^([A-G][b#]?)(.*)$/);
  if (!match) return chord;
  const index = NOTES.indexOf(FLAT_MAP[match[1]] || match[1]);
  return index < 0 ? chord : NOTES[(index + step + 120) % 12] + match[2];
}

export function transposeText(text, step) {
  return text.replace(/\[([^\]]+)\]/g, (_, chord) => {
    const [base, bass] = chord.split("/");
    return "[" + transposeChord(base, step) + (bass ? "/" + transposeChord(bass, step) : "") + "]";
  });
}

export function parseAudioLinks(value) {
  return (value || "")
    .split(";;")
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => {
      const parts = item.split("|");
      return {
        label: parts.length > 1 ? parts[0].trim() : "Phát audio",
        url: (parts.length > 1 ? parts.slice(1).join("|") : parts[0]).trim()
      };
    });
}

let currentSong = null;

const NOTES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const FLAT_MAP = {
  "Db":"C#","Eb":"D#","Gb":"F#","Ab":"G#","Bb":"A#"
};

function normalizeChord(chord) {
  return FLAT_MAP[chord] || chord;
}

function transposeChord(chord, step) {
  const match = chord.match(/^([A-G][b#]?)(.*)$/);
  if (!match) return chord;

  let [, root, suffix] = match;
  root = normalizeChord(root);

  const index = NOTES.indexOf(root);
  if (index < 0) return chord;

  const newRoot = NOTES[(index + step + 12) % 12];
  return newRoot + suffix;
}

function transposeText(text, step) {
  return text.replace(/\[([^\]]+)\]/g, (_, chord) =>
    `[${transposeChord(chord, step)}]`
  );
}

function renderSong(song) {
  currentSong = song;
  title.textContent = song.title;
  artist.textContent = song.artist || "";

  const step = Number(transpose.value);
  const text = transposeText(song.content, step);

  content.innerHTML = text
    .split("\n")
    .map(line =>
      `<div class="song-line">${
        line.replace(/\[([^\]]+)\]/g,
        '<span class="chord">$1</span>')
      }</div>`
    )
    .join("");
}

function renderList(filter = "") {
  list.innerHTML = "";

  songs
    .filter(s =>
      s.title.toLowerCase().includes(filter) ||
      s.content.toLowerCase().includes(filter)
    )
    .forEach(song => {
      const div = document.createElement("div");
      div.className = "song-item";
      div.textContent = song.title;
      div.onclick = () => renderSong(song);
      list.appendChild(div);
    });
}

/* ===== EVENTS ===== */
search.oninput = () =>
  renderList(search.value.toLowerCase());

transpose.onchange = () => {
  if (currentSong) renderSong(currentSong);
};

/* ===== INIT ===== */
renderList();
if (songs.length) renderSong(songs[0]);

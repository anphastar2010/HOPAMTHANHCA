const searchInput = document.getElementById("searchInput");

const notes = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

let currentSong = null;
let currentStep = 0;

const select = document.getElementById("songSelect");
const contentEl = document.getElementById("songContent");
const keyEl = document.getElementById("keyDisplay");

function transposeChord(chord, step) {
  const match = chord.match(/^([A-G]#?)(.*)$/);
  if (!match) return chord;

  const root = match[1];
  const suffix = match[2];

  const index = notes.indexOf(root);
  if (index === -1) return chord;

  const newIndex = (index + step + notes.length) % notes.length;
  return notes[newIndex] + suffix;
}

function renderSong() {
  let text = currentSong.content;

  text = text.replace(/\[([^\]]+)\]/g, (_, chord) => {
    return "[" + transposeChord(chord, currentStep) + "]";
  });

  contentEl.innerText = text;
  keyEl.innerText =
    "Giọng: " + transposeChord(currentSong.key, currentStep);
}

function transpose(step) {
  currentStep += step;
  renderSong();
}

songs.forEach(song => {
  const opt = document.createElement("option");
  opt.value = song.id;
  opt.textContent = song.title + " – " + song.artist;
  select.appendChild(opt);
});

select.addEventListener("change", () => {
  currentSong = songs.find(s => s.id == select.value);
  currentStep = 0;
  renderSong();
});

currentSong = songs[0];
renderSong();

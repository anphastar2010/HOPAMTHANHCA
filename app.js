const songListEl = document.getElementById("songList");
const contentEl = document.getElementById("songContent");
const searchInput = document.getElementById("searchInput");
const keySelect = document.getElementById("keySelect");
const wakeBtn = document.getElementById("wakeBtn");

let currentSong = null;
let currentStep = 0;
let showChords = true;
let bigText = false;

/* WAKE LOCK */
let wakeLock = null;
let wakeEnabled = false;

/* NOTE MAP */
const notes = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

/* RENDER DANH SÁCH */
function renderList(list) {
  songListEl.innerHTML = "";
  list.forEach(song => {
    const li = document.createElement("li");
    li.textContent = song.title;
    li.onclick = () => selectSong(song);
    songListEl.appendChild(li);
  });
}

/* CHỌN BÀI */
function selectSong(song) {
  currentSong = song;
  currentStep = 0;
  renderSong();
}

/* RENDER BÀI */
function renderSong() {
  if (!currentSong) return;

  let text = currentSong.content;

  text = text.replace(/\[([^\]]+)\]/g, (_, chord) => {
    if (!showChords) return "";
    return "[" + transposeChord(chord, currentStep) + "]";
  });

  contentEl.innerText = text;
  contentEl.classList.toggle("big-text", bigText);

  const newKey = transposeChord(currentSong.key, currentStep);
  keySelect.value = notes.includes(newKey) ? newKey : "";
}

/* TRANSPOSE */
function transpose(step) {
  currentStep += step;
  renderSong();
}

function setKey(targetKey) {
  if (!currentSong) return;
  const from = notes.indexOf(currentSong.key);
  const to = notes.indexOf(targetKey);
  if (from >= 0 && to >= 0) {
    currentStep = to - from;
    renderSong();
  }
}

function transposeChord(chord, step) {
  const match = chord.match(/^([A-G]#?)(.*)$/);
  if (!match) return chord;
  const i = notes.indexOf(match[1]);
  if (i < 0) return chord;
  return notes[(i + step + 12) % 12] + match[2];
}

/* TÌM KIẾM */
function searchSongs() {
  const q = searchInput.value.toLowerCase();
  const filtered = songs.filter(s =>
    s.title.toLowerCase().includes(q) ||
    s.content.toLowerCase().includes(q)
  );
  renderList(filtered);
}

/* TOGGLE */
function toggleChords() {
  showChords = !showChords;
  renderSong();
}

function toggleBigText() {
  bigText = !bigText;
  renderSong();
}

/* WAKE LOCK */
async function enableWakeLock() {
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    wakeEnabled = true;
    wakeBtn.textContent = "🔒";
    wakeBtn.classList.add("active");

    wakeLock.addEventListener("release", () => {
      wakeEnabled = false;
      wakeBtn.textContent = "🔓";
      wakeBtn.classList.remove("active");
    });
  } catch {
    alert("Thiết bị không hỗ trợ giữ màn hình sáng.");
  }
}

async function disableWakeLock() {
  if (wakeLock) {
    await wakeLock.release();
    wakeLock = null;
  }
  wakeEnabled = false;
  wakeBtn.textContent = "🔓";
  wakeBtn.classList.remove("active");
}

function toggleWakeLock() {
  wakeEnabled ? disableWakeLock() : enableWakeLock();
}

document.addEventListener("visibilitychange", () => {
  if (wakeEnabled && document.visibilityState === "visible") {
    enableWakeLock();
  }
});

/* INIT */
renderList(songs);

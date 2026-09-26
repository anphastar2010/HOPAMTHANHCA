import { parseAudioLinks, transposeChord, transposeText, transposeKey } from "./src/chords.js";
import { resolvePdfUrl } from "./src/pdf-links.js";

let currentActiveSong = null;
let currentSheetUrl = null;
let currentFontSize = 18;
let transposeSteps = 0;
let currentPlayingButton = null;

const directoryContainer = document.getElementById("directoryContainer");
const songDisplay = document.getElementById("songDisplay");
const songTools = document.getElementById("songTools");
const searchInput = document.getElementById("searchInput");
const suggestionsBox = document.getElementById("searchSuggestions");

function renderSongContent(container, text) {
  const fragment = document.createDocumentFragment();
  text.split(/(\[[^\]]+\])/g).forEach(part => {
    if (/^\[[^\]]+\]$/.test(part)) {
      const chord = document.createElement("span");
      chord.className = "chord";
      chord.textContent = part.slice(1, -1);
      fragment.append(chord);
    } else fragment.append(document.createTextNode(part));
  });
  container.replaceChildren(fragment);
}
function getLyricsSnippet(content) {
  const line = content.replace(/\[[^\]]+\]/g, "").split("\n").map(line => line.trim()).find(line => line && !line.toLowerCase().startsWith("intro"));
  return line ? line.slice(0, 60) + (line.length > 60 ? "…" : "") : "Bấm để xem lời bài hát…";
}
function makeButton(className, label, handler) {
  const element = document.createElement("button");
  element.type = "button"; element.className = className; element.textContent = label;
  if (handler) element.addEventListener("click", handler);
  return element;
}
function renderDirectory() {
  songDisplay.style.display = "none"; songTools.style.display = "none"; directoryContainer.style.display = "flex";
  directoryContainer.replaceChildren();
  if (!Array.isArray(songs) || !songs.length) { directoryContainer.textContent = "Chưa có bài hát nào trong thư viện."; return; }
  songs.forEach(song => {
    const card = makeButton("song-card", "", () => selectSong(song.id));
    const header = document.createElement("div"); header.className = "card-header";
    const title = document.createElement("h3"); title.className = "card-title"; title.textContent = song.title;
    const key = document.createElement("span"); key.className = "badge-card-key"; key.textContent = song.key || "C";
    const artist = document.createElement("div"); artist.className = "card-meta"; artist.textContent = song.artist || "Tác giả: Chưa rõ";
    const snippet = document.createElement("div"); snippet.className = "card-snippet"; snippet.textContent = getLyricsSnippet(song.content || "");
    header.append(title, key); card.append(header, artist, snippet); directoryContainer.append(card);
  });
}
function renderSuggestions(items, query) {
  suggestionsBox.replaceChildren();
  if (!query) { suggestionsBox.style.display = "none"; return; }
  if (!items.length) { const empty = document.createElement("div"); empty.className = "suggestion-item"; empty.textContent = "Không tìm thấy bài hát…"; suggestionsBox.append(empty); }
  items.forEach(song => suggestionsBox.append(makeButton("suggestion-item", song.title + (song.artist ? " — " + song.artist : ""), () => selectSong(song.id))));
  suggestionsBox.style.display = "block";
}
searchInput.addEventListener("input", () => {
  const query = searchInput.value.trim().toLocaleLowerCase("vi");
  const results = query ? songs.filter(song => [song.title, song.artist, song.content].some(value => (value || "").toLocaleLowerCase("vi").includes(query))).slice(0, 8) : [];
  renderSuggestions(results, query);
});
document.addEventListener("click", event => { if (!event.target.closest(".search-container")) suggestionsBox.style.display = "none"; });
function selectSong(id) { const song = songs.find(item => String(item.id) === String(id)); if (!song) return; transposeSteps = 0; searchInput.value = ""; renderSuggestions([], ""); renderSong(song); }
function showDirectory() { currentActiveSong = null; renderDirectory(); window.scrollTo({ top:0, behavior:"smooth" }); }
function transpose(step) { if (currentActiveSong) { transposeSteps += step; renderSong(currentActiveSong); } }
function changeFontSize(delta) { currentFontSize = Math.max(12, Math.min(32, currentFontSize + delta)); document.getElementById("displayContent").style.fontSize = currentFontSize + "px"; }
function getDirectDriveLink(url) { const match = url.match(/\/d\/([^/]+)/) || url.match(/[?&]id=([^&]+)/); return match ? "https://docs.google.com/uc?export=download&id=" + match[1] : url; }
function setAudioButton(element, label, playing) { element.textContent = (playing ? "⏸ Dừng " : "▶ ") + label; element.classList.toggle("is-playing", playing); }
async function playAudioVersion(url, element, label) {
  const audio = document.getElementById("audioElement");
  if (currentPlayingButton === element) { if (audio.paused) { await audio.play(); setAudioButton(element, label, true); } else { audio.pause(); setAudioButton(element, label, false); } return; }
  if (currentPlayingButton) setAudioButton(currentPlayingButton, currentPlayingButton.dataset.label, false);
  audio.src = getDirectDriveLink(url); audio.style.display = "block";
  try { await audio.play(); currentPlayingButton = element; setAudioButton(element, label, true); }
  catch (error) { console.error("Audio playback failed", error); alert("Không thể phát audio. Hãy kiểm tra liên kết và quyền chia sẻ."); }
}
function openSheet() { if (currentSheetUrl) window.open(currentSheetUrl, "_blank", "noopener"); }
function renderSong(song) {
  currentActiveSong = song; directoryContainer.style.display = "none"; songDisplay.style.display = "block"; songTools.style.display = "flex";
  document.getElementById("displayTitle").textContent = song.title;
  document.getElementById("displayArtist").textContent = song.artist || "Tác giả: Chưa rõ";
  const targetKey = transposeKey(song.key || "C", transposeSteps);
  document.getElementById("currentKeyDisplay").textContent = targetKey;
  const content = document.getElementById("displayContent"); renderSongContent(content, transposeText(song.content || "", transposeSteps, targetKey)); content.style.fontSize = currentFontSize + "px";
  const audio = document.getElementById("audioElement"); audio.pause(); audio.removeAttribute("src"); audio.load(); audio.style.display = "none"; currentPlayingButton = null;
  const container = document.getElementById("audioContainer"); container.replaceChildren(); const versions = parseAudioLinks(song.audio);
  if (!versions.length) { const unavailable = makeButton("audio-button", "🎵 Chưa có audio"); unavailable.disabled = true; container.append(unavailable); }
  versions.forEach((version, index) => { const element = makeButton("audio-button", "▶ " + version.label, () => playAudioVersion(version.url, element, version.label)); element.dataset.label = version.label; element.id = "audioBtn_" + index; container.append(element); });
  currentSheetUrl = resolvePdfUrl(song);
  document.getElementById("viewSheetBtn").disabled = !currentSheetUrl; window.scrollTo({ top:0, behavior:"smooth" });
}
document.getElementById("audioElement").addEventListener("ended", () => { if (currentPlayingButton) setAudioButton(currentPlayingButton, currentPlayingButton.dataset.label, false); currentPlayingButton = null; });
document.getElementById("backDirectoryBtn").addEventListener("click", showDirectory);
document.getElementById("transposeDownBtn").addEventListener("click", () => transpose(-1));
document.getElementById("transposeUpBtn").addEventListener("click", () => transpose(1));
const resetBtn = document.getElementById("transposeResetBtn");
if (resetBtn) resetBtn.addEventListener("click", () => { if (currentActiveSong && transposeSteps !== 0) { transposeSteps = 0; renderSong(currentActiveSong); } });
document.getElementById("currentKeyDisplay").addEventListener("click", () => { if (currentActiveSong && transposeSteps !== 0) { transposeSteps = 0; renderSong(currentActiveSong); } });
document.getElementById("fontDownBtn").addEventListener("click", () => changeFontSize(-2));
document.getElementById("fontUpBtn").addEventListener("click", () => changeFontSize(2));
document.getElementById("viewSheetBtn").addEventListener("click", openSheet);
renderDirectory();

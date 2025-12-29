/**********************
 * CẤU HÌNH NỐT NHẠC
 **********************/
const notes = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

/**********************
 * BIẾN TOÀN CỤC
 **********************/
let currentSong = null;
let currentStep = 0;

/**********************
 * DOM ELEMENTS
 **********************/
const select = document.getElementById("songSelect");
const contentEl = document.getElementById("songContent");
const keyEl = document.getElementById("keyDisplay");
const searchInput = document.getElementById("searchInput");

/**********************
 * TRANSPOSE 1 HỢP ÂM
 **********************/
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

/**********************
 * RENDER NỘI DUNG BÀI
 **********************/
function renderSong() {
  if (!currentSong) return;

  let text = currentSong.content;

  text = text.replace(/\[([^\]]+)\]/g, (_, chord) => {
    return "[" + transposeChord(chord, currentStep) + "]";
  });

  contentEl.innerText = text;
  keyEl.innerText =
    "Giọng: " + transposeChord(currentSong.key, currentStep);
}

/**********************
 * TĂNG / GIẢM TÔNG
 **********************/
function transpose(step) {
  currentStep += step;
  renderSong();
}

/**********************
 * RENDER DANH SÁCH BÀI
 **********************/
function renderSongList(list) {
  select.innerHTML = "";

  if (list.length === 0) {
    contentEl.innerText = "❌ Không tìm thấy bài phù hợp.";
    keyEl.innerText = "";
    return;
  }

  list.forEach(song => {
    const opt = document.createElement("option");
    opt.value = song.id;
    opt.textContent = song.title + " – " + song.artist;
    select.appendChild(opt);
  });

  currentSong = list[0];
  currentStep = 0;
  renderSong();
}

/**********************
 * ĐỔI BÀI HÁT
 **********************/
select.addEventListener("change", () => {
  currentSong = songs.find(s => s.id == select.value);
  currentStep = 0;
  renderSong();
});

/**********************
 * TÌM KIẾM BÀI HÁT
 **********************/
searchInput.addEventListener("input", () => {
  const keyword = searchInput.value.toLowerCase().trim();

  if (keyword === "") {
    renderSongList(songs);
    return;
  }

  const filtered = songs.filter(song =>
    song.title.toLowerCase().includes(keyword) ||
    song.artist.toLowerCase().includes(keyword) ||
    song.content.toLowerCase().includes(keyword)
  );

  renderSongList(filtered);
});

/**********************
 * KHỞI TẠO ỨNG DỤNG
 **********************/
renderSongList(songs);

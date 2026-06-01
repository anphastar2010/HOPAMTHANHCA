/* ===== CẤU HÌNH BIẾN TOÀN CỤC MỚI ===== */
let currentActiveSong = null;
let currentFontSize = 18;
let transposeSteps = 0;

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_MAP = { "Db": "C#", "Eb": "D#", "Gb": "F#", "Ab": "G#", "Bb": "A#" };

function normalizeChord(chord) {
  return FLAT_MAP[chord] || chord;
}

// --- LOGIC DỊCH GIỌNG CHO TỪNG HỢP ÂM ---
function transposeChord(chord, step) {
  // Tách nốt gốc và tính chất (Ví dụ: [Am7] -> root: A, suffix: m7)
  const match = chord.match(/^([A-G][b#]?)(.*)$/);
  if (!match) return chord;

  let [, root, suffix] = match;
  root = normalizeChord(root);

  const index = NOTES.indexOf(root);
  if (index < 0) return chord;

  // Tính nốt mới trong vòng 12 bán âm
  let newIndex = (index + step) % 12;
  while (newIndex < 0) newIndex += 12;

  return NOTES[newIndex] + suffix;
}

// --- QUÉT DỊCH GIỌNG TOÀN VĂN BẢN ---
function transposeText(text, step) {
  if (step === 0) return text;
  return text.replace(/\[([^\]]+)\]/g, (_, chord) => `[${transposeChord(chord, step)}]`);
}

// --- XỬ LÝ TÌM KIẾM CÓ GỢI Ý (AUTO-SUGGESTION) ---
const searchInput = document.getElementById('searchInput');
const suggestionsBox = document.getElementById('searchSuggestions');

searchInput.addEventListener('input', () => {
  const query = searchInput.value.toLowerCase().trim();
  if (!query) {
    suggestionsBox.style.display = 'none';
    return;
  }

  // Tìm kiếm theo Tên bài hát hoặc Lời nhạc bên trong bài hát
  const filtered = songs.filter(s => 
    s.title.toLowerCase().includes(query) || 
    s.content.toLowerCase().includes(query)
  ).slice(0, 6); // Giới hạn hiển thị tối đa 6 kết quả gợi ý

  if (filtered.length > 0) {
    suggestionsBox.innerHTML = filtered.map(s => `
      <div class="suggestion-item" onclick="selectSong(${s.id})">
        <strong>${s.title}</strong> ${s.artist ? `- <small>${s.artist}</small>` : ''}
      </div>
    `).join('');
    suggestionsBox.style.display = 'block';
  } else {
    suggestionsBox.innerHTML = `<div class="suggestion-item" style="color:#999; cursor:default;">Không tìm thấy bài hát...</div>`;
    suggestionsBox.style.display = 'block';
  }
});

// Đóng khung gợi ý khi click ra ngoài màn hình
document.addEventListener('click', (e) => {
  if (e.target !== searchInput) {
    suggestionsBox.style.display = 'none';
  }
});

// Khi chọn một bài hát từ danh sách gợi ý
function selectSong(id) {
  const song = songs.find(s => s.id == id);
  if (!song) return;
  
  transposeSteps = 0; // Đặt lại dịch giọng về 0 cho bài mới
  suggestionsBox.style.display = 'none';
  searchInput.value = "";
  
  renderSong(song);
}

// --- ĐIỀU KHIỂN TĂNG GIẢM TÔNG ---
function transpose(step) {
  if (!currentActiveSong) return;
  transposeSteps += step;
  renderSong(currentActiveSong);
}

// --- ĐIỀU KHIỂN CỠ CHỮ ---
function changeFontSize(delta) {
  currentFontSize += delta;
  if (currentFontSize < 12) currentFontSize = 12; // Không cho chữ nhỏ quá
  if (currentFontSize > 32) currentFontSize = 32; // Không cho chữ to quá
  document.getElementById('displayContent').style.fontSize = currentFontSize + "px";
}

// --- IN BÀI HÁT RA MÀN HÌNH ---
function renderSong(song) {
  currentActiveSong = song;
  
  // Hiển thị thanh công cụ điều khiển
  document.getElementById('songTools').style.display = 'flex';
  
  document.getElementById('displayTitle').textContent = song.title;
  document.getElementById('displayArtist').textContent = song.artist || "Tác giả: Chưa rõ";

  // Hiển thị Tông hiện tại sau khi tăng/giảm tông
  const originalKey = song.key || "C";
  document.getElementById('currentKeyDisplay').textContent = transposeChord(originalKey, transposeSteps);

  // Dịch giọng và xử lý hiển thị nội dung
  const processedText = transposeText(song.content, transposeSteps);
  const contentArea = document.getElementById('displayContent');
  
  contentArea.textContent = processedText;
  contentArea.style.fontSize = currentFontSize + "px";
}

// --- KHỞI CHẠY MẶC ĐỊNH (INIT) ---
if (typeof songs !== 'undefined' && songs.length > 0) {
  // Mặc định ban đầu nạp bài đầu tiên trong file songs.js lên màn hình
  renderSong(songs[0]);
}

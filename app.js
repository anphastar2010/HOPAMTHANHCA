/* ===== CẤU HÌNH BIẾN TOÀN CỤC ===== */
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
  const match = chord.match(/^([A-G][b#]?)(.*)$/);
  if (!match) return chord;

  let [, root, suffix] = match;
  root = normalizeChord(root);

  const index = NOTES.indexOf(root);
  if (index < 0) return chord;

  let newIndex = (index + step) % 12;
  while (newIndex < 0) newIndex += 12;

  return NOTES[newIndex] + suffix;
}

// --- QUÉT DỊCH GIỌNG TOÀN VĂN BẢN ---
function transposeText(text, step) {
  if (step === 0) return text;
  return text.replace(/\[([^\]]+)\]/g, (_, chord) => `[${transposeChord(chord, step)}]`);
}

// --- TỰ ĐỘNG TẠO ĐOẠN XEM TRƯỚC LỜI (TRÍCH 2 DÒNG ĐẦU KHÔNG CHỨA HỢP ÂM) ---
function getLyricsSnippet(content) {
  // Xóa bỏ toàn bộ hợp âm dạng [C], [Am] để lấy lời thuần túy
  let cleanText = content.replace(/\[([^\]]+)\]/g, '');
  
  // Cắt nhỏ câu hát theo dấu xuống dòng, loại bỏ khoảng trắng thừa
  let lines = cleanText.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.toLowerCase().startsWith('intro')); // Bỏ qua dòng dạo nhạc Intro

  // Lấy 2 dòng đầu tiên gộp lại phân tách bằng dấu gạch chéo
  return lines.slice(0, 2).join(' / ') + '...';
}

// --- RENDER DANH MỤC BÀI HÁT LÊN TRANG CHỦ ---
const directoryContainer = document.getElementById('directoryContainer');
const songDisplay = document.getElementById('songDisplay');
const songTools = document.getElementById('songTools');

function renderDirectory() {
  // Ẩn khu vực xem bài hát chi tiết, hiện danh mục thẻ bài hát
  songDisplay.style.display = 'none';
  songTools.style.display = 'none';
  directoryContainer.style.display = 'flex';

  if (typeof songs === 'undefined' || songs.length === 0) {
    directoryContainer.innerHTML = `<div style="text-align:center; color:#999; padding:4px;">Chưa có bài hát nào trong thư viện...</div>`;
    return;
  }

  // Tạo cấu trúc thẻ Card cho từng bài hát giống app Hợp Âm Chuẩn
  directoryContainer.innerHTML = songs.map(s => `
    <div class="song-card" onclick="selectSong(${s.id})">
        <div class="card-header">
            <h3 class="card-title">${s.title}</h3>
            <span class="badge-card-key">${s.key || 'C'}</span>
        </div>
        <div class="card-meta">${s.artist || 'Tác giả: Chưa rõ'}</div>
        <div class="card-snippet">${getLyricsSnippet(s.content)}</div>
    </div>
  `).join('');
}

// Quay về màn hình danh sách chính
function showDirectory() {
  currentActiveSong = null;
  renderDirectory();
  window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const filtered = songs.filter(s => 
    s.title.toLowerCase().includes(query) || 
    s.content.toLowerCase().includes(query)
  ).slice(0, 6);

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

document.addEventListener('click', (e) => {
  if (e.target !== searchInput) {
    suggestionsBox.style.display = 'none';
  }
});

function selectSong(id) {
  const song = songs.find(s => s.id == id);
  if (!song) return;
  
  transposeSteps = 0; 
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
  if (currentFontSize < 12) currentFontSize = 12;
  if (currentFontSize > 32) currentFontSize = 32;
  document.getElementById('displayContent').style.fontSize = currentFontSize + "px";
}

// --- IN CHI TIẾT BÀI HÁT RA MÀN HÌNH ---
function renderSong(song) {
  currentActiveSong = song;
  
  // Ẩn danh sách trang chủ, bật khu vực bài hát
  directoryContainer.style.display = 'none';
  songDisplay.style.display = 'block';
  songTools.style.display = 'flex';
  
  document.getElementById('displayTitle').textContent = song.title;
  document.getElementById('displayArtist').textContent = song.artist || "Tác giả: Chưa rõ";

  const originalKey = song.key || "C";
  document.getElementById('currentKeyDisplay').textContent = transposeChord(originalKey, transposeSteps);

  const processedText = transposeText(song.content, transposeSteps);
  const contentArea = document.getElementById('displayContent');
  
  contentArea.textContent = processedText;
  contentArea.style.fontSize = currentFontSize + "px";
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- KHỞI CHẠY MẶC ĐỊNH (MỚI: HIỂN THỊ DANH MỤC TRANG CHỦ) ---
renderDirectory();

/* ===== CẤU HÌNH BIẾN TOÀN CỤC ===== */
let currentActiveSong = null;
let currentFontSize = 18;
let transposeSteps = 0;
let currentPlayingBtnId = null; // Theo dõi nút audio nào đang phát

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

// --- TỰ ĐỘNG TẠO ĐOẠN XEM TRƯỚC LỜI (TRÍCH 1 DÒNG ĐẦU TIÊN SIÊU NGẮN) ---
function getLyricsSnippet(content) {
  let cleanText = content.replace(/\[([^\]]+)\]/g, ''); // Xóa bỏ ký hiệu hợp âm []
  
  let lines = cleanText.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.toLowerCase().startsWith('intro'));

  if (lines.length === 0) return "Bấm để xem lời bài hát...";
  
  let firstLine = lines[0];
  if (firstLine.length > 60) {
      return firstLine.substring(0, 60) + '...';
  }
  return firstLine + '...';
}

// --- RENDER DANH MỤC BÀI HÁT LÊN TRANG CHỦ ---
const directoryContainer = document.getElementById('directoryContainer');
const songDisplay = document.getElementById('songDisplay');
const songTools = document.getElementById('songTools');

function renderDirectory() {
  // 🔥 Bỏ qua file CSS, dùng quyền ưu tiên cao nhất của JS để ép ẩn/hiện màn hình
  songDisplay.style.setProperty('display', 'none', 'important');
  songTools.style.setProperty('display', 'none', 'important');
  directoryContainer.style.setProperty('display', 'flex', 'important');

  if (typeof songs === 'undefined' || songs.length === 0) {
    directoryContainer.innerHTML = `<div style="text-align:center; color:#999; padding:20px;">Chưa có bài hát nào trong thư viện...</div>`;
    return;
  }

  // Tạo cấu trúc thẻ Card cho từng bài hát xếp dọc
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

// --- BỘ TRÍCH XUẤT PHÂN TÁCH CHUỖI ĐA AUDIO ---
function parseAudioLinks(audioStr) {
  if (!audioStr) return [];
  return audioStr.split(';;').map(item => {
    item = item.trim();
    if (item.includes('|')) {
      const parts = item.split('|');
      return { label: parts[0].trim(), url: parts[1].trim() };
    } else {
      return { label: "Phát Audio", url: item };
    }
  }).filter(item => item.url.length > 0);
}

// --- CHUYỂN LINK DRIVE THƯỜNG THÀNH LUỒNG STREAM ĐA PHƯƠNG TIỆN ---
function getDirectDriveLink(url) {
  if (!url) return "";
  const match = url.match(/\/d\/([^/]+)/) || url.match(/id=([^&]+)/);
  if (match && match[1]) {
    return `https://docs.google.com/uc?export=download&id=${match[1]}`;
  }
  return url;
}

// --- LOGIC PHÁT NHẠC AUDIO ĐA PHIÊN BẢN VÀ THAY ĐỔI TRẠNG THÁI NÚT ---
function playAudioVersion(url, btnId, label) {
  const audioEl = document.getElementById('audioElement');
  const targetBtn = document.getElementById(btnId);
  const directUrl = getDirectDriveLink(url);
  
  // 1. Nhấn trúng nút đang chơi -> Play / Pause nhanh
  if (currentPlayingBtnId === btnId) {
    if (audioEl.paused) {
      audioEl.play();
      targetBtn.innerHTML = `⏸ Dừng ${label}`;
      targetBtn.style.background = '#d32f2f';
    } else {
      audioEl.pause();
      targetBtn.innerHTML = `▶ ${label}`;
      targetBtn.style.background = '#2b8a3e';
    }
    return;
  }
  
  // 2. Nhấn nút mới khi nút khác đang phát -> Reset nút cũ về xanh lá mặc định
  if (currentPlayingBtnId) {
    const oldBtn = document.getElementById(currentPlayingBtnId);
    if (oldBtn) {
      const oldLabel = oldBtn.innerHTML.replace('⏸ Dừng ', '').replace('▶ ', '');
      oldBtn.innerHTML = `▶ ${oldLabel}`;
      oldBtn.style.background = '#2b8a3e';
    }
  }
  
  // 3. Nạp nguồn link mới và phát nhạc
  audioEl.src = directUrl;
  audioEl.style.display = 'block';
  audioEl.play().then(() => {
    targetBtn.innerHTML = `⏸ Dừng ${label}`;
    targetBtn.style.background = '#d32f2f'; // Chuyển nút đang phát sang màu đỏ
    currentPlayingBtnId = btnId;
  }).catch(err => {
    console.error("Lỗi luồng phát nhạc:", err);
    alert("Không thể phát trực tiếp bài này. Vui lòng kiểm tra quyền chia sẻ công khai (Bất kỳ ai có liên kết) trên Google Drive!");
  });
  
  // Tự động dọn dẹp trình phát khi hết nhạc (On Ended)
  audioEl.onended = () => {
    targetBtn.innerHTML = `▶ ${label}`;
    targetBtn.style.background = '#2b8a3e';
    currentPlayingBtnId = null;
    audioEl.style.display = 'none';
  };
}

// --- XEM FILE SHEET NHẠC PDF ---
function openSheet() {
  if (!currentActiveSong) return;
  if (!currentActiveSong.sheet) {
    alert("Bài hát này chưa được cập nhật Sheet bản nhạc. Bạn có thể bổ sung liên kết vào trường 'sheet' trong file songs.js!");
    return;
  }
  window.open(currentActiveSong.sheet, '_blank');
}

// --- IN CHI TIẾT BÀI HÁT RA MÀN HÌNH ---
function renderSong(song) {
  currentActiveSong = song;
  
  // 🔥 Ép ẩn danh sách trang chủ và bật chi tiết lên mà không phụ thuộc vào file CSS bên ngoài
  directoryContainer.style.setProperty('display', 'none', 'important');
  songDisplay.style.setProperty('display', 'block', 'important');
  songTools.style.setProperty('style', 'display', 'important'); // dự phòng
  songTools.style.setProperty('display', 'flex', 'important');
  
  document.getElementById('displayTitle').textContent = song.title;
  document.getElementById('displayArtist').textContent = song.artist || "Tác giả: Chưa rõ";

  // --- LOGIC XỬ LÝ VÀ SINH NÚT AUDIO / SHEET TỰ ĐỘNG ---
  const audioEl = document.getElementById('audioElement');
  const audioContainer = document.getElementById('audioContainer');
  const sheetBtn = document.getElementById('viewSheetBtn');
  
  audioEl.style.display = 'none';
  audioEl.src = '';
  audioContainer.innerHTML = '';
  currentPlayingBtnId = null;
  
  const audioVersions = parseAudioLinks(song.audio);
  
  if (audioVersions.length === 0) {
    audioContainer.innerHTML = `
      <button style="padding: 10px 16px; background: #2b8a3e; color: white; border: none; border-radius: 6px; font-weight: bold; opacity: 0.4; cursor: not-allowed;">
          🎵 Phát Audio
      </button>
    `;
  } else {
    audioVersions.forEach((ver, index) => {
      const btn = document.createElement('button');
      btn.id = `audioBtn_${index}`;
      btn.style.cssText = "padding: 10px 16px; background: #2b8a3e; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;";
      btn.innerHTML = `▶ ${ver.label}`;
      btn.onclick = () => playAudioVersion(ver.url, btn.id, ver.label);
      audioContainer.appendChild(btn);
    });
  }
  
  // Làm mờ mờ nút Sheet bản nhạc nếu không có liên kết dữ liệu
  sheetBtn.style.opacity = song.sheet ? '1' : '0.4';
  // --------------------------------------------------

  const originalKey = song.key || "C";
  document.getElementById('currentKeyDisplay').textContent = transposeChord(originalKey, transposeSteps);

  const processedText = transposeText(song.content, transposeSteps);
  const contentArea = document.getElementById('displayContent');
  
  contentArea.textContent = processedText;
  contentArea.style.fontSize = currentFontSize + "px";
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- KHỞI CHẠY MẶC ĐỊNH ---
renderDirectory();

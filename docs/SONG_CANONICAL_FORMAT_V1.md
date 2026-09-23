# Song Canonical Format v1 — khảo sát và đề xuất

**Phase:** SONG CANONICAL FORMAT v1 — READ-ONLY SURVEY
**Ngày:** 2026-09-22
**Phạm vi:** chỉ đọc; không thay đổi dữ liệu bài hát.

## Kết quả phạm vi

**CURRENT CANONICAL BASELINE: 121 songs**

Đây là quyết định baseline do người dùng xác nhận ngày 2026-09-22, không phải
kết luận suy đoán từ Validator. Dự án trước đây có 123 bài; trong đợt đồng bộ
PDF hàng loạt, hai bài trùng lặp đã được chủ động xóa. Vì vậy `songs.js` tại
revision `4e8f3b2368fb1c2b138598faab1ce76457c81aad` có **121** object và đó là
phạm vi canonical hợp lệ. Báo cáo khảo sát đủ 121 bài hiện có; không cần điều
tra, khôi phục hoặc bổ sung hai bài đã xóa.

| Hạng mục | Kết quả |
| --- | ---: |
| Object bài hát / ID duy nhất | 121 / 121 |
| Field mỗi object | 7 |
| Dòng lời không trống / dòng trống | 2.019 / 484 |
| Ký tự `content` | 108.590 |
| Dòng có hợp âm / token hợp âm | 1.954 / 5.784 |
| Bài không có hợp âm nhận diện | 0 |
| Tông | 12: A, Am, Bm, C, Cm, D, D#, Dm, E, Em, F, G |

Không có kết luận nào trong báo cáo này nói lời hoặc hợp âm sai chỉ vì cách
trình bày khác nhau.

## Dữ liệu đang có

Mỗi object có đúng: `id` (number), `title`, `artist`, `key`, `audio`,
`sheet`, `content` (các field còn lại là string).

- 119 title bắt đầu bằng mã `[n]`; 2 bắt đầu `[n-TVCHH]`. Số bài hiện đang
  nằm trong title, không phải field riêng. Bộ chính thiếu mã 18 (đã ghi nhận
  chủ ý); TVCHH có mã 268 và 337.
- 113/121 title toàn chữ hoa. Đây là biến thể trình bày, chưa có rule chọn kiểu.
- `audio` và `sheet` đều có field nhưng 120/121 giá trị trống.
- Không có field nguồn, URL nguồn, thời điểm import, license, nhịp, trạng thái
  duyệt, collection riêng, hay section có cấu trúc.
- Author có nhiều biểu diễn: `TRỊNH CHÚC` (71), `Trịnh Chúc` (4),
  `Trịnh Trúc` (1), `TRỊNH TRÚC` (1), `Khuyết Danh` (11), cũng như chuỗi
  vai trò, dịch lời, hoặc nhiều người. Không được gộp bằng máy.

## Lời, hợp âm và bố cục

Hợp âm nằm inline trong ngoặc vuông: ví dụ `[Am]`, `[Bm7]`, `[Edim]`,
`[A7]`, `[F#sus4]`. Thống kê token gồm 4.007 basic, 1.716 minor, 32 có
`7`, 19 `m7`, 10 `sus` và dạng mở rộng khác. Không gặp slash chord trong
121 bài, nhưng chuẩn/pipeline vẫn phải hỗ trợ `[G/B]`.

Verse có cả `1. Lời` (45 dòng) và `1.Lời` (134 dòng). Chorus có `ĐK:`
(9), `Đk:` (7), và `ĐK` không dấu hai chấm (1). Có một `Intro:` ở
`[337-TVCHH] Đồi Vắng`; không có label Bridge/Outro theo mẫu máy dò. Điều đó
không chứng minh bài không có bridge/outro về mặt âm nhạc.

Dữ liệu dùng LF, không có CRLF/tab; có 484 dòng trống, không có ba dòng trống
liên tiếp. Có 547 dòng trailing whitespace, 3 dòng leading whitespace, 2
trường hợp repeated internal whitespace theo Text QA. Đây là tín hiệu về
presentation, không tự chứng minh lỗi nội dung.

## Phát hiện phân loại

### Lỗi chắc chắn ở mức kỹ thuật

Validator: 0 lỗi cấu trúc; tất cả 121 object đủ field, ID không trùng,
title/content không rỗng và key hợp lệ theo rule hiện hành.

Có 2 dấu đóng ngoặc không ghép với dấu mở, cũng là 2 warning legacy:

| Bài | Dòng | Bằng chứng |
| --- | ---: | --- |
| `[72] MỪNG KHEN GIÊHÔVA` | 24 | 44 `[` và 45 `]` |
| `[116] XIN THA THỨ` | 2 | 39 `[` và 40 `]` |

Đây là chắc chắn về cú pháp token, nhưng không chắc cách đặt lại hợp âm; vì
thế không được auto-fix.

### Điểm chưa thống nhất, không phải mặc định là lỗi

| Nhóm | Ví dụ / số liệu | Rủi ro khi nhập TVCHH |
| --- | --- | --- |
| Author/credit | casing, alias, role, dịch lời, nhiều tên | Không có authority record để chuẩn hóa an toàn. |
| Verse/chorus | `1.Lời` vs `1. Lời`; `ĐK:`, `Đk:`, `ĐK` | Extractor phải hiểu alias, không được ép source text. |
| Whitespace | 547 trailing, 3 leading | Diff nhiễu; có thể là căn chỉnh chủ ý. |
| Title casing | 113 uppercase, 8 không uppercase | Không có convention đã duyệt. |
| Metadata | audio/sheet hầu hết trống; không provenance/meter | Không thể cross-check/import có truy vết. |
| Chord grammar | basic/minor/7/m7/sus/extended; chưa có slash ở mẫu | Parser mới phải mở rộng mà không đổi dữ liệu cũ. |

Text QA báo 910 finding (562 warning, 271 info, 77 review), 0 blocking:
547 trailing whitespace, 136 verse style, 113 title casing, 52 repeated word,
22 chorus label, 19 repeated punctuation, 6 dòng dài, 7 thiếu space sau dấu
câu, 3 leading whitespace, 2 internal whitespace, 1 space trước punctuation,
và 2 bracket legacy. Các finding này chỉ để review.

## Validator gaps

Validator hiện chưa:

- nhận diện section theo nghĩa verse/chorus/bridge/intro/outro;
- đánh giá token hợp âm, vị trí hợp âm, hoặc musical correctness theo nguồn;
- xác minh author, dịch giả, nguồn, license, key/meter;
- tách số collection khỏi title thành dữ liệu canonical;
- phân biệt whitespace trình bày có chủ ý với dư thừa;
- cross-check extract PDF/OCR với nguồn có quyền.

## Song Canonical Format v1

Mục tiêu là canonical record có nguồn và trạng thái; `songs.js` chỉ là output
đã duyệt, không phải nơi nhập draft trực tiếp.

```json
{
  "schemaVersion": "song-canonical/v1",
  "id": "stable-uuid-or-existing-id",
  "collection": { "code": "tvchh", "number": 1 },
  "title": "TÊN BÀI",
  "credits": [
    { "name": "Tên nguồn", "role": "composer", "sourceText": "nguyên văn" }
  ],
  "musical": { "key": "Am", "meter": null },
  "sections": [
    {
      "kind": "verse",
      "number": 1,
      "labelSource": "1.",
      "lines": [{ "sourceText": "Lời [Am]và hợp âm", "chords": [] }]
    }
  ],
  "assets": { "audio": [], "sheet": [] },
  "provenance": {
    "sourceType": "pdf",
    "sourceUrl": null,
    "sourceReference": null,
    "extractedAt": null,
    "importedAt": null
  },
  "workflow": {
    "status": "DRAFT",
    "validation": [],
    "crossCheck": [],
    "humanReview": null,
    "approvedAt": null
  },
  "sourceSnapshot": { "title": "...", "content": "..." }
}
```

`null` nghĩa là chưa biết, không phải dữ liệu suy đoán. `sourceText` và
`sourceSnapshot` giữ nguyên extract để người duyệt thấy normalization có làm
thay đổi gì không. `credits` là mảng có role
(`composer`, `lyricist`, `translator`, `arranger`, `unknown`) để không
ép chuỗi credit phức hợp thành một tác giả. `collection.code` là enum được
duyệt; `collection.number` là integer riêng, không parse lặp lại từ title.

## Pipeline TVCHH

```
PDF / nguồn có quyền → Extract → DRAFT → Normalize → Validator
→ Cross-check → Human Review → APPROVED → songs.js → CI
```

Extract phải lưu provenance và cảnh báo OCR. DRAFT là mặc định, không được
export production. Normalize giữ source snapshot/audit log. Cross-check tạo
bằng chứng so với nguồn, không tự phê duyệt. Chỉ Human Review chuyển sang
APPROVED. Exporter chỉ nhận APPROVED, tạo reviewed changeset rồi chạy Validator,
Text QA, diff và CI.

## Chính sách normalizing

### SAFE AUTO-FIX

Chỉ cho DRAFT, luôn có audit/source snapshot. Với thư viện 121 bài đã duyệt,
ngay cả thay đổi an toàn phải qua reviewed changeset; phase này không áp dụng.

- CRLF → LF; bỏ BOM/control character không hiển thị khi không phải ký tự lời/hợp âm.
- Bỏ trailing whitespace và biến dòng trống chỉ chứa space/tab thành dòng rỗng;
  không gộp/tách dòng có chữ hoặc hợp âm.
- Unicode NFC khi hiển thị tương đương, giữ bản gốc để đảo/review.
- Chuẩn hóa kỹ thuật schema: field serialization order, `null` optional chưa
  biết, trim hai đầu URL nếu URL vẫn parse đúng.

### LEGACY NORMALIZATION POLICY

**121 bài legacy hiện tại được bảo tồn nguyên trạng.** Quyết định này dựa trên
dry-run Phase 2A: dù 674 thay đổi kỹ thuật an toàn có thể được mô phỏng, dự án
không chạy bulk normalization chỉ vì whitespace để tránh một diff dữ liệu lớn
không cần thiết.

- Canonical normalization là mặc định cho record `DRAFT` và dữ liệu import mới,
  đặc biệt TVCHH; nó không tự hồi tố vào `songs.js` legacy.
- Bất cứ thay đổi legacy nào trong tương lai, kể cả SAFE AUTO-FIX, phải qua
  reviewed changeset, review con người, Validator, Text QA, diff và CI.
- Lyrics, chords, vị trí hợp âm và mọi dữ liệu âm nhạc không bao giờ auto-fix.
- Hai bracket warnings ở `[72]` và `[116]`, cũng như 910 Text QA signals, vẫn
  là REVIEW-ONLY; chúng không trở thành auto-fix vì có trong report.

### REVIEW REQUIRED

- Ngoặc/token hợp âm bất thường, slash/extended chord không parse được, hoặc
  vị trí hợp âm; phải so với nguồn.
- Section kind, section number, label hiển thị, line break/indentation.
- Capitalization, punctuation, repeated word, internal whitespace.
- Tách/chuẩn hóa credits và alias tác giả.
- Key, meter, collection number, asset/source URL, license và dữ liệu OCR/PDF.
- Bất cứ khác biệt extract/cross-check hoặc draft confidence thấp.

### NEVER AUTO-FIX

- Lời, dấu tiếng Việt, từ lặp, ngắt dòng có nghĩa/nhịp, thứ tự câu.
- Chord root/accidental/quality/slash bass/extension, vị trí/số lượng hợp âm,
  key, transpose, meter, tempo, cấu trúc nhạc.
- Title, author/credit, source, license, collection/number, stable ID.
- Xóa/hợp nhất record, hoặc chuyển DRAFT sang APPROVED/`songs.js`.

## Quyết định cần con người

1. Chọn chỉ semantic-map hay có display convention hồi tố cho verse/chorus.
2. Cung cấp authority/source cho author variants và TVCHH credits.
3. Quy định meter, source URL/reference, license nào bắt buộc cho TVCHH.
4. Người duyệt âm nhạc xử lý hai bracket legacy và các Text QA finding.

## Công cụ và kiểm tra

- Read-only loader + thống kê toàn bộ `songs.js`.
- `npm run validate:songs`: **121 bài, 0 error, 2 warning, 64 info**.
- `npm run qa:text`: **121 bài, 910 findings, 0 CI blocking**.
- `npm test`: **9 file, 64 test passed**.
- `git diff --check`: passed.
- `git diff --exit-code -- songs.js`: passed.

Không cài Vale vì Text QA hiện hữu đã đủ dùng cho khảo sát. Không chạy
`jsondiffpatch` vì không tạo changeset/candidate data.

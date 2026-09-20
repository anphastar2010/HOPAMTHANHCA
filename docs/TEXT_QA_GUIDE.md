# Text QA guide

Text QA là công cụ chỉ đọc giúp người quản lý tìm các điểm cần xem lại trong
lời và hợp âm. Công cụ không xác nhận lời nào đúng, không sửa hợp âm, không
chuẩn hóa định dạng và không ghi vào `songs.js`.

## Chạy công cụ

Kiểm tra toàn thư viện theo policy và baseline hiện tại:

```bash
npm run qa:text
```

Lệnh này được chạy trong `npm run check`. Nó chỉ thất bại khi có lỗi kỹ thuật,
revision/policy không khớp, hoặc structural regression mới. Warning, info và
human review không làm CI thất bại.

Tạo báo cáo calibration cho đúng 8 bài đã duyệt trong Phase 4A:

```bash
npm run qa:calibration
```

Kết quả được ghi vào:

- `reports/text-qa/calibration.json`: dữ liệu máy đọc được.
- `reports/text-qa/calibration.html`: trang tĩnh dành cho người quản lý.

Thư mục report được gitignore. Report không phải source of truth; `songs.js`,
dataset revision và changeset đã review mới quyết định dữ liệu chính thức.

Calibration Phase 4B tại revision hiện tại đã kiểm tra đúng 8 bài và tạo 55
findings: 0 error, 33 warning, 19 info và 3 review. Trong đó có 2 bracket
warnings legacy, 31 trailing-whitespace warnings, 5 chorus-label info, 9
verse-number info, 5 title-capitalization info, 1 repeated-punctuation review
và 2 repeated-word review. Không có CI-blocking finding.

Các review finding có khả năng là chủ đích gồm `Intro...`, cụm `muôn muôn`, và
một lần lặp `Ngài Ngài`. Nhãn điệp khúc, numbering và title viết hoa đều cần
quyết định biên tập của con người. Hai bracket finding là lỗi cấu trúc thật
nhưng vẫn thuộc legacy baseline. Không finding nào được sửa trong calibration.

CLI cũng hỗ trợ một batch cụ thể cho giai đoạn sau:

```bash
node tools/report-text-qa.mjs --batch 01 \
  --json reports/text-qa/batch-01.json \
  --html reports/text-qa/batch-01.html
```

Không chạy hoặc rà Batch 1–15 trong Phase 4B calibration nếu chưa có ChatGPT
review mới.

## Công cụ phân tích chord như thế nào

Mỗi logical line được tokenizer chia thành text token và chord token. Các dạng
như `[C]`, `[Am7]`, `[G/B]`, `[F#maj7]`, và `[Bb]` giữ nguyên vị trí nguồn.
Whitespace và punctuation được kiểm tra trong text token thay vì xóa chord bằng
regex. Vì vậy `[C] Chúa`, `[C]Chúa`, `trong[Am]lòng`, hoặc `[C], đi` không tự
biến thành lỗi khoảng trắng.

## Mức độ finding

| Severity | Ý nghĩa | CI |
|---|---|---|
| `error` | Structural regression mới hoặc lỗi chắc chắn | FAIL |
| `warning` | Vấn đề trình bày có độ tin cậy tương đối cao hoặc structural debt legacy | Không fail |
| `info` | Thống kê quy ước chưa được con người quyết định | Không fail |
| `review` | Có thể có chủ đích trong lời hoặc âm nhạc | Không fail |

Hai unmatched `]` đã biết được lưu bằng fingerprint gồm rule, song ID, logical
line và chữ ký nội dung. Chúng vẫn xuất hiện dưới dạng warning `legacy`. Nếu lỗi
đổi dòng, đổi nội dung hoặc có lỗi structural mới, fingerprint không còn khớp
và CI sẽ thất bại.

Không thêm fingerprint mới vào baseline chỉ để làm CI xanh. Baseline chỉ được
cập nhật sau khi con người xác nhận finding là debt được chấp nhận và dataset
revision tương ứng đã được review.

## Đọc báo cáo

Mỗi finding cho biết:

- severity và rule ID;
- song ID, vị trí và tên bài;
- logical line và cột;
- snippet nguyên bản;
- giải thích;
- fingerprint và trạng thái legacy.

HTML nhóm finding theo bài và hiển thị tổng số theo severity. Nội dung bài hát
được HTML-escape và trang không chạy JavaScript.

Khi review, người quản lý đánh dấu quyết định bên ngoài source data:

1. **Giữ nguyên** — cách viết có chủ đích hoặc false positive.
2. **Sửa** — tạo đề xuất riêng, chưa sửa trực tiếp.
3. **Xem lại sau** — chưa đủ bằng chứng.

Chỉ quyết định **Sửa** đã được duyệt mới được chuyển thành changeset. Changeset
phải qua `review:changeset`, validator, data diff và browser smoke test trước khi
đưa vào thư viện.

## Các rule hiện tại

Rule warning gồm trailing/leading/repeated whitespace, ký tự invisible/control,
non-NFC và một tập punctuation-spacing hẹp. Rule info ghi nhận numbering, nhãn
điệp khúc và title viết hoa. Rule review ghi nhận dòng dài, dấu câu lặp, từ lặp
và bracket token chưa nhận diện chắc chắn.

Chord sát chữ không phải finding mặc định. English spelling, grammar, passive
voice và sentence-style rules không được áp dụng lên lời Việt.

## Vale

Phase 4B không cài và không phụ thuộc Vale. Custom engine đã cung cấp mapping,
severity, baseline và report cần thiết. Vale chỉ nên được thử trong task riêng
nếu một corpus tạm và local style chứng minh có finding hữu ích hơn mà không
tăng false positive.

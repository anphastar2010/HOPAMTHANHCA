# TVCHH Source & PDF Extraction Survey

**Phase:** 3A — TVCHH SOURCE & PDF EXTRACTION SURVEY<br>
**Ngày:** 2026-09-23<br>
**Trạng thái:** BLOCKED — thiếu PDF nguồn thực tế; không suy đoán extraction.

## Kết luận

Workspace và Git index không có file PDF nào (không phân biệt chữ hoa/thường).
Vì vậy phase này không thể khảo sát cấu trúc, extract text, OCR, chọn 5–10
sample, hay gán confidence cho lyrics/chords từ bằng chứng PDF.

Các reference hiện có đến `https://pdf.alpha2026.dpdns.org/tvchh/268.pdf` và
`.../337.pdf` là URL được resolver sinh từ title legacy; chúng không phải PDF
được lưu trong repository. Chúng không được tải hoặc dùng thay cho PDF nguồn
trong phase survey này.

## Nguồn PDF

| Thuộc tính | Kết quả |
| --- | --- |
| PDF trong workspace | Không có |
| PDF được Git theo dõi | Không có |
| Filename / size / SHA-256 | Không xác định vì không có file |
| Page count / metadata | Không xác định |
| PDF type (text, vector, scan, hybrid) | Không thể phân loại |
| Internet download/cross-check | Không thực hiện |

Không có generated extraction artifact vì không có input để extract. Không có
PDF nào được thêm vào repository.

## Extraction và confidence

Các mục dưới đây là **NOT ASSESSED**, không phải LOW và không phải suy đoán.

| Hạng mục | Trạng thái | Lý do |
| --- | --- | --- |
| Text extraction | NOT ASSESSED | Không có PDF source. |
| Vietnamese text preservation | NOT ASSESSED | Không có PDF source. |
| Layout/reading order | NOT ASSESSED | Không có PDF source. |
| Collection number/title/credits/key/meter | NOT ASSESSED | Không có PDF source. |
| Lyrics/verse/chorus/line breaks | NOT ASSESSED | Không có PDF source. |
| Chord token recognition | NOT ASSESSED | Không có PDF source. |
| Chord-to-lyric positioning | NOT ASSESSED | Không có PDF source. |
| OCR requirement | NOT ASSESSED | Chỉ quyết định sau direct text extraction. |

Đặc biệt, nhận diện token hợp âm và định vị hợp âm theo lời là hai đánh giá
riêng. Không có bằng chứng để kết luận PDF là text/vector, scan/image hoặc
hybrid; không có cơ sở để nói OCR cần hay không cần.

## Samples và đối chiếu legacy

Không chọn sample vì không thể xác nhận bài nào có trong sách hay vị trí trang.
Do đó không có so sánh với hai record legacy, và hai record này không bị sửa.

| Mục | Kết quả |
| --- | --- |
| Số sample | 0 (deferred) |
| `[268-TVCHH] Ngài Là Ai` | NOT ASSESSED — cần PDF chứa bài tương ứng |
| `[337-TVCHH] Đồi Vắng` | NOT ASSESSED — cần PDF chứa bài tương ứng |
| `songs.js` | Không đọc để thay đổi; không thay đổi dữ liệu |

Khi có PDF, sample phải gồm khoảng 5–10 bài thực tế: đầu/giữa/cuối sách, bài
đơn giản, nhiều verse, chorus/refrain, nhiều hợp âm, accidental/extended/slash
nếu PDF có, và bố cục phức tạp nếu có. Hai mã 268/337 chỉ được ưu tiên nếu
chúng thực sự xuất hiện trong PDF.

## Internet cross-check

**Không thực hiện.** Chiến lược được đề xuất, chưa triển khai:

```
PDF có provenance = primary source
Internet có provenance = secondary cross-check
Khác biệt PDF/Internet = REVIEW REQUIRED
```

Internet không được dùng để thay thế PDF, tự bổ sung lyrics/chords, hoặc xác
định canonical data. Chỉ sau khi có PDF và phạm vi nguồn được người dùng cho
phép mới đánh giá một số nguồn đối chiếu tối thiểu, kèm URL, coverage, loại nội
dung và provenance.

## Canonical Format v1 mapping (điều kiện khi có PDF)

Không tạo record nào trong phase này. Khi PDF nguồn được cung cấp, pipeline
chỉ tạo `DRAFT`; không exporter nào được phép ghi thẳng `songs.js`.

| Canonical field | Nguồn/đường đi đề xuất | Trạng thái hiện tại |
| --- | --- | --- |
| `provenance.sourceType`, filename, checksum, page refs | machine extract từ file được cung cấp | Chờ PDF |
| `collection.code`, `collection.number` | parser từ page heading; human review | Chờ PDF |
| `title`, `credits`, `musical.key`, `musical.meter` | raw extract + field-specific confidence + human review | Chờ PDF |
| `sections[].lines[].sourceText` | raw snapshot trước normalization | Chờ PDF |
| `sections[].lines[].chords` | chỉ populate khi token **và** position được chứng minh; nếu không giữ raw text | Chờ PDF |
| `assets` / license / source reference | human supplied hoặc verified source metadata | Chờ PDF |
| `workflow.status` | set machine default `DRAFT` | Thiết kế đã sẵn sàng |

## Proposed Phase 3B pipeline

Thiết kế sau đây là điều kiện, phải hiệu chỉnh theo bằng chứng sample thực tế:

```
Authorized PDF
→ file inventory (size, SHA-256, metadata, pages)
→ direct text/layout extraction
→ classify text/vector/scan/hybrid
→ OCR fallback only if direct extraction is insufficient
→ raw per-page snapshot
→ parser
→ Canonical DRAFT + field confidence/finding list
→ Validator
→ optional, provenance-recorded Internet cross-check
→ Human Review
→ APPROVED
→ Exporter
→ reviewed changeset
→ songs.js
→ CI
```

Các chốt dừng bắt buộc: không OCR trước khi thử direct extraction; không
auto-fix lyric/chord/music data; không chuyển DRAFT sang APPROVED tự động; PDF
và Internet khác nhau phải REVIEW REQUIRED.

## Điều kiện để tiếp tục

Người dùng cần cung cấp hoặc đặt trong workspace **một PDF TVCHH có quyền sử
dụng** (không cần tải hàng loạt). Sau đó Phase 3A có thể được tiếp tục với
file thực tế để tính SHA-256, metadata, page count, phân loại PDF, và survey
5–10 sample. PDF lớn sẽ không được commit nếu chưa có quyết định riêng.

## Safety

- Production baseline vẫn là 121 songs.
- Không sửa `songs.js`, legacy records, lyrics, chords, key, title, credits hay
  trạng thái approval.
- Không tạo importer production, không tạo TVCHH production record, không OCR,
  không dùng Internet.

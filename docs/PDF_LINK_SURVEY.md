1. `STATE: SURVEY_ONLY`

Khảo sát chỉ đọc hoàn tất. Chưa triển khai gì.

2. `PRECHECK`

- Repository root: `/home/alpha/AI-Workspace/HOPAMTHANHCA`
- Branch: `main`
- HEAD: `8c52a9369bae8d18652f13e41cf01405394a8ff9` — `chore: establish pre-data-review safety checkpoint`
- Upstream: `origin/main`
- Ahead/behind: ahead 1, behind 0
- Working tree: sạch; không có thay đổi staged/unstaged.
- Không có thay đổi hiện hữu liên quan PDF.
- Không đọc cấu hình `rclone`, không gọi R2/Google Drive, không tìm khóa/secret.

3. `CURRENT_DATA_MODEL`

- Nguồn dữ liệu: `songs.js`, mảng 123 bài.
- Schema thực tế mọi bài: `id`, `title`, `artist`, `key`, `audio`, `sheet`, `content`.
- Số bài đang ghép ở đầu `title`, ví dụ `[1] AI SẼ...`; không có trường `number` riêng.
- Link PDF hiện dùng trường `sheet`; không có `pdfUrl` hoặc `sheetMusicUrl`.
- Không bài nào trong `songs.js` có `sourceUrl`/`importedAt`; Studio có hỗ trợ metadata này cho dữ liệu mới.
- Chỉ một `sheet` đang có giá trị: bài `[1]`, là link Google Drive. 122 bài còn lại trống.
- Studio giữ thư viện trong bộ nhớ trình duyệt sau khi nạp `songs.js`; lưu tạm và xuất file/download. Không thấy local storage, database hoặc backend.

4. `PDF_DISPLAY_FLOW`

- UI chính: nút `#viewSheetBtn` trong `index.html`.
- `app.js` chỉ bật nút khi `song.sheet` có giá trị; khi bấm gọi `window.open(song.sheet, "_blank", "noopener")`.
- PDF hiện được mở ở tab mới, không có iframe/trình xem nhúng/tải xuống cưỡng bức.
- Studio và `editor.html` cũ đều cho nhập/sửa trường `sheet` thủ công.
- Validator hiện chỉ xác nhận `sheet` là URL HTTP(S); chưa bắt buộc HTTPS, `.pdf`, R2 domain, mã bài hay coverage.
- Không thấy CSP, CORS config, headers config, service worker hoặc cấu hình domain nào trong repository. Mở link công khai bằng `window.open` không cần CORS; chỉ cần R2 cho phép truy cập công khai.
- Mobile: thao tác sẽ chuyển sang tab/trình xem PDF hệ thống. CSS nút có `flex-wrap`; nên kiểm thử Android/iOS vì hành vi tab mới/PDF viewer phụ thuộc trình duyệt.

5. `NUMBERED_SONG_COVERAGE`

- Bài có số hợp lệ trong khoảng `1–120`: 119 bài, 119 số phân biệt.
- Thiếu: số `18`.
- Không trùng số trong `1–120`.
- Không có mã số ngoài phạm vi theo mẫu chính xác `[n]`.
- Có tiêu đề `[268 TVCHH] Ngài Là Ai` (ID `1789300042893`, vị trí 123): số 268 là ngoài bộ chính và định dạng này không khớp mẫu đề xuất `[268-TVCHH]`.
- Vì vậy hiện không thể gán an toàn đủ 120 PDF chính cho 120 bài: `18.pdf` chưa có bài tương ứng.

6. `UNNUMBERED_AND_DUPLICATE_CANDIDATES`

Ba bài không có số ở đầu:

| Vị trí | ID | Tiêu đề |
|---:|---:|---|
| 1 | `1767000271760` | `Yên vui một đời` |
| 2 | `1767001582485` | `Đồi vắng` |
| 96 | `1782288509642` | `TÌNH CON DÂNG HIẾN` |

Ứng viên trùng:

- `TÌNH CON DÂNG HIẾN` (ID `1782288509642`, vị trí 96) và `[95] TÌNH CON DÂNG HIẾN` (ID `1782288527182`, vị trí 97): tiêu đề chuẩn hóa giống nhau, cùng tác giả `TRỊNH CHÚC`, cùng tông `F`, và `content` giống byte-for-byte (1.043 ký tự, gồm cả hợp âm). Mức chắc chắn: rất cao. `NEEDS_HUMAN_CONFIRMATION` trước bất kỳ xóa/gộp nào.
- `Yên vui một đời` (ID `1767000271760`, vị trí 1) và `[118] YÊN VUI MỘT ĐỜI` (ID `1782379843052`, vị trí 119): cùng tiêu đề chuẩn hóa và cùng tác giả `Nguyễn Mộng Huỳnh`; cùng hai phiên khúc/lời điệp khúc. Bản không số tông C, bản `[118]` tông E; hợp âm tương ứng phép nâng 4 nửa cung. Bản `[118]` lặp lại điệp khúc sau phiên khúc 2, nên không byte-identical. Mức chắc chắn: cao, nhưng vẫn `NEEDS_HUMAN_CONFIRMATION` vì có thể là hai arrangement chủ ý.
- `Đồi vắng` không có đối tác cùng tiêu đề/tác giả/nội dung trong 122 bài còn lại; không phải ứng viên trùng từ bằng chứng hiện có.

7. `OPTIONS_COMPARISON`

| Phương án | Ảnh hưởng dữ liệu | Mở rộng | Rủi ro / rollback |
|---|---|---|---|
| A. Quy tắc URL tập trung | Không cần ghi 120 URL; chỉ cần mã metadata đã duyệt cho ngoại lệ như Đồi Vắng | Tốt: thêm bộ tuyển tập bằng bảng quy tắc nhỏ | Thấp nếu parser nghiêm ngặt và validator coverage; rollback bằng hoàn tác code |
| B. Migration ghi URL | Sửa khoảng 120 bản ghi `songs.js` | Kém hơn; mỗi bộ mới cần migration | Rủi ro map sai/diff dữ liệu lớn; rollback bằng Git nhưng vẫn phải review từng URL |
| C. Manifest riêng | Không sửa lời/hợp âm; thêm file mapping | Tốt cho ngoại lệ phức tạp | 120 dòng mapping có nguy cơ sai/thiếu; rollback dễ nhưng phải duy trì manifest và validator |

- A cần thay đổi tối thiểu, không phụ thuộc Google Drive, và không đưa secret vào source.
- B không phù hợp ưu tiên hiện tại vì tạo diff lớn trên dữ liệu bài hát.
- C phù hợp nếu sau này có nhiều ngoại lệ không thể suy ra từ mã; không cần cho 120 PDF tuần tự hiện tại.

8. `RECOMMENDED_DESIGN`

Khuyến nghị: **A — resolver URL tập trung, parser strict, validator coverage**.

- Bộ chính: chỉ nhận tiêu đề đầu bằng chính xác `[1]` đến `[120]`, sinh `https://pdf.alpha2026.dpdns.org/thanhca/{number}.pdf`.
- TVCHH: dùng mã metadata rõ ràng, ví dụ `pdfCode: "337-TVCHH"` cho Đồi Vắng, sinh `https://pdf.alpha2026.dpdns.org/tvchh/337.pdf`. Cách này giữ nguyên tiêu đề hiển thị `Đồi vắng`.
- Không hợp lệ/không có mã: resolver trả `null`; UI không hiện hoặc vô hiệu hóa nút PDF; validator cảnh báo.
- `[268 TVCHH] Ngài Là Ai` phải bị validator báo mã tuyển tập sai định dạng, không tự gán URL.
- Resolver nên được UI dùng thay cho truy cập trực tiếp `song.sheet`. Cần quyết định rõ ưu tiên URL tự sinh đối với link `sheet` Google Drive hiện có của bài 1; để chuyển hoàn toàn sang R2, URL tự sinh phải được ưu tiên.

Kết luận: có thể tự động liên kết PDF mà không mở từng bài trong Studio. Tuy nhiên hiện chỉ an toàn cho 119 bài chính có mã hợp lệ; chưa thể khẳng định link đủ 120 PDF vì thiếu bài số 18.

9. `FILES_THAT_WOULD_CHANGE`

Chưa file nào thay đổi. Nếu triển khai phương án A trong tương lai, dự kiến:

- Tạo `src/pdf-links.js`: parse/resolve URL tập trung.
- Sửa `app.js`: dùng URL đã resolve và chỉ hiện nút khi URL hợp lệ.
- Sửa `src/song-validator.js`: kiểm tra mã, HTTPS, `.pdf`, coverage/trùng số/mã bộ tuyển tập.
- Sửa hoặc thêm test liên quan resolver/validator/UI.
- Có thể sửa `studio.js` và `studio.html`: hiển thị PDF tính toán/cảnh báo thay vì yêu cầu nhập URL.
- Có thể sửa `songs.js` đúng một bài, chỉ sau duyệt của người quản trị, để thêm metadata `pdfCode: "337-TVCHH"` cho Đồi Vắng.
- Cập nhật `docs/PROJECT_LOG.md` khi có thay đổi thực tế.

10. `PROPOSED_TESTS`

- Resolver sinh đúng 119 URL hiện có cho số `1–120`, và validator báo thiếu `18`.
- Không sinh URL cho ba bài không số.
- `pdfCode: "337-TVCHH"` sinh đúng `https://pdf.alpha2026.dpdns.org/tvchh/337.pdf`.
- Mã `[268 TVCHH]` bị cảnh báo, không sinh URL.
- URL phải HTTPS và kết thúc `.pdf`.
- Lời/hợp âm không bị sửa khi resolve URL.
- UI chỉ bật nút PDF với URL hợp lệ.
- Test tab mới/mobile bằng browser smoke và kiểm thử thiết bị thật.
- Validator phát hiện thiếu/trùng số, mã TVCHH sai format, URL bất hợp lệ.

11. `RISKS_AND_BLOCKERS`

- Blocker chính: thiếu bài số 18; không có cơ sở để gán `18.pdf`.
- Link Google Drive hiện hữu ở bài 1 cần quyết định precedence khi R2 được bật.
- Hai bản nghi trùng không được xóa/gộp tự động.
- Cần xác nhận ý nghĩa của `[268 TVCHH]` và chuẩn hóa mã nếu muốn phục vụ PDF của bài đó.
- Không có bằng chứng tại repository về CSP/header triển khai thực tế của GitHub Pages; cần kiểm tra production sau triển khai.

12. `HUMAN_DECISIONS_REQUIRED`

- Xác định bài nào tương ứng `18.pdf`, hoặc xác nhận file này không có bài trong thư viện.
- Xác nhận xóa/gộp hay giữ nguyên hai cặp nghi trùng.
- Duyệt thêm `pdfCode: "337-TVCHH"` cho Đồi Vắng; URL mục tiêu là `https://pdf.alpha2026.dpdns.org/tvchh/337.pdf`.
- Quyết định URL R2 có ghi đè link `sheet` Google Drive hiện có của bài 1 không.
- Xác nhận chuẩn hóa `[268 TVCHH]` thành một mã tuyển tập hợp lệ nếu cần liên kết PDF.

13. `COMMANDS_RUN`

- `pwd`, `rg --files`, `sed` để đọc `AGENTS.md`, `README.md`, `docs/PROJECT_LOG.md`, source và test liên quan.
- `git status --short --branch`, `git rev-parse`, `git rev-list`, `git log`, `git diff --name-only`, `git diff --check`, `git diff --exit-code -- songs.js`.
- `rg` tìm các điểm dùng PDF/sheet/storage/CSP.
- `npm run validate:songs`: passed — 123 bài, 0 lỗi, 2 cảnh báo legacy, 63 thông tin.
- Probe Node chỉ đọc dùng loader hiện hữu để thống kê coverage và so sánh bản ghi. Một probe đầu có lỗi cú pháp trước khi đọc kết quả; probe chạy lại thành công. Không có file được tạo/sửa.

14. `FILES_CHANGED: NONE`

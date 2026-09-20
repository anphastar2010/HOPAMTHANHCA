# Chính sách rà soát chất lượng lời và hợp âm

## 1. Mục đích

Tài liệu này giúp người quản lý đọc một finding của Text QA và chọn một trong
ba quyết định: **SỬA**, **GIỮ NGUYÊN**, hoặc **XEM LẠI SAU**.

Text QA chỉ chỉ ra chỗ đáng chú ý. Công cụ không biết bản lời, hợp âm hay cách
trình bày nào là đúng về âm nhạc. Trong toàn bộ Phase 4:

> **AUTO-FIX = NO**

Không quyết định nào trong report tự thay đổi `songs.js`. Report chỉ là tài
liệu hỗ trợ; dữ liệu và changeset đã qua review mới là nguồn chính thức.

## 2. Ba quyết định của người rà soát

### SỬA

Chọn **SỬA** khi đã xem đủ cả dòng và ngữ cảnh của bài, xác nhận finding là vấn
đề thật, và biết nội dung dự kiến sau khi sửa.

**SỬA** chỉ cho phép tạo một đề xuất changeset. Nó chưa sửa trực tiếp
`songs.js`, chưa phải phê duyệt cuối và chưa được bỏ qua validator, diff hoặc
smoke test.

### GIỮ NGUYÊN

Chọn **GIỮ NGUYÊN** khi cách viết hoặc vị trí chord có chủ đích, finding là
false positive, hoặc dữ liệu đang phản ánh đúng nguồn đã được chấp thuận.

**GIỮ NGUYÊN** không có nghĩa là thêm finding vào structural baseline. Baseline
chỉ thay đổi theo quy trình riêng, có lý do, dataset revision và review.

### XEM LẠI SAU

Chọn **XEM LẠI SAU** khi thiếu bản nhạc, nguồn lời, ngữ cảnh đoạn trước/sau,
hoặc chưa thống nhất quy ước biên tập.

Quyết định này không được tự chuyển thành **SỬA**. Finding phải giữ nguyên trạng
thái cho tới lần rà soát tiếp theo.

## 3. Cách hiểu gợi ý mặc định

| Gợi ý | Ý nghĩa |
|---|---|
| `LIKELY_FIX` | Dấu hiệu kỹ thuật khá rõ; vẫn phải xem ngữ cảnh rồi mới chọn SỬA. |
| `LIKELY_KEEP` | Thường là cách trình bày âm nhạc có chủ đích; chỉ sửa khi có bằng chứng rõ. |
| `REVIEW_FIRST` | Chưa được hành động trước khi người quản lý xem dòng và ngữ cảnh. |
| `CONTEXT_REQUIRED` | Không thể quyết định từ một snippet; cần lời, bản nhạc hoặc nguồn đối chiếu. |

Độ tin cậy cao của máy chỉ nói rằng công cụ đã nhận diện đúng mẫu. Nó không cấp
quyền tự sửa nội dung bài hát.

## 4. Bảng quyết định theo rule

### A. Cấu trúc chord

| Rule | Công cụ báo gì | Tin cậy | Gợi ý mặc định | Chọn SỬA khi | Chọn GIỮ NGUYÊN khi | Chọn XEM LẠI SAU khi | Auto-fix |
|---|---|---|---|---|---|---|---|
| `bracket-unmatched-close` | Có `]` không có `[` mở tương ứng. | Cao về cấu trúc. | `REVIEW_FIRST` | Đã xác định chord hoặc ký tự đúng cần khôi phục. Finding mới phải được ưu tiên review. | Chỉ khi có bằng chứng dấu `]` là văn bản có chủ đích; không dùng lựa chọn này để che regression. | Chưa biết chord đúng hoặc chưa có nguồn đối chiếu. Hai finding legacy hiện thuộc trường hợp này cho tới khi được duyệt. | NO |
| `bracket-unmatched-open` | Có `[` nhưng không có `]` đóng. | Cao về cấu trúc. | `LIKELY_FIX` | Đã xác định rõ ranh giới chord cần đóng hoặc ký tự thừa cần bỏ. | Có bằng chứng `[` là ký tự lời có chủ đích. | Chưa xác định nội dung chord đúng. | NO |
| `chord-empty-token` | Có token chord rỗng `[]`. | Rất cao. | `LIKELY_FIX` | Xác định được chord cần điền hoặc xác nhận token phải bị loại bỏ. | Chỉ khi nguồn thật sự yêu cầu ký hiệu này và có lý do được ghi lại. | Không biết chord bị thiếu là gì. | NO |
| `chord-malformed-token` | Ngoặc chord bị lồng hoặc có cấu trúc hỏng. | Cao về cú pháp. | `LIKELY_FIX` | Có thể đối chiếu để viết lại đúng một chord cụ thể. | Ký hiệu là nội dung lời có chủ đích và không phải chord. | Không đủ dữ liệu để tái tạo chord. | NO |
| `chord-token-review` | Nội dung trong `[]` không khớp mẫu chord phổ biến. | Thấp về ý nghĩa âm nhạc. | `CONTEXT_REQUIRED` | Bản nhạc hoặc nguồn xác nhận chord/token bị nhập sai. | Đây là ký hiệu âm nhạc hợp lệ ngoài tập mẫu hiện tại. | Chưa có bản nhạc hoặc người hiểu hòa âm kiểm tra. | NO |

Hai unmatched `]` hiện có là structural debt legacy. Chúng phải tiếp tục xuất
hiện trong report nhưng không được tự sửa và không được thêm fingerprint mới để
làm CI xanh. Một finding structural mới hoặc bị đổi vị trí/nội dung vẫn là
regression làm CI thất bại.

### B. Khoảng trắng và Unicode

| Rule | Công cụ báo gì | Tin cậy | Gợi ý mặc định | Chọn SỬA khi | Chọn GIỮ NGUYÊN khi | Chọn XEM LẠI SAU khi | Auto-fix |
|---|---|---|---|---|---|---|---|
| `trailing-whitespace` | Dòng không trống có khoảng trắng ở cuối. | Cao. | `LIKELY_FIX` | Đã xem diff và chắc chắn xóa khoảng trắng không đổi ngắt dòng hay vị trí trình bày. | Khoảng trắng cuối dòng có vai trò đã được chứng minh trong một quy trình xuất cụ thể. | Đang nằm trong một cleanup lớn chưa thể review an toàn. | NO |
| `leading-whitespace` | Dòng không trống bắt đầu bằng khoảng trắng. | Cao về mẫu, trung bình về ý nghĩa. | `CONTEXT_REQUIRED` | Khoảng trắng là dư thừa và không dùng để thụt dòng. | Thụt dòng là cách trình bày đoạn, bè hoặc phần đáp có chủ đích. | Chưa rõ cấu trúc đoạn hát. | NO |
| `repeated-internal-whitespace` | Nhiều khoảng trắng liên tiếp trong cùng đoạn chữ, không do chord tạo ra. | Cao. | `REVIEW_FIRST` | Đã xác nhận không phải căn chỉnh hoặc khoảng nghỉ có chủ đích. | Khoảng cách thể hiện bố cục được chấp thuận. | Không thấy được bố cục/bản nguồn đầy đủ. | NO |
| `invisible-control-character` | Có ký tự điều khiển hoặc ký tự vô hình. | Rất cao về sự tồn tại. | `LIKELY_FIX` | Xác định ký tự không mang ý nghĩa và có thể loại bỏ an toàn. | Ký tự thuộc định dạng nguồn bắt buộc và tác dụng đã được kiểm chứng. | Chưa xác định loại ký tự hoặc hậu quả khi bỏ. | NO |
| `non-nfc-text` | Chữ Unicode không ở dạng NFC. | Rất cao về kỹ thuật. | `LIKELY_FIX` | Đã chứng minh chuẩn hóa không đổi chữ hiển thị, tìm kiếm hoặc mapping. | Có yêu cầu tương thích nguồn cụ thể cần giữ dạng hiện tại. | Chưa kiểm tra tác động tới diff, tìm kiếm hoặc nguồn. | NO |

550 trailing-whitespace findings toàn thư viện là debt đã biết. `LIKELY_FIX`
không cho phép bulk-fix; từng thay đổi vẫn phải nằm trong batch và changeset có
thể review.

### C. Dấu câu

| Rule | Công cụ báo gì | Tin cậy | Gợi ý mặc định | Chọn SỬA khi | Chọn GIỮ NGUYÊN khi | Chọn XEM LẠI SAU khi | Auto-fix |
|---|---|---|---|---|---|---|---|
| `punctuation-space-before` | Có khoảng trắng ngay trước một dấu câu được kiểm tra. | Khá cao. | `REVIEW_FIRST` | Đó là khoảng trắng nhập nhầm, không liên quan nhịp hoặc nhãn đoạn. | Bố cục/nguồn dùng khoảng cách này có chủ đích. | Dòng chứa ký hiệu đặc biệt hoặc cần so nguồn. | NO |
| `punctuation-missing-space-after` | Không có khoảng trắng sau dấu câu trong cùng đoạn chữ. | Khá cao về mẫu, trung bình về ý nghĩa. | `REVIEW_FIRST` | Dấu câu nối hai từ bình thường và đã xác nhận cần khoảng trắng. | Là nhãn, ký hiệu, số, viết tắt hoặc cách ngắt nhịp có chủ đích. | Chưa thống nhất quy ước hoặc thiếu ngữ cảnh. | NO |
| `repeated-punctuation-review` | Dấu câu lặp như `...`. | Thấp về lỗi. | `CONTEXT_REQUIRED` | Nguồn và ngữ cảnh xác nhận ký tự bị lặp do nhập sai. | Dùng để chỉ ngân, ngắt, cảm xúc hoặc phần `Intro...`. | Chưa biết ý đồ trình bày. | NO |

Dấu câu trong lời hát không được chuẩn hóa như văn xuôi. Ví dụ calibration
`Intro...` có khả năng là cách trình bày có chủ đích.

### D. Quy ước trình bày

| Rule | Công cụ báo gì | Tin cậy | Gợi ý mặc định | Chọn SỬA khi | Chọn GIỮ NGUYÊN khi | Chọn XEM LẠI SAU khi | Auto-fix |
|---|---|---|---|---|---|---|---|
| `verse-number-style-review` | Ghi nhận dạng như `1.Bỏ` để so với `1. Bỏ`. | Cao về nhận diện, không kết luận đúng/sai. | `REVIEW_FIRST` | Dự án đã duyệt chuẩn numbering và thay đổi thuộc batch đang review. | Giữ theo nguồn hoặc quy ước của bài đã được chấp thuận. | Chuẩn chung chưa được quyết định. | NO |
| `chorus-label-style-review` | Ghi nhận `ĐK:`, `Đk:`, `Đk.`, `ĐK :` hoặc dạng tương tự. | Cao về nhận diện, không kết luận đúng/sai. | `REVIEW_FIRST` | Chuẩn nhãn điệp khúc đã được duyệt và ngữ cảnh đúng là điệp khúc. | Cách ghi theo nguồn hoặc mang nghĩa riêng trong bài. | Chuẩn chung chưa được quyết định. | NO |
| `title-capitalization-review` | Tiêu đề viết hoa toàn bộ. | Cao về nhận diện, không phải lỗi. | `REVIEW_FIRST` | Dự án đã duyệt quy ước tiêu đề và xác nhận thay đổi không làm sai tên riêng. | Giữ cách viết từ nguồn hoặc phong cách hiện tại. | Chưa có quy ước title capitalization. | NO |

Phase 4C không chọn chuẩn cho nhãn điệp khúc, numbering hoặc kiểu viết tiêu đề.

### E. Nội dung âm nhạc và lời hát

| Rule/tín hiệu | Công cụ báo gì | Tin cậy | Gợi ý mặc định | Chọn SỬA khi | Chọn GIỮ NGUYÊN khi | Chọn XEM LẠI SAU khi | Auto-fix |
|---|---|---|---|---|---|---|---|
| `long-line-review` | Dòng dài hơn ngưỡng khảo sát sau khi bỏ qua chord token. | Thấp về lỗi. | `CONTEXT_REQUIRED` | Người quản lý xác định được điểm xuống dòng đúng mà không đổi lời/chord. | Dòng dài phản ánh đúng một câu hoặc bố cục nguồn. | Cần xem bản nhạc, nhịp hoặc giao diện thực tế. | NO |
| `repeated-word-review` | Hai từ liền nhau giống nhau. | Thấp về lỗi. | `CONTEXT_REQUIRED` | Nguồn đáng tin cậy xác nhận một từ bị nhập lặp. | Lặp từ là chủ đích trong lời hát, như `muôn muôn`. | Trường hợp còn mơ hồ, như `Ngài Ngài`, chưa được đối chiếu. | NO |
| Chord sát chữ | Chord đứng sát hoặc nằm giữa từ. Đây không phải finding mặc định. | Không áp dụng. | `LIKELY_KEEP` | Chỉ khi bản nhạc hoặc nguồn xác nhận chord đặt sai vị trí. | Chord đánh dấu đúng âm tiết hoặc thời điểm chuyển hợp âm. | Không có bản nhạc/người biết bài để xác nhận. | NO |
| Xuống dòng | Cách chia câu hoặc đoạn có vẻ bất thường. Hiện chỉ là tín hiệu human review. | Thấp. | `CONTEXT_REQUIRED` | Đã xác định cấu trúc câu/đoạn đúng từ bản nhạc hoặc nguồn. | Ngắt dòng theo câu hát, bè hoặc nhịp có chủ đích. | Chưa có đủ ngữ cảnh âm nhạc. | NO |

## 5. Bài học từ calibration

Calibration gồm 8 bài và 55 findings: 0 error, 33 warning, 19 info, 3 human
review và 0 CI-blocking. Những ví dụ sau chỉ minh họa cách quyết định, không
phải lệnh sửa:

- `Intro...`: ưu tiên **GIỮ NGUYÊN** hoặc **XEM LẠI SAU** vì dấu ba chấm có thể
  là ký hiệu trình bày.
- `muôn muôn`: ưu tiên **GIỮ NGUYÊN** vì đây có thể là lặp từ có chủ đích.
- `Ngài Ngài`: **XEM LẠI SAU** cho tới khi đọc ngữ cảnh và đối chiếu nguồn.
- `1.Bỏ`, `ĐK:`, `Đk:` và tiêu đề viết hoa: **XEM LẠI SAU** khi quy ước chung
  chưa được duyệt.
- Hai unmatched `]` legacy: ưu tiên cao về cấu trúc nhưng vẫn **XEM LẠI SAU**
  hoặc **SỬA** chỉ sau khi biết chính xác chord đúng.
- Chord sát chữ: mặc định không phải lỗi.

## 6. Mẫu review card

Mỗi finding trong batch sau này nên được đưa cho người quản lý theo mẫu ngắn:

```text
Bài: <tên bài>
Song ID: <ID ổn định>
Dòng: <logical line>
Rule: <rule ID>
Mức: <error / warning / info / review>
Nội dung: <dòng và phần context cần thiết>
Lý do báo: <giải thích bằng tiếng Việt>
Gợi ý mặc định: <LIKELY_FIX / LIKELY_KEEP / REVIEW_FIRST / CONTEXT_REQUIRED>

Quyết định:
[ ] SỬA
[ ] GIỮ NGUYÊN
[ ] XEM LẠI SAU

Ghi chú: ______________________________________________
Nguồn/bản nhạc đã đối chiếu (nếu có): __________________
```

Reviewer không cần đọc JSON, regex hoặc mã nguồn để dùng card. Report phải luôn
hiển thị dataset revision để tránh quyết định trên dữ liệu đã cũ.

## 7. Quy trình review batch

```text
QA finding
  → reviewer đọc cả dòng và context
  → chọn SỬA / GIỮ NGUYÊN / XEM LẠI SAU
  → chỉ quyết định SỬA mới được chuyển thành proposed changeset
  → review changeset
  → validator
  → Text QA
  → data diff
  → browser smoke test
  → human approval
  → merge
```

Quy tắc bắt buộc:

1. **GIỮ NGUYÊN** không tạo baseline fingerprint.
2. **XEM LẠI SAU** không tự chuyển thành **SỬA**.
3. **SỬA** chỉ cho phép tạo proposed changeset; không ghi trực tiếp vào
   `songs.js`.
4. Chỉ mở một batch chưa hoàn tất tại một thời điểm.
5. Structural baseline chỉ thay đổi trong một review riêng, có lý do, exact
   fingerprint và dataset revision.
6. Generated report và review card không thay thế source data hoặc changeset.

## 8. Những quyết định biên tập chưa chốt

Phase 4C chưa quyết định:

- dùng `ĐK:`, `Đk:`, `Điệp khúc:` hay dạng khác;
- bắt buộc `1.Bỏ` hay `1. Bỏ`;
- tiêu đề viết HOA, Title Case hay giữ theo nguồn;
- có xử lý trailing whitespace theo từng batch hay bằng một changeset kỹ thuật
  riêng trong tương lai;
- cách xử lý từng trường hợp lặp từ, dấu câu, dòng dài và xuống dòng;
- nội dung sửa chính xác cho hai bracket findings legacy.

Các quyết định này phải được chủ dự án hoặc người quản lý nội dung phê duyệt
trước khi chúng trở thành quy tắc chỉnh dữ liệu.

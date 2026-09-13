# Hợp Âm Thờ Phượng

Ứng dụng web tĩnh để tra cứu lời và hợp âm bài hát thờ phượng. Website chạy trên GitHub Pages, không cần máy chủ.

## Các trang

- `index.html`: trang tra cứu dành cho người dùng.
- `studio.html`: trang quản trị mới — nhập MusicXML, chỉnh thư viện và xuất dữ liệu.
- `editor.html`: công cụ cũ, giữ lại để dự phòng.
- `songs.js`: thư viện bài hát đang được website sử dụng.

## Quy trình cập nhật bài hát

1. Mở `studio.html` cùng thư mục với `songs.js`.
2. Dùng danh sách bên trái để tìm bài có sẵn, rồi sửa tên, tác giả, tông, audio, Sheet PDF, lời hoặc hợp âm.
3. Hợp âm luôn đặt trong ngoặc vuông: `[C]`, `[Am7]`, `[G/B]`.
4. Kiểm tra preview, bấm **Lưu vào thư viện tạm**, rồi **Xuất songs.js**.
5. Thay file `songs.js` của repository bằng file vừa xuất và kiểm tra lại trên điện thoại lẫn máy tính.

Studio không ghi trực tiếp vào GitHub; xuất file là bước chủ động để tránh mất dữ liệu.

## Nhập từ MuseScore MusicXML

MuseScore Studio xuất MusicXML 4.0 phù hợp với Studio.

1. Trong MuseScore chọn **File → Export → MusicXML**.
2. Chọn bản **không nén** `.musicxml` hoặc `.xml`.
3. Trong Studio, chọn file ở khu vực **Nhập MusicXML**.
4. Studio đọc title, composer, key, các dòng lyric và chord symbol (`harmony`). Rà lại lời/hợp âm trước khi lưu.

Nếu score có nhiều lyric line (như verse 1/2/3), Studio gộp chúng thành các đoạn đánh số để bạn chỉnh tiếp.

## Nhập nội dung đã sao chép từ Hợp Âm Chuẩn

Chỉ dùng nội dung khi bạn có quyền/phạm vi sử dụng phù hợp.

1. Trên trang bài hát, bôi đen **chỉ phần lời và hợp âm**: từ câu hát đầu tiên đến câu hát cuối; không lấy menu, bình luận, quảng cáo hay danh sách hợp âm cuối trang.
2. Sao chép và dán vào khu **Nhập bằng nội dung đã sao chép** của Studio.
3. Dán URL nguồn vào ô kế bên để Studio lưu `sourceUrl` và `importedAt` lúc bạn lưu bài.
4. Điền/rà tên bài, tác giả và tông; sửa lại ngắt dòng, lời và hợp âm nếu cần.
5. Lưu tạm rồi xuất `songs.js`. Website của bạn sau đó chỉ dùng bản dữ liệu cục bộ, không gọi lại trang nguồn.

## Thiết kế và kỹ thuật đã áp dụng

- Font Be Vietnam Pro cho lời, JetBrains Mono cho hợp âm.
- Hợp âm được render thành phần tử riêng để dễ đọc, đổi tông và không chèn HTML từ dữ liệu bài hát.
- Card và điều khiển hỗ trợ bàn phím/focus rõ ràng.
- MusicXML parser ưu tiên cấu trúc MuseScore mẫu: `work-title`, `creator[type=composer]`, `key/fifths`, `harmony`, `lyric`.

## Hướng tiếp theo: ảnh/PDF sheet nhạc

Có thể hỗ trợ ảnh chụp sheet, nhưng nên thực hiện theo hai tầng:

1. OCR để lấy tiêu đề, lời và chord symbol; người dùng luôn cần rà/sửa kết quả.
2. Optical Music Recognition (OMR) để đọc nốt và khuông nhạc — khó hơn nhiều, đặc biệt với ảnh nghiêng/mờ hoặc bố cục nhiều bè.

Phiên bản đầu nên chỉ hỗ trợ ảnh rõ nét có lời/hợp âm in sẵn, xuất thành bản nháp trong Studio. Không nên tự động coi kết quả là chính xác hay dùng ảnh mờ làm nguồn duy nhất.

## Checklist trước khi commit

- Mở `index.html`, tìm và chọn một bài.
- Kiểm tra đổi tông, cỡ chữ, audio/Sheet khi có.
- Mở `studio.html`, nạp `songs.js`, sửa một bài thử và export.
- Kiểm tra cú pháp `songs.js` và dữ liệu tiếng Việt.

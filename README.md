# Hợp Âm Thờ Phượng

Ứng dụng web tĩnh để tra cứu lời và hợp âm các bài hát thờ phượng. Website chạy trực tiếp trên GitHub Pages, không cần máy chủ.

## Tính năng

- Tìm theo tên bài, tác giả hoặc lời nhạc
- Điều chỉnh tông, bao gồm hợp âm slash chord như `C/E`
- Điều chỉnh cỡ chữ khi trình chiếu hoặc sử dụng trên điện thoại
- Mở audio và Sheet PDF khi bài hát có liên kết
- Trang `editor.html` hỗ trợ nhập và xuất thư viện bài hát

## Chạy và xuất bản

Mở `index.html` trong trình duyệt để xem cục bộ. Khi cập nhật các file trên nhánh `main`, GitHub Pages sẽ tự xuất bản phiên bản mới.

## Dữ liệu bài hát

Dữ liệu hiện được lưu trong `songs.js` dưới dạng mảng `songs`. Mỗi bài gồm:

`id`, `title`, `artist`, `key`, `content`, và tùy chọn `audio`/`sheet`.

- `content`: hợp âm đặt trong ngoặc vuông, ví dụ `[C] Lời bài hát`.
- `audio`: một hoặc nhiều liên kết, phân cách bằng `;;`; mỗi liên kết có thể có nhãn theo cú pháp `Tên bản|URL`.
- `sheet`: URL đến Sheet PDF công khai.

## Quy ước đóng góp

1. Không chèn HTML vào trường dữ liệu bài hát.
2. Kiểm tra liên kết audio/Sheet có quyền truy cập công khai trước khi xuất bản.
3. Kiểm tra trên điện thoại lẫn máy tính sau khi đổi giao diện.
4. Ghi commit ngắn gọn, nêu rõ mục đích thay đổi.

## Hướng phát triển

Bước tiếp theo là chuyển thư viện từ `songs.js` sang JSON có kiểm tra schema, rồi thêm kiểm thử tự động cho cú pháp và cấu trúc dữ liệu.

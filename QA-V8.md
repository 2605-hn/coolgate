# QA V8 — Báo cáo kiểm tra

## Đã kiểm tra
- `node --check` chạy thành công với `server.js`, `public/game.js` và các tệp JavaScript trong `public/3d/js/`.
- Đã kiểm tra các thay đổi chính bằng cách rà soát luồng: thiếu manh mối thì không mở được câu đố; mã sai không kết thúc chương; mã đúng mới gọi luồng hoàn thành; khóa chương 2 hiện có vẫn được giữ lại.
- Bản 2D `public/index.html` và `public/game.js` không bị chỉnh sửa trong V8.
- Đóng gói ZIP và kiểm tra tính toàn vẹn CRC sau khi tạo.

## Chưa kiểm thử được
- Chưa thực hiện playtest tương tác trong trình duyệt/WebGL.
- Chưa đo thời lượng chơi thực tế.
- Chưa xác nhận âm thanh, độ khó truy đuổi hoặc hiệu năng trên máy người chơi.
- Kiểm tra cú pháp không chứng minh gameplay hoạt động hoàn toàn.

## Các luồng nên thử thủ công
1. Mở bản 2D từ `/` và xác nhận vẫn tải được.
2. Mở `/3d/`, tìm đủ ba manh mối chương 1, tới cửa, thử mã sai rồi mã `431`.
3. Xác nhận chương 1 hoàn thành và chương 2 được mở khóa.
4. Mở `/3d/?chapter=2`, thu thập đủ ba dấu vết, nhập mã sai rồi `0317`.
5. Thử Esc/tạm dừng, chơi lại và tải lại trang.

## Bản sửa lỗi V8.1 (sau khi rà soát chương 2)
- Đã sửa tham chiếu thân chiếc đò (`ferryHull`) để sự kiện cấp 2/cấp 3 không truy cập `undefined`.
- Thêm kiểm tra an toàn khi kích hoạt/cập nhật hiệu ứng chiếc đò và đèn lồng.
- Dời điểm xuất hiện chương 2 xa vùng tương tác lối thoát để tránh bắt đầu ngay sát điểm thoát.
- Đã chạy lại `node --check` cho `public/3d/js/main.js` và `public/3d/js/controls.js`: đạt.
- Đã so sánh `public/index.html` và `public/game.js` với V7: không thay đổi.
- Chưa playtest trong trình duyệt; cần kiểm tra trực tiếp các sự kiện sau khi thu thập manh mối thứ 2 và thứ 3.

# QA V5 — kết quả và giới hạn

## Đã kiểm tra tự động
- `node --check server.js`: PASS.
- `node --check public/game.js`: PASS.
- `node --check public/3d/js/main.js`: PASS.
- `node --check public/3d/js/controls.js`: PASS.
- `node --check public/3d/js/collision.js`: PASS.
- `node --check public/3d/js/room.js`: PASS.
- `node --check public/3d/js/textures.js`: PASS.
- Kiểm tra ZIP sau đóng gói (CRC): PASS.
- SHA-256 `public/index.html` và `public/game.js` trùng bản gốc: PASS; bản 2D được giữ nguyên.
- Kiểm tra tham chiếu tĩnh các module tương đối và file CSS/HTML: PASS.

## Chưa xác minh trong môi trường này
- `npm install` bị timeout trong môi trường tạo gói, vì vậy chưa thể khởi động server Express tại đây để kiểm tra HTTP 200 thực tế.
- Chưa kiểm thử trình duyệt/WebGL bằng tương tác thật; chưa xác minh bằng mắt các va chạm, độ khó, âm lượng và hiệu ứng sương trên máy người chơi.
- Chưa đo thời lượng chơi thực tế. Mục tiêu 20–30 phút vẫn là mục tiêu thiết kế, không phải thời lượng đã được xác nhận ở prototype hiện tại.

## Kiểm thử thủ công đề xuất
1. `npm install`, `npm start`; kiểm tra `/`, `/3d/`, `/3d/js/main.js`.
2. Hoàn thành chương 1; xác nhận nút “Tiếp tục: Chương 2” xuất hiện.
3. Mở chương 2 qua nút đó; xác nhận bến đò hiện ra và ba dấu vết có thể điều tra.
4. Kiểm tra đụng vật cản, truy đuổi, thắng/thua và chơi lại.

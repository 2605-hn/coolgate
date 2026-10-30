# QA V7

- `node --check` trên `server.js` và tất cả JavaScript trong `public/`: kiểm tra cú pháp.
- ZIP integrity: kiểm tra CRC sau khi đóng gói.
- So sánh SHA-256 `public/index.html` và `public/game.js` với V6 để xác nhận phần game 2D không đổi.
- Kiểm tra import tương đối từ các module JS của 3D.

Chưa thể xác nhận trong báo cáo này: chạy server với đầy đủ dependencies, điều khiển game qua trình duyệt, WebGL trên máy người chơi, nghe âm thanh thực tế, khả năng né ma ở mọi vị trí, và thời lượng hoàn thành. Các cảnh bất ngờ được tạo bằng mã procedural; nên chơi thử và tinh chỉnh độ khó/nhịp xuất hiện.

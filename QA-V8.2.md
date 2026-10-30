# QA V8.2 — Mở rộng bản đồ Chương 2

## Đã kiểm tra tĩnh
- `node --check public/3d/js/main.js`: đạt.
- `node --check public/3d/js/controls.js`: đạt.
- `node --check public/3d/js/collision.js`: đạt.
- Đối chiếu `public/index.html` và `public/game.js` với V8.1: không thay đổi.
- Kiểm tra cấu trúc ZIP sau khi đóng gói: đạt.

## Thay đổi gameplay cần playtest
- Đi từ điểm xuất phát đến nhà vé, miếu, nhánh cầu và cuối cầu.
- Kiểm tra ba manh mối ở nhà vé, trên đò và trên cầu.
- Kiểm tra vùng va chạm quanh cây, nhà vé, miếu và mép bản đồ.
- Kiểm tra ma rình/rượt ở các vị trí mới.
- Kiểm tra điểm thoát ở cuối cầu sau khi giải câu đố.

## Giới hạn
Chưa thực hiện browser playtest trong phiên làm việc này. Không khẳng định các tuyến đi và va chạm đã được xác nhận bằng thao tác chơi thực tế.

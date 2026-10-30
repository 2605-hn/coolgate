# Đêm Ở Vạn Đò — V5 (prototype mở rộng theo chương)

## Chạy game
1. Cài Node.js LTS.
2. Mở terminal tại thư mục này.
3. Chạy `npm install` (cần kết nối Internet để tải Express, Socket.IO và Three.js nếu chưa có cache).
4. Chạy `npm start` và giữ cửa sổ terminal mở.
5. Vào `http://localhost:3000/` để chơi bản 2D hoặc `http://localhost:3000/3d/` để chơi 3D.

## Chương
- **Chương 1 — Nhà từ đường:** căn nhà 3D hiện có; tìm lá thư, chân nhang, chìa khóa; thoát qua cửa chính.
- **Chương 2 — Bến đò Vạn Đò:** khu vực ngoài trời mới với cầu gỗ, bến sông, thuyền, mái trú và sương; tìm sổ đò, mái chèo, chuông đồng rồi rời bến.
- Chương 2 được mở khóa khi hoàn thành chương 1 và lưu bằng `localStorage` trong cùng trình duyệt.

## Điều khiển
- WASD: di chuyển; chuột: nhìn; Shift: chạy; F: đèn pin; E: điều tra; Esc: tạm dừng.

## Phạm vi hiện tại
Đây là prototype chơi đơn theo chương, chưa phải bản game dài 20–30 phút hoàn chỉnh. Hai chương là khung gameplay ngắn để kiểm chứng cấu trúc mở khóa, mục tiêu và chuyển khu vực. Chưa có save game ngoài trạng thái mở khóa chương 2; chưa có multiplayer 3D, model nhân vật ma có rig/animation chuyên nghiệp, lồng tiếng hoặc âm thanh thu sẵn.

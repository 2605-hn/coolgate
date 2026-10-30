# Đêm Ở Vạn Đò — bản 2D + 3D thử nghiệm

Bản 2D gốc được giữ tại `/`. Bản kinh dị 3D góc nhìn thứ nhất nằm tại `/3d/`.

## Chạy trên Windows

1. Cài Node.js bản LTS.
2. Giải nén ZIP và mở thư mục `dem-hien-truong`.
3. Mở Terminal/CMD tại thư mục đó.
4. Chạy `npm install` để cài Express, Socket.IO và Three.js.
5. Chạy `npm start`.
6. Mở `http://localhost:3000` (2D) hoặc `http://localhost:3000/3d/` (3D).

Cần kết nối Internet ở bước `npm install` lần đầu. Sau khi cài xong, game phục vụ Three.js từ `node_modules`, không cần tải thư viện 3D riêng mỗi lần chơi.

## Điều khiển bản 3D

- `W A S D`: di chuyển
- Chuột: nhìn xung quanh (nhấn nút Bắt đầu để khóa chuột)
- `Shift`: chạy nhanh; tiếng chạy làm bóng ma chú ý
- `F`: bật/tắt đèn pin
- `E`: điều tra manh mối; khi đủ 3 manh mối, quay về cửa chính và nhấn `E` để thoát
- `Esc`: tạm dừng / thả chuột

## Gameplay hiện có

- Nhà từ đường Việt Nam cũ: bàn thờ, bát hương, nến, xà gỗ, gian phụ, đồ gỗ và sương khói nhang dạng hạt.
- Ba manh mối: lá thư, chân nhang và chìa khóa.
- Bóng ma có các trạng thái rình rập, điều tra tiếng động và truy đuổi. Chạy tạo tiếng động lớn hơn đi bộ; bóng ma có thể tiếp cận khi người chơi không nhìn về phía nó.
- Âm thanh nền và tiếng gõ được tạo bằng Web Audio, không cần tải file âm thanh bên ngoài.
- Kết thúc khi thoát qua cửa chính sau khi thu thập đủ manh mối, hoặc khi bị bóng ma bắt.

## Ghi chú prototype

Đây vẫn là prototype: mô hình bóng ma và nội thất chủ yếu dựng bằng hình học Three.js; chưa có model nhân vật quét 3D, hoạt ảnh phức tạp, lồng tiếng, lưu tiến trình hoặc multiplayer 3D. Chất lượng hình ảnh phụ thuộc GPU và trình duyệt hỗ trợ WebGL. Nếu máy yếu, đóng bớt tab trình duyệt trước khi chơi.

## Khắc phục nhanh

- Nếu màn hình báo không hỗ trợ WebGL: cập nhật Chrome/Edge và bật tăng tốc phần cứng.
- Nếu `npm install` lỗi: kiểm tra Internet và chạy lại trong thư mục có `package.json`.
- Nếu chuột không điều khiển camera: bấm nút Bắt đầu/Tiếp tục và cho phép trang khóa chuột.


## V3 update (audio / atmosphere / ghost)
- Reduced harsh synthesized tones with a compressor, low-pass filtering, and conservative gain.
- Added a softer filtered-noise ambience and restrained low drone. This remains procedural audio, not recorded sound files.
- Improved ghost silhouette with asymmetrical limbs, hanging strands, subtle deformation, and gentler red light.
- Adjusted fog, flashlight and slow light variation.
- See `QA-3D.md` for what was and was not tested.


### V4 — âm thanh bước chân và sàn gỗ
- Bước chân giờ phát ngay khi người chơi di chuyển, kể cả trước khi bóng ma thức tỉnh.
- Chạy có bước chân dày và rõ hơn đi bộ; chuyển động cũng tạo tiếng động để AI phản ứng sau khi bóng ma hoạt động.
- Thêm tiếng sàn gỗ kẽo kẹt ngẫu nhiên và âm thanh nhỏ khi nhặt manh mối/thử cửa.
- Âm thanh vẫn được tổng hợp bằng Web Audio; đây chưa phải bản ghi âm thực tế. Trình duyệt phải cho phép âm thanh sau khi nhấn Bắt đầu.

# Đêm Ở Vạn Đò — V8: Ổ khóa suy luận

V8 tiếp tục từ V7, giữ nguyên bản 2D và tập trung vào một luồng gameplay đầu-cuối có điều kiện giải đố trước khi kết thúc chương.

## Điểm thay đổi
- Sau khi thu thập đủ 3 manh mối và tới lối thoát, người chơi phải tương tác với ổ khóa thay vì tự động thắng.
- Chương 1 yêu cầu mã `431`: bốn chân nhang, ba bài vị, một người bị thiếu. Các con số được gợi ra từ manh mối trong nhà từ đường.
- Chương 2 yêu cầu mã `0317`, lấy từ giờ khởi hành ghi trên sổ đò/chìa khóa; giữ số 0 ở đầu.
- Mã sai có phản hồi và không cho qua. Mã đúng kích hoạt phản hồi âm thanh/thông điệp rồi mới hoàn thành chương.
- Khi bảng giải đố mở, điều khiển góc nhìn được nhả để người chơi có thể nhập mã; đóng bảng sẽ đưa người chơi về trạng thái tạm dừng.
- Thêm giao diện giải đố có hỗ trợ bàn phím Enter/Escape và trường nhập số.
- Bản 2D (`public/index.html`, `public/game.js`) được giữ nguyên.

## Chạy game
1. Cài Node.js LTS.
2. Mở terminal tại thư mục `dem-hien-truong`.
3. Chạy `npm install`.
4. Chạy `npm start`.
5. Mở `http://localhost:3000/` cho bản 2D hoặc `http://localhost:3000/3d/` cho bản 3D.

Chương 2 vẫn yêu cầu hoàn thành chương 1 trong cùng trình duyệt để tạo khóa mở chương.

### Bản sửa lỗi V8.1
Đã sửa tham chiếu thân chiếc đò trong sự kiện chương 2 và dời điểm xuất hiện của người chơi xa điểm thoát. Xem `QA-V8.md` để biết phạm vi kiểm tra và các giới hạn còn lại.

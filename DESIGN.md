# Giao diện Vinh Vinh Phát

## Phạm vi

Hệ thống nội bộ phục vụ nhân sự, chấm công, bảng lương, lịch làm việc,
sản phẩm, tem, PO, kho và quản trị. Ưu tiên đọc dữ liệu, tìm đúng chức năng
và hoàn tất thao tác. Giữ thuật ngữ, quyền truy cập, API và công thức nghiệp vụ.

## Nguồn thiết kế trong mã

- `src/components/common/AppProviders.tsx`: cấu hình Ant Design, tiếng Việt,
  thuật toán sáng/tối và tùy chọn giảm chuyển động.
- `src/styles/workspace.css`: bố cục responsive và hỗ trợ truy cập; không
  ghi đè màu nền, màu chữ, màu dữ liệu hoặc skin của từng màn hình.
- `src/index.css`: skin hiện có, sticky, popup và các ngoại lệ cũ. Không thêm
  tiếp các lớp override cho cùng một thành phần nếu đã có token dùng chung.

## Quy ước

- Giữ nguyên màu sắc hiện có của từng hệ thống, trạng thái, ô dữ liệu,
  biểu đồ, nút và sidebar. Không phủ một bảng màu trung tính lên toàn ứng dụng.
- Giữ font Outfit, skin Mặc định/Giọt nước và điểm nhấn riêng của Dashboard.
  Lấy màu từ mã hiện có, không thay bảng màu chỉ vì áp dụng skill thiết kế.
- Cỡ chữ cơ sở 14px; header trang viết IN HOA, desktop 28px, mobile 22px.
  Sidebar/menu dùng cách viết đầu câu; không áp dụng IN HOA cho nhãn widget.
  Dùng chữ số cùng độ rộng cho số liệu. Số lượng, giờ công căn phải;
  mã, trạng thái và ngày không tự đổi cách căn theo quy tắc số lượng.
- Khoảng cách nhóm 12–16px; giữ bo góc theo thành phần và skin hiện có.
- Giữ màu nghiệp vụ của nút: không đổi nút thêm/lưu màu xanh lá sang xanh dương.
- Sidebar hiển thị nguyên tên chức năng, không dùng `capitalize` hoặc `uppercase`;
  không chuyển chữ thường hàng loạt vì phải giữ tên riêng và chữ viết tắt.
- `ComponentCard` nhận `headingLevel` khi cần tiêu đề trang; không lồng
  nhiều thẻ chỉ để trang trí. `PageLayout` có tiêu đề h1.
- Nút quay lại không đứng trước header trang. Đặt trong `ComponentCard.actions`
  (toolbar ngay dưới header), hoặc toolbar bên dưới tiêu đề của trang tùy chỉnh.
  Giữ đích điều hướng và không thêm nút quay lại vào nội dung drawer.
- `ui-toolbar` đánh dấu hàng thao tác để tăng vùng bấm trên mobile;
  giữ nguyên các lớp màu/nền của thanh công cụ và vùng lọc hiện có.
- Giữ các phiên bản thẻ mobile đang có; bảng rộng được cuộn ngang trong
  vùng bảng. Không ép tất cả cột vào màn hình nhỏ.
- Nhãn phải nối với ô nhập bằng `htmlFor`/`id`; nút chỉ có icon cần tên
  truy cập. Giữ viền focus, liên kết bỏ qua menu, Escape đóng popup.
- Dùng `QueryErrorNotice` với trạng thái query thật. Lỗi mạng không phải
  danh sách trống; không hiển thị dữ liệu giả để lấp chỗ trống.
- Không thêm hiệu ứng xuất hiện lặp lại cho từng hàng/nút nghiệp vụ.
  Tôn trọng `prefers-reduced-motion`, kể cả biểu đồ và skeleton.
- Nội dung UI tiếng Việt ngắn gọn; giữ đúng tên chức năng và vai trò.

## Ngoại lệ cần giữ

- CSS mới chỉ chạy trong `@media screen`; không thiết kế lại phiếu lương,
  barcode, tem hoặc nội dung in trong thay đổi giao diện này.
- Bảng `.work-schedule-sticky-table` giữ mật độ và màu cột ngày riêng.
- Bảng `.vvp-web-table` giữ định dạng ô nghiệp vụ của bảng lương.
- Không thay đổi logic phê duyệt, tính lương, nhập/xuất dữ liệu, CAP7A hay
  trình tự thông báo nghiệp vụ chỉ để làm giao diện gọn hơn.
- Không đưa WebGL, 3D, GSAP hoặc thư viện component mới vào màn hình quản trị
  nếu không có nhu cầu tương tác cụ thể. Skill là hướng dẫn, không phải
  dependency bắt buộc của sản phẩm.

## Kiểm tra khi thay đổi

- Nút thao tác admin/user dùng `AppButton`; không import trực tiếp `Button`
  từ Ant Design ngoài component này (ESLint kiểm tra). `tone="inherit"` giữ
  `color`, `variant`, `danger`, `type` và class màu hiện có; các tone nghiệp vụ
  vẫn dùng như trước. Không thay nhãn, icon, callback hoặc quyền khi đổi component.
- `src/styles/buttons.css` quản lý kích thước nút chung, gồm cả portal của
  modal/drawer: thường 36px, nhỏ 32px, lớn 44px; mobile 44px. Icon và chữ
  cách 8px, toolbar cách 12px và tự xuống hàng. Link/text, sidebar, tab,
  widget và ô dữ liệu tương tác không bị đổi thành nút thao tác.

Chạy riêng `npx eslint .` và `npx tsc -b --pretty false`. Không chạy Vite build.
Kiểm tra trình duyệt sáng/tối, Mặc định/Giọt nước, desktop/mobile, thao tác
bàn phím, loading/error/empty. Phần in và thao tác ghi cần môi trường thử
nghiệm phù hợp; không kiểm tra bằng cách sửa dữ liệu thật.

# Theo dõi chuẩn hóa UI — 27/10/2026

## Đã triển khai

### Điều chỉnh theo phản hồi giữ màu sắc

- Đã bỏ lớp CSS trung tính hóa màu nền, nút, bảng và Dashboard. Khôi phục
  CSS skin gốc, màu thanh công cụ/vùng lọc và màu nút thêm/lưu.
- Sidebar bỏ ép viết hoa/viết hoa từng từ; giữ tên chức năng và chữ viết tắt.
- Giữ cải thiện responsive, hỗ trợ truy cập, tìm kiếm và xử lý lỗi tải.
- Các mục trung tính hóa bên dưới là lịch sử triển khai, đã được thay thế
  bằng yêu cầu giữ màu gốc. Bảng kiểm tra trình duyệt bên dưới thuộc lượt trước.
- Lượt điều chỉnh đã xem Dashboard sáng và Sản phẩm sáng/tối trên Chrome
  desktop, skin Giọt nước. Sidebar hiển thị nguyên văn tên từ dữ liệu;
  màu nút và biểu đồ đã trở lại. Bộ lọc Sản phẩm ở Giọt nước tối còn chữ
  tương phản thấp theo skin cũ; chưa thay bảng màu của skin trong lượt này.
- ESLint và TypeScript đạt; không tạo test tạm, không sửa dữ liệu thật.

- Cấu hình theme Ant Design dùng chung, tiếng Việt, sáng/tối, giảm chuyển động.
- Token và CSS màn hình dùng chung; tiêu đề, khoảng cách, bảng, nút, form,
  focus và liên kết bỏ qua menu. Giữ các skin Mặc định/Giọt nước.
- Thay các vùng gradient/blur lặp lại bằng thanh công cụ và vùng lọc trung tính
  trong nhân sự, chấm công, sản phẩm, bảng lương, lịch, đơn yêu cầu, tem, PO,
  lịch sử, RBAC, registry, hồ sơ và các màn hình công việc nhân viên.
- Dashboard gọn hơn, tối đa bốn cột desktop, thẻ hai cột mobile; sửa tương phản
  dark mode và biểu đồ tôn trọng giảm chuyển động.
- Chấm công bỏ ép chiều cao hàng 96px; giờ công căn phải.
- Nhân viên: tìm kiếm debounce ổn định, hủy khi rời trang, về trang đầu khi tìm.
- Sản phẩm: nhãn bộ lọc liên kết ô nhập, tương phản thẻ mobile, số liệu căn phải.
- Thông báo lỗi tải và thử lại cho dashboard, nhân viên, sản phẩm và chấm công.
- Bổ sung lỗi/thử lại cho chức vụ, danh mục lịch, lịch quản trị/nhân viên,
  danh sách và chi tiết bảng lương; danh mục lịch mobile có loading/empty.
- Tìm kiếm ở hai tab chấm công và lịch nhân viên dùng debounce ổn định,
  hủy khi rời màn hình; nhãn bộ lọc chấm công có liên kết với ô nhập.
- Menu tài khoản/thông báo có tên truy cập và Escape trả focus về nút mở;
  submenu có trạng thái mở, link có aria-current; menu thu gọn có nhãn.
- Modal CRUD giữ nội dung trong lúc xử lý, khóa đóng/hủy và chặn gửi lặp.
- Bỏ hiệu ứng phóng to ở các nút hành động dùng chung; form dùng nút Lưu/Đặt lại.
- Tài liệu thiết kế: DESIGN.md. Không thêm dependency hoặc hiệu ứng 3D/WebGL.

## Kiểm tra trình duyệt đã thực hiện

| Khu vực    | Bằng chứng/phạm vi                                                       |
| ---------- | ------------------------------------------------------------------------ |
| Dashboard  | Desktop sáng/tối Giọt nước; mobile giả lập 440 × 956; bố cục, chữ và thẻ |
| Nhân viên  | Trang danh sách tải được, tên điều khiển/tiêu đề trong cây accessibility |
| Chấm công  | Desktop sáng; phát hiện và sửa hàng cao cố định                          |
| Sản phẩm   | Mobile tối Giọt nước trước/sau sửa tương phản; desktop tối Mặc định      |
| Bảng lương | Desktop sáng Mặc định; danh sách và bảng hiển thị                        |
| Tài khoản  | Mở menu, Escape đóng và focus trở lại nút Tài khoản                      |

Đây là kiểm tra đại diện, không phải chứng nhận tất cả route và trạng thái.
Không thực hiện ghi/xóa/phê duyệt, tính lương, nhập dữ liệu, gửi thông báo
hoặc điều khiển thiết bị trên dữ liệu thật.

## Chưa xác minh đầy đủ

- Mọi màn hình với mọi vai trò/quyền hạn; trạng thái lỗi mạng, rỗng, dữ liệu
  cực dài và các luồng ghi thành công/thất bại.
- In tem/phiếu lương thực tế, xuất Excel, máy chấm công, CAP7A, thiết bị quét.
- Touch trên điện thoại thật, Safari/Firefox, trình đọc màn hình, đo tương phản
  tự động và benchmark hiệu năng.
- Luồng thông báo đầu phiên vẫn giữ nguyên: cần quyết định nghiệp vụ trước
  khi giảm/bỏ các thông báo bắt buộc.
- Không thay toàn bộ CSS legacy; giữ sticky, nội dung in, bảng lịch và bảng
  lương đặc thù để tránh hồi quy. Không coi việc dùng chung CSS là đã QA riêng.

## Kiểm kê route

57 file route (gồm cả layout và error route). Danh sách dưới đây phục vụ
đối chiếu phạm vi kế thừa provider/layout; không đánh dấu các route chưa mở
trên trình duyệt là đã kiểm thử.

- `src/routes/(auth)/login.tsx`
- `src/routes/(auth)/route.tsx`
- `src/routes/__root.tsx`
- `src/routes/_authenticated.tsx`
- `src/routes/_authenticated/activity-schedule/index.tsx`
- `src/routes/_authenticated/activity-schedule/route.tsx`
- `src/routes/_authenticated/admin/attendances/index.tsx`
- `src/routes/_authenticated/admin/cap7a/index.tsx`
- `src/routes/_authenticated/admin/check-po/index.tsx`
- `src/routes/_authenticated/admin/edit-layout/index.tsx`
- `src/routes/_authenticated/admin/employees/add.tsx`
- `src/routes/_authenticated/admin/employees/edit.$id.tsx`
- `src/routes/_authenticated/admin/employees/index.tsx`
- `src/routes/_authenticated/admin/employees/trash/index.tsx`
- `src/routes/_authenticated/admin/feedbacks/index.tsx`
- `src/routes/_authenticated/admin/history/index.tsx`
- `src/routes/_authenticated/admin/notification-demo.tsx`
- `src/routes/_authenticated/admin/products/$id.tsx`
- `src/routes/_authenticated/admin/products/edit.$id.tsx`
- `src/routes/_authenticated/admin/products/index.tsx`
- `src/routes/_authenticated/admin/products/route.tsx`
- `src/routes/_authenticated/admin/rbac/index.tsx`
- `src/routes/_authenticated/admin/registry/index.tsx`
- `src/routes/_authenticated/admin/request-forms/$id.tsx`
- `src/routes/_authenticated/admin/request-forms/index.tsx`
- `src/routes/_authenticated/admin/roles/index.tsx`
- `src/routes/_authenticated/admin/route.tsx`
- `src/routes/_authenticated/admin/salaries/$id.lazy.tsx`
- `src/routes/_authenticated/admin/salaries/calculate.tsx`
- `src/routes/_authenticated/admin/salaries/index.tsx`
- `src/routes/_authenticated/admin/salaries/route.tsx`
- `src/routes/_authenticated/admin/system-logs/index.tsx`
- `src/routes/_authenticated/employee/activity-schedule/index.tsx`
- `src/routes/_authenticated/employee/attendances/index.tsx`
- `src/routes/_authenticated/employee/request-forms/authorized.tsx`
- `src/routes/_authenticated/employee/request-forms/index.tsx`
- `src/routes/_authenticated/employee/request-forms/route.tsx`
- `src/routes/_authenticated/employee/route.tsx`
- `src/routes/_authenticated/employee/salaries/index.tsx`
- `src/routes/_authenticated/employee/schedules/index.tsx`
- `src/routes/_authenticated/employee/stamps/history.tsx`
- `src/routes/_authenticated/employee/stamps/request.tsx`
- `src/routes/_authenticated/employee/todo/add-product.tsx`
- `src/routes/_authenticated/employee/todo/history.tsx`
- `src/routes/_authenticated/employee/todo/update-quantity-error.tsx`
- `src/routes/_authenticated/employee/todo/update-quantity.tsx`
- `src/routes/_authenticated/index.tsx`
- `src/routes/_authenticated/profile/index.tsx`
- `src/routes/_authenticated/stamps/create.tsx`
- `src/routes/_authenticated/stamps/history.tsx`
- `src/routes/_authenticated/stamps/route.tsx`
- `src/routes/_authenticated/stock/index.tsx`
- `src/routes/_authenticated/stock/route.tsx`
- `src/routes/_authenticated/work-schedules/$id.tsx`
- `src/routes/_authenticated/work-schedules/index.tsx`
- `src/routes/_authenticated/work-schedules/route.tsx`
- `src/routes/forbidden.tsx`

## Bàn giao

Kiểm tra hàm tìm kiếm trực tiếp từ mã TypeScript: đạt 4/4 handler (nhân viên,
hai tab chấm công, lịch nhân viên), gồm lần nhập cuối, xóa lọc, phân trang
và hủy debounce. Chạy trong bộ nhớ, không tạo file test tạm.

Các bổ sung lỗi/thử lại và nhãn bộ lọc ở lượt tiếp theo đã kiểm tra mã nguồn;
chưa xác minh đầy đủ các trạng thái này trên trình duyệt.

Không chỉnh sửa các file CAP7A đã có thay đổi trước tác vụ. Không tạo test tạm.
Chạy riêng ESLint và TypeScript; xem kết quả cuối trong phản hồi bàn giao.
Không chạy npm build/Vite build, không commit/push/deploy.

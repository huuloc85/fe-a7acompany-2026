# Rà soát UI user — 28/10/2026

## Phạm vi và kết luận

Rà soát source các trang employee, route guard, menu và Dashboard; cải tiến
theo giao diện hiện tại, không thay bảng màu hay phân quyền. Chưa thể kết luận
UI đạt đầy đủ theo từng role: tab kiểm tra riêng chuyển về đăng nhập, chưa có
phiên kiểm thử cho các vai trò. Không thay token hoặc giả lập quyền trong app.

Hệ thống có nền tảng dùng chung (AppButton, ComponentCard, toolbar, card mobile),
nhưng trạng thái lỗi/đang tải/trống chưa thống nhất; trang đơn lồng tiêu đề,
nhãn bộ lọc nhỏ và một số popup có chiều rộng tối thiểu cố định.

## Nhóm quyền theo mã hiện tại

| Nhóm                                                                                 | Chức năng/điều kiện cần giữ                                                                         | Trọng tâm kiểm tra UI                                                           |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Nhân viên không thuộc nhóm admin                                                     | Route `/employee` được guard cho phép; menu/widget thực tế lấy từ permission API                    | Chấm công, lịch, lương, đơn cá nhân, sản lượng, tem và góp ý theo menu được cấp |
| Tổ trưởng/supervisor                                                                 | Danh sách tài khoản supervisor hoặc role QC/kho/khuôn và ID 23/24/25; điều kiện trong `authUtil.ts` | Tab đơn cá nhân tách khỏi nhóm duyệt; giữ nguyên hành động duyệt/từ chối/ký     |
| Người được ủy quyền                                                                  | API `getAuthorizedToMe` trả đơn; không suy ra từ tên role                                           | Tab duyệt đơn ủy quyền, chi tiết và chữ ký; lỗi tải phải có thử lại             |
| Kho / tổ trưởng kho / ID 24                                                          | Quyền mặc định `/stock`, ngoài permission được cấp trực tiếp                                        | Quét mã dành cho non-admin; lịch sử và tồn kho; không thử bằng giao dịch thật   |
| QA-QC / QC / tổ trưởng QC / ID 23                                                    | Quyền mặc định `/stamps`, ngoài permission trực tiếp                                                | Chọn loại tem, nhập và kiểm tra dữ liệu; không phát lệnh in thật                |
| Tổ trưởng ngoại quan, tổ phó/tổ trưởng sản xuất, tổ trưởng QC/kho/khuôn, ID 23/24/25 | Lịch làm việc và lịch hoạt động theo guard; có ngoại lệ xem tổng lịch theo tài khoản                | Bộ lọc, lịch nhóm, trạng thái dữ liệu, bố cục hẹp                               |
| Admin / Co Admin / Super Admin                                                       | Admin/Co Admin theo permission; Super Admin được bypass                                             | Không dùng phiên Super Admin làm bằng chứng quyền của nhân viên                 |

Nguồn: `src/utils/authUtil.ts`, `src/constants/supervisors.ts`,
`src/partials/Sidebar.tsx`, `src/pages/dashboards/Dashboard.tsx`,
`src/pages/stock/StockTransactionPage.tsx`. Đây là hành vi frontend đã đọc,
không phải xác nhận cấu hình quyền thực tế hoặc bảo mật backend.

## Các vấn đề đã xử lý

- P1 — Sản lượng: xóa giá trị tháng có thể đưa null vào `month.format()`.
  Giữ tháng bắt buộc và chặn null; thêm lỗi có thử lại, không báo trống khi lỗi.
- P1 — Lương: giữ dữ liệu chi tiết cũ khi đổi ID có thể gây hiểu nhầm kỳ lương.
  Bỏ placeholder chi tiết kỳ trước; ổn định debounce tìm kiếm và hủy khi unmount.
- P2 — Chấm công, lịch chi tiết, góp ý, đơn cá nhân, duyệt tổ trưởng và ủy quyền:
  bổ sung thông báo lỗi dùng chung và thao tác thử lại; tách trạng thái trống mobile.
- P2 — Lịch/lương: nối label với control, tăng nhãn lên 14px;
  bỏ popup min-width 340px để dropdown theo bề ngang control trên màn hình nhỏ.
- P2 — Lịch mobile: bổ sung màu dark theo màu hiện có, cho header xuống dòng;
  sửa khóa hàng lịch phụ và cặp nền/chữ dark thiếu tương phản.
- P2 — Đơn yêu cầu: bỏ card/tiêu đề trùng bên trong tab; giữ một h1 ở trang ngoài,
  tên tab viết đầu câu. Không đổi các điều kiện hiển thị tab theo quyền.
- P2 — Lịch sử sản lượng: dùng chiều rộng nội dung thay vì giới hạn nửa trang;
  thêm Làm mới theo bộ button chung.

## Phần cần kiểm thử trước khi xác nhận hoàn tất toàn hệ thống

- Đăng nhập tài khoản thử nghiệm đại diện các nhóm trên, đối chiếu menu,
  Dashboard, truy cập URL trực tiếp và quyền backend; không dùng tài khoản thật
  để ký/duyệt, sửa công, xuất nhập kho hoặc in tem.
- Desktop và mobile 360/390/768px, sáng/tối, Mặc định/Giọt nước: kiểm tra tràn,
  tên dài, font phóng lớn, dropdown, modal/drawer, bàn phím và thao tác cảm ứng.
- Thử tải chậm/lỗi/không có dữ liệu, chuyển kỳ lương, bộ lọc tháng, thử lại.
- Rà sâu màn kho/quét mã và tem trên thiết bị thử nghiệm; hiện mới đối chiếu
  cấu trúc route/role, chưa kiểm chứng toàn bộ tương tác của hai nhóm này.
- Chưa chạy detector/đo contrast và performance trong phiên user thực tế;
  không chấm điểm WCAG hay độ ổn định production khi chưa có bằng chứng.

Giữ nguyên các thay đổi đồng thời ngoài phạm vi, API, dữ liệu, quyền và công thức.

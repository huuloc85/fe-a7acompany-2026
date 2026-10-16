# Quy chuẩn layout UI — Vinh Vinh Phát

> **Source of truth cho các prompt/code UI về sau.** Khi tạo hoặc sửa màn hình, phải bám tài liệu này trước khi viết JSX/Tailwind. Không tự đưa thêm design system, màu nền, spacing hoặc kiểu layout mới nếu chưa cập nhật tài liệu.

## 1. Phạm vi và nguyên tắc

- Quy chuẩn áp dụng cho toàn bộ màn hình trong vùng authenticated và các component dùng chung.
- Layout nền tảng hiện tại dùng **Ant Design Layout + Tailwind CSS + Framer Motion**.
- Có hai appearance được hỗ trợ: `classic` và `liquid`. Chúng chỉ thay đổi bề mặt/hiệu ứng; **không thay đổi cấu trúc, thứ tự và kích thước layout**.
- Ưu tiên mobile-first, nội dung không được tạo horizontal overflow.
- Tái sử dụng component/class hiện có trước khi viết CSS mới.
- Mỗi trang chỉ nên có một heading cấp trang; các block bên trong dùng heading cấp section/card.

## 2. App shell bắt buộc

Mọi route authenticated được render theo cấu trúc:

```text
AppLayout
├── Sidebar (desktop fixed / mobile Drawer)
└── Layout chính
    ├── Header (sticky)
    ├── Content
    │   ├── notification banner (nếu có)
    │   └── page content / Outlet
    └── Footer
```

Các file nguồn:

- `src/layouts/AppLayout.tsx`: shell, Ant Design theme, modal sequence.
- `src/partials/Sidebar.tsx`, `src/partials/SidebarMenu.tsx`: navigation.
- `src/partials/Header.tsx`: sidebar toggle, appearance, notification, user menu.
- `src/partials/Footer.tsx`: copyright/holiday footer.
- `src/layouts/PageLayout.tsx`: heading + outlet wrapper (dùng khi route cần title chuẩn).

Không đặt sidebar/header/footer lần nữa bên trong page. Page chỉ trả về nội dung của `Content`.

## 3. Kích thước và breakpoint

| Token             |                Giá trị chuẩn | Quy ước                                    |
| ----------------- | ---------------------------: | ------------------------------------------ |
| Mobile breakpoint |                    `< 768px` | Sidebar thành Drawer; content full width   |
| Sidebar mở        |                      `256px` | Desktop                                    |
| Sidebar thu gọn   |                       `80px` | Desktop; chỉ hiển thị icon                 |
| Sidebar mobile    |             `0px` trong flow | Drawer phủ từ cạnh trái                    |
| Header ngang      | `px-4 py-2`; từ `lg`: `px-6` | Không tự đổi thành header cao hơn          |
| Content padding   |                        `p-4` | Giữ nhất quán ở `glass-main`               |
| Page title margin |                       `mb-6` | Dùng `PageLayout` hoặc pattern tương đương |
| Section gap       |     `gap-4` hoặc `space-y-6` | Chọn một pattern cho cùng một page         |
| Card radius       |   `rounded-xl`/`rounded-2xl` | Dashboard đặc biệt có thể `rounded-[26px]` |

CSS variable dùng cho phần phụ thuộc sidebar: `--app-sidebar-width` (`0px`, `80px`, `256px`). Không hard-code offset khác trong modal/content.

## 4. Page layout chuẩn

Mẫu mặc định:

```tsx
<PageLayout title="Tên trang">
  <div className="space-y-6">
    <section className="liquid-glass-card rounded-2xl p-4 sm:p-6">
      {/* toolbar / filters / summary */}
    </section>

    <section className="liquid-glass-card rounded-2xl p-4 sm:p-6">
      {/* table / form / content */}
    </section>
  </div>
</PageLayout>
```

Nếu route không dùng `PageLayout`, phải giữ cùng quy tắc: title ở đầu, khoảng cách section `24px`, card surface và responsive padding như trên.

### Page header

- Header trong card dùng `ui-card-header`: nền nhẹ và đường viền dưới tương phản rõ ở light/dark để phân biệt với nội dung. Body không thêm border-top trùng đường phân cách này.
- Heading nghiệp vụ dùng thêm `ui-page-title`: chữ IN HOA được bù quang học xuống `2px` để phần nét chữ cân giữa trên/dưới, không chỉ căn giữa line box. Không tăng lệch padding header để bù vị trí chữ.
- Tiêu đề căn trái theo chiều ngang, cân giữa theo chiều dọc: padding trên/dưới bằng nhau (`py-3 sm:py-4`), heading dùng `!m-0 leading-snug` để margin mặc định không làm lệch. Không dùng `text-center` hoặc `text-justify` cho tiêu đề trang nghiệp vụ.
- Header có mô tả dùng `flex flex-col justify-center gap-1`; heading và mô tả đều bỏ margin mặc định. Nút hành động riêng có thể nằm bên phải, không giãn đều các chữ của tiêu đề.
- Dùng `flex flex-wrap items-center justify-between gap-3`.
- Title mặc định: `text-xl sm:text-2xl font-semibold text-gray-800 uppercase dark:text-white/90` (20px mobile, 24px từ breakpoint `sm`).
- Header trang hiển thị **IN HOA** bằng CSS `uppercase`, không sửa nội dung dữ liệu. `PageLayout` và `ComponentCard` áp dụng sẵn, kể cả title động/JSX. Header trang viết riêng cũng phải dùng `uppercase`.
- Không áp dụng quy tắc này cho menu, label, mô tả, tên người dùng/lời chào dashboard, modal hoặc nội dung in. Với `ComponentCard` dùng làm section bên trong trang (không phải header trang), truyền `uppercaseTitle={false}` để giữ kiểu chữ gốc.
- Nút hành động nằm bên phải; khi màn hình hẹp được phép xuống dòng.
- Không dùng hero/header cao toàn màn hình cho trang nghiệp vụ.

### Toolbar và filter

- Ô tìm kiếm dùng `AppSearchInput`: cao `40px`, bo góc `8px`, chữ `14px`, icon tìm kiếm bên trái và nút xóa bên phải. Chỉ tùy chỉnh độ rộng theo layout và placeholder theo nội dung; không tự đổi size, icon, chiều cao hay bỏ nút xóa. Giữ nguyên debounce, Enter và logic lọc của trang. Ô quét barcode và Select có tìm kiếm không thuộc nhóm này.
- DatePicker/RangePicker phải cho phép chọn trên lịch và gõ tay: không bật `inputReadOnly` (nếu khai báo thì đặt `{false}`). Format hiển thị/nhập chuẩn là `DD/MM/YYYY`, áp dụng cả `picker="month"`; giữ nguyên chế độ chọn tháng và format dữ liệu gửi API. Trường có giờ dùng `DD/MM/YYYY HH:mm:ss`; picker chỉ chọn năm giữ `YYYY`. Giữ `disabledDate`, min/max và trạng thái disabled theo nghiệp vụ. Nhập theo format đang hiển thị, nhấn Enter hoặc xác nhận theo picker; ngày không hợp lệ không được bỏ qua kiểm tra. Áp dụng cả form động, modal/drawer và bộ lọc; input ngày native giữ cơ chế nhập/chọn của trình duyệt.
- Toolbar: `flex flex-wrap items-center gap-2` hoặc `gap-3`.
- Nhóm hành động chính dùng `justify-end` trên desktop, cho phép `w-full` trên mobile.
- Filter nhiều trường: mobile xếp cột; từ `sm` trở lên dùng grid/flex-wrap.
- Không để input/button có chiều rộng cố định làm tràn viewport.

### Grid

- Thẻ thống kê: `grid-cols-2`, từ `lg` có thể `grid-cols-4`.
- Form nhiều trường: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`.
- Dashboard: dùng grid 12 cột khi cần phân bổ chart; card thường dùng `gap-4` hoặc `gap-5`.
- Widget dashboard không nhấc/scale khi hover, không hiện thanh màu dọc; chỉ đổi nhẹ border, shadow và màu icon. Chart dùng `DashboardChartCard`: tiêu đề/phạm vi → chỉ số → đơn vị → biểu đồ → ghi chú. Chỉ số chia 2 cột, 4 cột khi card rộng ít nhất 520px; không lồng nhiều glass card hoặc lặp số liệu. Biểu đồ có chiều cao rõ ràng và trạng thái chưa có dữ liệu.
- Bảng lớn phải nằm trong vùng `overflow-x-auto`, không làm rộng toàn page.

## 5. Surface, màu và appearance

### Surface class

Ưu tiên các class đã có trong `src/index.css`:

| Mục đích                     | Class                                                              |
| ---------------------------- | ------------------------------------------------------------------ |
| Panel/card chính             | `glass-panel`, `glass-card`                                        |
| Panel/card appearance liquid | `liquid-glass-panel`, `liquid-glass-card`                          |
| Control/button/icon          | `glass-control`, `glass-button`, `glass-icon-tile`                 |
| Control/button/icon liquid   | `liquid-glass-control`, `liquid-glass-button`, `liquid-glass-icon` |

- `classic` và `liquid` phải giữ cùng hierarchy; chỉ dùng appearance class tương ứng khi cần.
- Không thêm `bg-white`, `shadow-*`, `backdrop-blur-*` ngẫu nhiên lên card đã có glass class.
- Dark mode luôn có biến thể `dark:` hoặc style tương ứng trong `index.css`.
- Màu semantic dùng palette Tailwind hiện có: blue/cyan (primary), green (success), amber/orange (warning), red/rose (danger), purple (accent).
- Màu thương hiệu primary của Ant Design hiện tại: `#2563eb`.

### Token nền tảng hiện có

Không sửa trực tiếp ở page; nếu cần đổi toàn hệ thống, cập nhật token trong `src/index.css`:

`--glass-page-bg`, `--glass-surface`, `--glass-surface-strong`, `--glass-border`, `--glass-border-muted`, `--glass-shadow`, `--glass-shadow-soft`, `--glass-highlight`.

## 6. Typography và spacing

- Font UI mặc định: Outfit (được import ở `src/index.css`).
- Body text: ưu tiên `text-sm` hoặc `text-base`; helper/caption: `text-xs`.
- Heading page: `text-xl sm:text-2xl`; heading card/section: `text-sm`–`text-lg`, `font-semibold`/`font-bold` tùy mức quan trọng.
- Nhịp spacing chuẩn: `1.5rem` giữa section (`space-y-6`), `1rem` trong card (`p-4`), `1.5rem` trên desktop (`sm:p-6`).
- Không dùng giá trị spacing tùy ý nếu đã có token Tailwind tương đương.

## 7. Responsive và accessibility

- Thiết kế từ mobile trước; kiểm tra tối thiểu ở `375px`, `768px`, `1024px`, `1440px`.
- Sidebar mobile dùng Drawer và backdrop; không để nội dung desktop bị kéo ngang.
- Table/list dài: scroll trong container, giữ page width ổn định.
- Nút icon phải có `aria-label` khi không có text.
- Trạng thái loading/empty/error phải giữ kích thước surface, không làm layout nhảy mạnh.
- Tôn trọng `prefers-reduced-motion`; animation hiện có dùng `useReducedMotion`/Framer Motion.
- Giữ tương phản text ở cả light/dark; không dùng text xám nhạt trên nền glass sáng.

## 8. Modal, drawer và overlay

- Dùng component Ant Design (`Modal`, `Drawer`) hoặc component dùng chung hiện có; không tự tạo overlay thứ hai.
- Modal desktop đã tự chừa vị trí sidebar qua `--app-sidebar-width`.
- Modal form: header → body có `space-y-4/5` → footer action có border-top và `justify-end`.
- Drawer mobile có thể full-width; nội dung bên trong vẫn áp dụng `p-4` và overflow cục bộ.

## 9. Motion

- Chuyển động chỉ hỗ trợ hierarchy và feedback, không trang trí tùy tiện.
- Dùng constants trong `src/constants/motion` và các duration CSS đã khai báo.
- Không thêm animation loop/parallax cho page nghiệp vụ nếu chưa có yêu cầu.

## 10. Checklist trước khi merge

- [ ] Page nằm đúng trong `AppLayout`, không lặp shell.
- [ ] Có page title và section spacing chuẩn.
- [ ] Card/control dùng surface class chuẩn, không tạo surface style riêng.
- [ ] Responsive ở `<768px` và desktop không overflow ngang.
- [ ] Có dark mode, loading/empty/error và keyboard/aria cơ bản.
- [ ] Không thêm màu, breakpoint, radius hoặc spacing mới ngoài quy chuẩn mà chưa ghi vào file này.
- [ ] Chạy `npm run lint` và kiểm tra thay đổi trực quan ở mobile + desktop.

## 11. Contract cho prompt code UI

Có thể thêm đoạn sau vào prompt khi yêu cầu tạo/sửa UI:

```text
Tuân thủ docs/ui-layout-standard.md. Giữ nguyên AppLayout (Sidebar → Header → Content → Footer), breakpoint mobile <768px, sidebar 256/80px, content p-4, section gap space-y-6, surface class glass/liquid-glass hiện có, light/dark mode và không tạo design system mới. Nếu yêu cầu xung đột với quy chuẩn, nêu rõ trước khi code.
```

## 12. Quy tắc cho các layout đặc thù

Tài liệu này vẫn áp dụng cho code mới và mọi lần chỉnh sửa. Các nhóm dưới đây chỉ được khác **mục đích hiển thị**, không được khác về nguyên tắc responsive, overflow, accessibility và spacing:

| Nhóm                      | Được phép khác                                                 | Vẫn bắt buộc                                                                                             |
| ------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Auth/login                | Có visual panel, nền/ảnh thương hiệu, layout 2 cột từ `lg`     | Card `rounded-2xl`, form `max-w-md`, mobile-first, dark mode                                             |
| Error/forbidden/not-found | Căn giữa toàn viewport, `min-h-screen`                         | `error-page-shell`, `liquid-glass-card`, `max-w-md`, action dùng `AppButton`                             |
| Holiday/seasonal          | Palette, illustration, animation và typography trang trí riêng | Giữ breakpoint `<768px`, không overflow, animation có thể pause/reduce                                   |
| Print                     | Kích thước giấy, `@media print`, `print:*`, page break         | Tách khỏi app shell khi in, không để print CSS ảnh hưởng màn hình thường                                 |
| Modal/drawer              | Overlay và kích thước theo nội dung                            | Dùng Ant Design/shared overlay, `--app-sidebar-width`, body `p-4`/`space-y-4`, không tạo overlay thứ hai |
| Monitoring/Cap7A          | Grid điều khiển, canvas/video, polling layout                  | Card `liquid-glass-card`, `min-width:0`, breakpoint rõ ràng, vùng scroll cục bộ                          |

Không xem các nhóm trên là lý do để giữ lại surface/card cũ. Ví dụ error page vẫn phải dùng `error-page-card`, màn hình Cap7A vẫn phải thêm `liquid-glass-card` cho các Ant Card, và modal note phải dùng `liquid-glass-control` thay vì inline background/border riêng.

Các ngoại lệ khác phải ghi rõ lý do trong PR/task và cập nhật bảng này nếu tồn tại lâu dài.

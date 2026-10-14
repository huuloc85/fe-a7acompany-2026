# Tính lương VVP từ công trên web

## Khoản phát sinh theo nhân viên/kỳ — cập nhật 08/10/2026

- Trong tab **Tính lương**, bấm ô có biểu tượng bút để nhập Ngừng việc, Hiếu/hỷ, Có phép, Không phép, Thưởng chuyên cần quý, Tiền giới thiệu nhân sự.
- Ngày hỗ trợ số lẻ; thưởng/giới thiệu nhập tiền. Chỉ cần Có phép hoặc Không phép lớn hơn 0 thì chuyên cần tháng bằng 0. Hiếu/hỷ tiếp tục tính như ngày nghỉ hưởng lương.
- Lưu trên BE theo `employee_id` của web và `period` (YYYY-MM). Tải lại trang hoặc đổi kỳ không xóa dữ liệu đã lưu. Không tự sao chép khoản phát sinh sang tháng khác.
- API GET `/api/vvp-payroll-adjustments/{period}`, PUT `/api/vvp-payroll-adjustments/{period}/{employeeId}`; dùng quyền sửa danh mục, revision chống ghi đè đồng thời. Khi có xung đột bấm **Tải lại khoản phát sinh** trước khi sửa lại.
- Migration: `2026_10_08_000001_create_vvp_payroll_adjustments_table.php`. Không chạy seed lại. Phần lưu này thay thế cơ chế khoản phát sinh chỉ lưu tạm được mô tả trong các ghi chú cũ bên dưới.

Trong **Quản lý bảng lương**, chọn **Tính lương VVP**.

1. Chọn tháng lương (16 tháng trước đến 15 tháng được chọn).
2. Danh mục tự tải từ máy chủ, khởi tạo một lần cho 50 nhân viên theo mẫu VVP tháng 9/2026. Không nhập Excel khi tính lương.
3. Kiểm tra hồ sơ lương và quy tắc. Mặc định căn cứ bảo hiểm/đoàn phí là lương cơ bản cộng trách nhiệm như mẫu; cần điều chỉnh theo đối tượng và trần áp dụng.
4. Chọn **Lấy công và tính lương**. Chỉ gọi API đọc công đã tính; không tính lại giờ vào/ra.
5. Bấm tên nhân viên trong **Danh muc** hoặc **Tính lương** để sửa hồ sơ/nhập khoản phát sinh: lễ, nghỉ hưởng lương, chuyên cần được duyệt, thưởng, thu nhập bổ sung, miễn thuế, tạm ứng, khấu trừ.
6. Bấm **Cấu hình & công thức** để xem quy tắc, phép tính Excel và các khác biệt so với mẫu gốc.
7. Xử lý lỗi, kiểm tra kết quả, xác nhận và xuất bảng lương/phiếu lương Excel nháp.

## Phạm vi và giới hạn

### Liên kết mã Excel và mã chấm công

Mã Excel được giữ làm khóa hồ sơ; mã web lưu riêng trong `profile.attendanceEmployeeId`. Nếu chưa có liên kết riêng, hệ thống vẫn ghép theo mã đầy đủ như trước. Không cắt đuôi mã hoặc tự ghép theo tên khi tính lương.

Sau xác nhận liên kết, **mã web là mã nhân viên chính** trên các sheet, tìm kiếm, phiếu lương, tên file phiếu và nội dung QR. Excel xuất dùng cùng mã web ở danh mục, bảng công và bảng lương để công thức tra cứu khớp nhau. Mã nguồn Excel chỉ còn là khóa nội bộ và thông tin truy vết trong màn hình đối chiếu; không thay đổi khóa database để tránh mất chỉnh sửa/khoản phát sinh. Hồ sơ chưa ghép đúng vẫn bị các kiểm tra công chặn, không được xem là đã sửa mã.

Sau **Lấy công và tính lương**, mở **Đối chiếu mã nhân viên**. Màn hình đề xuất những tên khớp duy nhất giữa hai danh sách (giữ dấu tiếng Việt, chỉ chuẩn hóa Unicode/khoảng trắng/chữ hoa). Kiểm tra mã và tên từng người, chọn lại nếu cần, xác nhận rồi **Lưu liên kết và tính lại**. Không ghi đè liên kết đã có bằng gợi ý mới. Người không xuất hiện trong công kỳ này cần kiểm tra riêng, không tự suy ra nghỉ việc hoặc xóa hồ sơ.

API giữ nguyên lương/phụ cấp khi chỉ cập nhật liên kết, kiểm tra revision và chặn hai hồ sơ cùng nhận một mã web. Lưu nhiều dòng dùng từng request; nếu dừng giữa chừng, các dòng đã lưu vẫn được giữ và màn hình thông báo chưa hoàn tất. Liên kết dùng chung cho bộ tính và bảng công từng ngày; khoản điều chỉnh vẫn theo mã hồ sơ Excel. Sau thay đổi phải xác nhận lại trước khi xuất/hiện QR.

Cần cập nhật **cả FE và BE**; không có migration mới, không chạy lại seed, không ghi đè danh mục hiện tại. Chưa tự sửa dữ liệu trên database máy chủ trong quá trình phát triển. Kiểm thử BE chỉ dùng SQLite trong bộ nhớ.

### QR chuyển lương VCB

Theo xác nhận của người dùng, tài khoản nhân viên dùng Vietcombank (BIN 970436). Sau khi kiểm tra và tích xác nhận kỳ lương, chọn **QR chuyển lương VCB**, chọn nhân viên rồi đối chiếu thông tin và xác nhận chưa chuyển. QR điền số tài khoản, thực lãnh nguyên đồng, nội dung `LUONG MM/YYYY mã-nhân-viên`. QR tạo tại trình duyệt bằng Ant Design, không gọi dịch vụ tạo ảnh bên ngoài. Không cần migration hoặc API key mới.

Chỉ kiểm tra định dạng tài khoản, không xác minh tồn tại/chủ tài khoản. Phải kiểm tra tên người nhận trên app ngân hàng trước khi chuyển. QR không tự chuyển, không tự đánh dấu đã thanh toán, không chống quét/chuyển trùng và ảnh chụp không hết hiệu lực khi lương thay đổi. Bản nháp trên web chưa phải bản chốt: người phụ trách phải đối chiếu với lương đã duyệt trước khi sử dụng. Đổi tài khoản/số tiền/nhân viên/kỳ yêu cầu xác nhận QR mới. Không tạo QR cho thực lãnh <= 0 hoặc dữ liệu không hợp lệ.

Tham khảo: [BIN Vietcombank](https://casso.vn/api-vietcombank/), [cấu trúc VietQR tài khoản](https://github.com/subiz/vietqr/blob/master/vietqr.go), [Ant Design QRCode](https://ant.design/components/qr-code/).

### Các sheet và bộ tính

- Giao diện giữ 6 sheet đang hiện trong file theo đúng thứ tự: `Danh muc`, `Tính lương`, ` Bảng nhập công`, `Tăng ca-Tăng cường-Phép năm`, `tính tăng cường`, `In phiếu lương`. Các tab đặt phía dưới bảng. Nút **Hiện sheet ẩn (7)** mở các sheet ẩn theo vị trí gốc, gồm 2 sheet kỹ thuật macro không có dữ liệu bảng.
- Danh mục giữ A–L; Tính lương giữ A–AR. Bảng nhập công có nhóm Ngày/Đêm/Tăng ca cho từng ngày trong kỳ (số cột đổi theo độ dài tháng). Sheet tăng cường thêm ngày nếu web có phát sinh ngoài nhóm 6 ngày cuối của mẫu. Phiếu lương hiển thị từng dòng thu nhập, giảm trừ và thực nhận thay cho các ô tóm tắt.
- Đây là thay đổi bố cục frontend, không có migration mới. Các sheet ẩn không nạp dữ liệu lịch sử từ file. Ô chưa có nguồn hoặc chưa hỗ trợ tính được đánh dấu `—`, không dùng 0 thay thế. Cột tổng tiền mặt ở sheet tăng ca/tăng cường chưa tính đủ nên chưa dùng để chi trả. Cột tỷ lệ mang nhãn mẫu; giá trị bộ tính vẫn theo cấu hình hiện hành. Hai khoản công ty đóng 21,5% và 2% hiển thị tham khảo theo mẫu, không khấu trừ thêm vào lương người lao động.
- Bộ tính và cấu trúc Excel xuất hiện tại không đổi trong lần chỉnh giao diện này. Xuất Excel vẫn có các sheet hỗ trợ công thức riêng, không phải bản sao bố cục tất cả sheet gốc. Các khác biệt được ghi ở cửa sổ Cấu hình & công thức; việc giữ bố cục trên web không đồng nghĩa đã hoàn thiện tính tách lương cũ/mới và các khoản tiền mặt.

- Chỉ VVP. Đã bỏ nút nhập Excel khỏi trang lương; dữ liệu các kỳ đã lưu và API cũ được giữ nguyên.
- Danh mục lưu trong bảng riêng `vvp_payroll_profiles`, chỉ quản trị viên được sửa. Người có quyền `view_salary_total` được xem. Kiểm tra revision khi lưu để chống ghi đè thay đổi của người khác.
- Công, khoản phát sinh và kết quả kỳ vẫn là bản nháp trong bộ nhớ, chưa có lưu/duyệt/công bố phía máy chủ. Đóng màn hình hoặc tải lại trang sẽ mất phần bản nháp, nhưng không mất danh mục đã lưu. Không lưu thông tin lương vào localStorage hoặc mã nguồn frontend, không thực thi VBA.
- File xuất có công thức Excel thật ở các cột tính, dòng tổng và phiếu lương. Ô nhập trong `Tính lương` có chữ xanh; ô công thức có chữ đen. Thay mức lương ở `Danh muc`, giờ ở `Tổng hợp công`, hệ số ở `Cấu hình` hoặc khoản phát sinh trực tiếp ở `Tính lương` để kiểm tra trong Excel. Các lookup đối chiếu theo mã nhân viên. Sheet `Công thức` ghi công thức và khác biệt nghiệp vụ so với mẫu gốc. Không sao chép công thức lỗi `#REF!` từ các sheet cũ.
- Kết quả ban đầu được lưu kèm công thức từ bộ tính trên web; Excel được yêu cầu tính lại khi mở. Thay đổi Excel không đồng bộ ngược lên web. File phiếu riêng chỉ chứa đầu vào và công thức của nhân viên được chọn, không có dữ liệu đồng nghiệp hay liên kết ngoài.
- Excel xuất chỉ phục vụ đối chiếu, không nhập ngược vào hệ thống.
- Giữ mã nhân viên dạng chuỗi và đối chiếu theo mã, không theo tên. Ca `LN`/`TC` được tính riêng là tăng cường, không cộng trùng vào công/TC thường.
- Một mức lương áp dụng cả kỳ. Chưa hỗ trợ tự chia tăng ca lương cũ/mới, phụ cấp riêng cho tăng cường, hoặc tính số tiền phép năm thanh toán. Các khoản bổ sung đã được tính/duyệt có thể nhập bằng tiền. Nếu có thay đổi lương giữa kỳ hoặc hệ số khác theo ngày lễ/ngày nghỉ, chưa dùng kết quả này để chi trả.
- Chuyên cần mặc định lấy theo danh mục từng nhân viên và có thể điều chỉnh riêng mỗi kỳ, kể cả về 0. Các khoản phát sinh khác mặc định 0, không sao chép thưởng/tạm ứng của kỳ cũ. Cần xác nhận điều kiện chuyên cần trước khi xuất. Thu nhập miễn thuế nhập riêng, không tự miễn toàn bộ phụ cấp nhà ở/cơm; bảo hiểm và giảm trừ gia cảnh được trừ riêng, tránh nhập trùng.
- Thuế lũy tiến chỉ cho cá nhân cư trú thuộc diện áp dụng biểu tháng trong năm 2026. Không suy ra diện thuế từ việc có/không có tên. Không hỗ trợ lao động thuộc diện khấu trừ khác. Tham khảo [Công văn 1296/CT-NVT](https://xaydungchinhsach.chinhphu.vn/huong-dan-quyet-toan-thue-thu-nhap-ca-nhan-doi-voi-thu-nhap-tu-tien-luong-tien-cong-119260306092819051.htm).
- Khóa xuất khi có mã thiếu/trùng, công trùng/ngoài kỳ, thiếu giờ vào/ra, giờ không hợp lệ, API trả chưa đủ trang, thực lãnh âm hoặc miễn thuế vượt thu nhập. Nhân viên không có giờ công phải được kiểm tra và xác nhận riêng.
- Đổi kỳ xóa công và khoản phát sinh. Tải lại danh mục xóa công/kết quả cũ nhưng giữ khoản phát sinh kỳ đang mở. Thay đổi đầu vào hoặc tải lại công hủy xác nhận xuất.
- Hồ sơ gốc áp dụng từ 16/08/2026. Cột lương cũ/26 ngày được giữ để đối chiếu, chưa dùng để tự chia lương trong kỳ. Số người phụ thuộc ban đầu suy từ khoản giảm trừ 6,2 triệu/người trong mẫu, cần người phụ trách xác nhận. Sửa danh mục thay mức hiện hành cho lần tính tiếp theo; chưa có lịch sử phiên bản theo ngày, không tự cập nhật các kỳ đã lưu.

## Khởi tạo trên máy chủ (một lần)

Backend có migration và lệnh khởi tạo riêng. Dữ liệu thật nằm ở `storage/app/payroll/vvp-profiles-2026-09.json`, bị Git bỏ qua và không nằm trong public storage. Chuyển riêng file này đến backend bằng kênh an toàn; giới hạn quyền đọc cho tài khoản chạy ứng dụng. Không commit file, không nhúng vào frontend.

Sau khi xác nhận đúng cơ sở dữ liệu đích, người triển khai chạy trong thư mục backend:

```sh
php artisan migrate --path=database/migrations/2026_10_06_000001_create_vvp_payroll_profiles_table.php --force
php artisan payroll:initialize-vvp
php artisan payroll:initialize-vvp --apply
```

Lệnh không có `--apply` chỉ kiểm tra dữ liệu, không ghi DB. Lệnh có `--apply` tạo 50 hồ sơ và từ chối chạy nếu danh mục đã có dữ liệu; không ghi đè chỉnh sửa hoặc đổi bảng nhân viên/bảng lương cũ. API GET/PUT `/api/vvp-payroll-profiles` yêu cầu token đăng nhập còn hiệu lực.

Trong quá trình phát triển chỉ chạy khởi tạo trên SQLite trong bộ nhớ. Chưa chạy migration hoặc khởi tạo trên MySQL từ `.env`; cần xác nhận trước khi đưa dữ liệu thật lên đó.

## Kiểm thử

```sh
npx tsc -b --pretty false
npm run build
```

Trước khi triển khai chi trả: đối chiếu kỳ đã duyệt theo từng mã, thống nhất quy tắc với người phụ trách lương, bổ sung API lưu hồ sơ có hiệu lực theo ngày, lưu bản chốt và kiểm soát quyền phê duyệt. Không dùng cấu trúc import lương cũ để lưu ngầm bản nháp mới.

# Tạm tính giữa kỳ và chọn nhân viên

- Chọn tháng lương và ngày lấy công trong khoảng 16–15; mặc định lấy đến hôm nay nếu kỳ chưa kết thúc. Không cần đủ công chuẩn hoặc đủ số nhân viên.
- Chọn riêng nhân viên hoặc dùng “Chọn người có công”. Lỗi dữ liệu trong nhóm được chọn vẫn chặn xuất; có thể bỏ chọn người cần xử lý để xuất nhóm còn lại. Nhân viên chưa có hồ sơ được báo riêng, không âm thầm tính lương bằng 0.
- Không có công, chưa thiết lập lễ, thực lãnh âm hoặc hồ sơ chưa có hiệu lực chỉ là cảnh báo cho bản nháp. Thiếu thiết lập lễ tạm dùng 0. Chuyên cần, bảo hiểm, giảm trừ và các khoản theo kỳ không tự chia theo số ngày; cần rà lại.
- Phân trang API được tải tiếp trước khi tính. Lỗi mạng hoặc số bản ghi tải thiếu vẫn báo lỗi, không coi là công bằng 0.
- Phiếu lương và Excel ghi ngày dữ liệu tạm tính. QR không mở cho bản giữa kỳ hoặc còn cảnh báo. Kết quả không phải kỳ lương đã duyệt.

# Quy tắc làm việc trong dự án

## Từ ngữ trong thông báo và giao diện

- Dùng đúng thuật ngữ nghiệp vụ, tên chức năng và cách gọi đang có trong hệ thống. Trước khi thêm hoặc sửa nội dung UI, kiểm tra các màn hình liên quan để giữ cách dùng từ nhất quán.
- Viết tiếng Việt ngắn gọn, tự nhiên, rõ việc; không dùng văn phong “AI hoá”, lời dẫn dài dòng, câu quảng cáo, sáo rỗng hoặc giọng trợ lý trò chuyện.
- Áp dụng cho toàn bộ nội dung hiển thị: thông báo, cảnh báo, tiêu đề, nút, nhãn, hướng dẫn, trạng thái trống và thông báo lỗi.
- Thông báo cần nói rõ tình trạng và thao tác cần làm khi có; dùng đúng tên người phụ trách theo nghiệp vụ, không tự thay bằng cách gọi chung chung. Ví dụ trong luồng chấm công: “Vui lòng báo tổ trưởng để được xác nhận giờ vào/ra.”
- Không tự đặt thuật ngữ mới hoặc đổi cách gọi đã thống nhất. Nếu chưa rõ thuật ngữ nghiệp vụ, hỏi lại người dùng.

## Kiểm tra sau khi sửa code

- Sau khi hoàn tất thay đổi code, bắt buộc chạy ESLint và kiểm tra TypeScript trước khi bàn giao.
- Chạy `npx eslint .` và `npx tsc -b --pretty false` riêng biệt để cả hai bước đều được thực hiện, kể cả khi lint thất bại.
- Không chạy `npm run build` hoặc `vite build` trừ khi người dùng yêu cầu. Lệnh `tsc -b` ở trên dùng để kiểm tra các project TypeScript theo cấu hình hiện tại, không chạy Vite build.
- Sửa lỗi do thay đổi của mình gây ra rồi chạy lại kiểm tra. Nếu gặp lỗi có sẵn ngoài phạm vi tác vụ, báo rõ thay vì sửa lan sang phần khác.
- Trong kết quả bàn giao, nêu trạng thái lint và TypeScript; không báo đạt nếu chưa chạy hoặc kiểm tra thất bại.

## Test tạm và dọn dẹp sau kiểm tra

- Có thể tạo file test tạm để tái hiện lỗi và xác minh thay đổi.
- Đặt test tạm ngoài `src/`, ưu tiên thư mục tạm của hệ thống.
- Sau khi kiểm tra hoàn tất, xóa các file test tạm do mình tạo cho tác vụ, bao gồm `.mjs`, `.test.*`, `.spec.*`, fixture và đầu ra kiểm tra tạm. Không để chúng trong diff hoặc commit.
- Không xóa file chỉ vì có đuôi `.mjs` hoặc tên chứa `test`; chỉ dọn những file xác định là test tạm do mình tạo.
- Giữ nguyên test có sẵn và file của người dùng. Chỉ thêm hoặc giữ test lâu dài khi người dùng yêu cầu.
- Trước khi bàn giao, kiểm tra `git status --short` để chắc chắn không còn file test tạm của tác vụ; báo rõ kết quả kiểm tra và phần chưa kiểm tra được.

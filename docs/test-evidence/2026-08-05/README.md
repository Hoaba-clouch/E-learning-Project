# Minh chứng kiểm thử LearnX ngày 05/08/2026

## Kết quả chạy lại

| Tầng kiểm thử | Kết quả |
| --- | --- |
| Frontend Vitest | 4/4 PASS |
| Backend Vitest/Supertest | 133/133 PASS |
| Playwright E2E nghiệp vụ | 5/5 PASS |
| AI-assisted fuzz bằng fast-check | 1/1 PASS, 50 payload |
| Visual regression bằng Playwright | 1/1 PASS |
| Frontend production build | PASS |

Tổng số test tự động: **144 PASS, 0 FAIL** (4 frontend + 133 backend +
7 Playwright). Production build được ghi riêng, không cộng vào tổng test.

Coverage Backend toàn dự án: **35,20% statements; 24,95% branches; 41,41%
functions; 36,82% lines**. Riêng `studentPayments.service.js`: **80,41%
statements; 61,05% branches; 88,46% functions; 79,71% lines**.

## Dữ liệu demo

Script `database/prepare_demo_window.sql` đã điều chỉnh cửa sổ thời gian của 9
batch/các mốc liên quan bằng dữ liệu hiện hữu trong MySQL; không hardcode khóa
học và không chèn dữ liệu giả. API danh mục và giao diện hiện tải được 9 khóa
còn hạn đăng ký tại ngày kiểm thử.

## Thanh toán VNPAY

- Tạo payment URL, chữ ký SHA-512, chữ ký sai, callback lặp và biên sĩ số
  0/1/25/49/50/51: PASS ở tầng unit/integration.
- Harness local có kiểm soát đã gửi payload Return hợp lệ qua chính API backend;
  kết quả payment `SUCCESS`, tạo đúng một enrollment `ACTIVE`, và giao diện
  “Khóa học của tôi” hiển thị khóa vừa ghi danh.
- Khi mở payment URL trên cổng VNPAY Sandbox bên ngoài, hệ thống VNPAY trả mã
  `71` với thông báo website chưa được phê duyệt. Vì vậy bước nhập thẻ/OTP thật
  trên Sandbox đang **BLOCKED bởi trạng thái merchant**, không được ghi là PASS.
- Hệ thống vẫn chưa có IPN server-to-server riêng.

## AI và kiểm thử giao diện

- Codex hỗ trợ phân tích rủi ro/sinh test; toàn bộ thay đổi được chạy lại và đối
  chiếu bằng API, UI hoặc DB.
- `fast-check` sinh 25 cặp credential và 25 payload review ngẫu nhiên/ngoài biên;
  50/50 request không làm API trả 5xx.
- Playwright so sánh component đăng nhập học viên với baseline, sai khác cho phép
  tối đa 1% pixel; kết quả PASS.
- Đã chuẩn bị kịch bản ngôn ngữ tự nhiên tại
  `docs/ai-testing/testrigor-student-payment-scenario.md`. Chưa chạy Applitools và
  testRigor SaaS vì chưa có API key/workspace; visual regression Playwright là
  giải pháp local thay thế, không được trình bày như kết quả Applitools.

## Ảnh giao diện runtime

- `01-trang-chu-cong-khai.png`
- `02-danh-muc-khoa-hoc-thuc-te.png`
- `03-hoc-vien-dang-nhap-thanh-cong.png`
- `04-gio-hang-hoc-vien.png`
- `05-dashboard-giang-vien.png`
- `06-dashboard-quan-tri.png`
- `07-gio-hang-truoc-vnpay.png`
- `08-xac-nhan-thanh-toan-vnpay.png`
- `09-cong-vnpay-sandbox.png`
- `10-ghi-danh-active-sau-thanh-toan.png`

Các ảnh trên được chụp từ giao diện React đang chạy với API và MySQL local,
không phải wireframe hay ảnh thiết kế.

## Giới hạn còn lại

- Coverage toàn backend 35,20% chưa đạt mục tiêu 75%. Để đạt thật cần tiếp tục
  bổ sung test cho các route/service lớn, đặc biệt khối Instructor; không loại
  file khỏi coverage chỉ để tăng số liệu.
- Merchant VNPAY Sandbox chưa được phê duyệt nên chưa chạy được trọn bước thẻ/OTP
  bên ngoài.
- Session vẫn lưu trong RAM và mất khi Backend khởi động lại.
- Chưa có kiểm thử tải và CI/CD quality gate.

## Lệnh chạy lại

```powershell
cd client
npm test -- --run
npm run build

cd ..\server
npm test -- --coverage

cd ..
$env:EXPECT_ACTIVE_DEMO_ENROLLMENT='1'
npm run test:e2e
```

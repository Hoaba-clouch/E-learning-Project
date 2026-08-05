# Kịch bản NLP cho testRigor - đăng ký và thanh toán khóa học

## Mục tiêu

Kịch bản này mô tả luồng nghiệp vụ bằng ngôn ngữ tự nhiên để có thể nhập vào
testRigor khi nhóm được cấp workspace và thông tin đăng nhập thử nghiệm. Bản chạy
local hiện dùng Playwright để kiểm chứng cùng luồng vì chưa có tài khoản/API key
testRigor.

## Tiền điều kiện

- Frontend chạy tại `http://127.0.0.1:5173`.
- Backend và MySQL đang hoạt động.
- Tài khoản học viên thử nghiệm còn hiệu lực.
- Có ít nhất một batch `OPEN`, còn hạn đăng ký và còn chỗ.
- Merchant VNPAY Sandbox đã được phê duyệt nếu chạy thanh toán bên ngoài.

## Các bước ngôn ngữ tự nhiên

```text
open url "http://127.0.0.1:5173/student/login"
enter stored value "LEARNX_STUDENT_ACCOUNT" into "Email hoặc số điện thoại"
enter stored value "LEARNX_STUDENT_PASSWORD" into "Mật khẩu"
check "Ghi nhớ đăng nhập trong 20 giờ"
click "Đăng nhập"
check that page contains "Khóa học"
reload the page
check that url contains "/student"
click "Khám phá khóa học"
open the first course that is accepting enrollment
click "Thêm vào giỏ hàng"
click "Giỏ hàng"
check that page contains the selected course
click "Thanh toán"
click "VNPAY"
check that url contains "sandbox.vnpayment.vn"
```

Sau khi VNPAY trả về thành công:

```text
check that page contains "Thanh toán thành công"
click "Khóa học của tôi"
check that page contains "ACTIVE"
```

## Trạng thái thực thi ngày 05/08/2026

- Kịch bản tương đương đã chạy tự động bằng Playwright trên Chrome.
- Callback hợp lệ đã được chạy trong harness tích hợp local có kiểm soát và tạo
  enrollment `ACTIVE`.
- Cổng VNPAY Sandbox bên ngoài trả mã `71` (merchant chưa được phê duyệt), nên
  phần nhập thẻ/OTP chưa thể hoàn tất trong testRigor hoặc Playwright.
- Không ghi nhận kịch bản này là một lần chạy testRigor cho tới khi có workspace
  và API key hợp lệ.

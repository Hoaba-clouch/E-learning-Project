# TÀI LIỆU BÀN GIAO KIỂM THỬ - LEARNX E-LEARNING

## 1. Thông tin tài liệu

- Mục đích: giúp nhóm kiểm định cài đặt, hiểu nghiệp vụ và kiểm thử dự án.
- Phạm vi: Guest, Học viên, Giảng viên, Quản trị viên và thanh toán VNPAY Sandbox.
- Ngày cập nhật: 22/06/2026.
- Cơ sở dữ liệu mặc định: `elearning_system`.
- Backend mặc định: `http://localhost:3000`.
- Frontend mặc định: `http://localhost:5173`.

> Lưu ý bảo mật: không gửi hoặc commit file `server/.env` thật. Merchant Secret của
> VNPAY và VAPID Private Key phải được trao đổi qua kênh riêng.

## 2. Tổng quan hệ thống

LearnX là hệ thống E-learning có ba vai trò chính:

| Vai trò | Chức năng chính |
| --- | --- |
| Học viên (`STUDENT`) | Xem khóa học, chọn lớp, giỏ hàng, thanh toán, học bài, làm bài kiểm tra, nộp bài tập, xem lịch học, thảo luận, đánh giá và quản lý tài khoản |
| Giảng viên (`TEACHER`) | Quản lý khóa học, lớp, chương/bài học, lịch học, điểm danh, quiz, bài tập, chấm điểm, học viên, tương tác, thông báo và phân tích |
| Quản trị viên (`ADMIN`) | Quản lý học viên/giảng viên, duyệt khóa học, khóa tài khoản, cấu hình và nội dung chung |

### Kiến trúc

```text
React 19 + TypeScript + Vite
              |
              | HTTP/JSON + Bearer token
              v
Express 5 (Node.js)
              |
              v
MySQL 8 - elearning_system

Tích hợp ngoài:
- VNPAY Sandbox
- Web Push (VAPID)
- Ngrok khi cần callback/tunnel công khai
```

### Thư mục quan trọng

| Đường dẫn | Ý nghĩa |
| --- | --- |
| `client/src/router/AppRouter.tsx` | Điều hướng Guest, Student, Instructor và Admin |
| `client/src/student` | Giao diện và API phía học viên |
| `client/src/instructor` | Giao diện và API phía giảng viên |
| `client/src/admin` | Giao diện quản trị viên |
| `server/index.js` | Khởi tạo Express, CORS và mount routes |
| `server/routes` | Định nghĩa API |
| `server/services` | Nghiệp vụ và truy vấn cơ sở dữ liệu |
| `server/middleware` | Xác thực và phân quyền |
| `database` | Schema, migration và dữ liệu mẫu |
| `uploads` | File tải lên của người dùng |

## 3. Yêu cầu môi trường

- Node.js 20 trở lên.
- npm.
- MySQL 8.x.
- Trình duyệt Chrome/Edge mới.
- Ngrok chỉ cần khi kiểm thử callback VNPAY từ URL công khai.

Kiểm tra phiên bản:

```powershell
node -v
npm -v
mysql --version
```

## 4. Cài đặt và chạy dự án

### 4.1 Cài package

```powershell
cd client
npm install

cd ../server
npm install
```

### 4.2 Cấu hình backend

Tạo `server/.env` từ `server/.env.example`, sau đó cấu hình:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=<MAT_KHAU_MYSQL>
DB_NAME=elearning_system
PORT=3000

VNPAY_TMN_CODE=<VNPAY_SANDBOX_TMN_CODE>
VNPAY_HASH_SECRET=<VNPAY_SANDBOX_HASH_SECRET>
VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=https://<PUBLIC_FRONTEND_DOMAIN>/student/payment-return

VAPID_PUBLIC_KEY=<OPTIONAL>
VAPID_PRIVATE_KEY=<OPTIONAL>
VAPID_SUBJECT=mailto:admin@learnx.local
```

Nếu dùng ngrok cho frontend:

```env
VNPAY_RETURN_URL=https://<NGROK_DOMAIN>/student/payment-return
```

Khi domain ngrok thay đổi, phải cập nhật:

1. `VNPAY_RETURN_URL` trong `server/.env`.
2. `allowedOrigins` trong `server/index.js`.
3. `server.allowedHosts` trong `client/vite.config.ts`.

### 4.3 Cấu hình frontend

File `client/.env`:

```env
VITE_API_URL=http://localhost:3000
```

### 4.4 Khởi tạo database mới (Tự động hoặc Thủ công)

> [!IMPORTANT]
> **Tự động khởi tạo khi khởi động Server (Khuyên dùng)**: 
> Server Backend đã được tích hợp tính năng tự động kiểm tra và khởi tạo database. Khi bạn chạy server (`npm run dev` hoặc `npm start`), nếu database `DB_NAME` chưa tồn tại hoặc chưa có bảng `users`, hệ thống sẽ tự động tạo database mới và nhập tất cả các schema/dữ liệu mẫu từ thư mục `database/` theo đúng thứ tự. Bạn không cần làm bất kỳ bước thủ công nào dưới đây trừ khi muốn tự chạy SQL bằng tay.

Các script trong `database` gồm schema gốc, migration và dữ liệu mẫu. Thứ tự chạy (hệ thống tự động thực hiện, hoặc thực hiện thủ công):

1. `database/lthdvV2.sql`
2. `database/fix_missing_tables.sql`
3. `database/cart_tables.sql`
4. `database/course_exam_tables.sql`
5. `database/mock_data.sql`
6. `database/add_batch_classroom_fields.sql`
7. `database/add_assignment_lesson_id.sql`
8. `database/add_lesson_video_web_url.sql`
9. `database/alter_user_avatar_url_length.sql`
10. `database/update_course_teacher_reviews.sql`
11. `database/update_student_interactions.sql`
12. `database/update_notification.sql`
13. `database/admin_user_permissions.sql`
14. `database/seed_instructor_teacher4.sql`
15. `database/update_lesson_long_content.sql`

Ví dụ chạy thủ công bằng MySQL CLI (chỉ khi cần thiết):

```powershell
mysql -u root -p --default-character-set=utf8mb4 -e "SOURCE database/lthdvV2.sql"
mysql -u root -p elearning_system --default-character-set=utf8mb4 -e "SOURCE database/fix_missing_tables.sql"
mysql -u root -p elearning_system --default-character-set=utf8mb4 -e "SOURCE database/cart_tables.sql"
mysql -u root -p elearning_system --default-character-set=utf8mb4 -e "SOURCE database/course_exam_tables.sql"
mysql -u root -p elearning_system --default-character-set=utf8mb4 -e "SOURCE database/mock_data.sql"
```

Sau đó tiếp tục chạy các migration còn lại theo danh sách trên.

> Cảnh báo: `database/mock_data.sql` có nhiều lệnh `TRUNCATE`. Không chạy thủ công trên
> database có dữ liệu cần giữ.

### 4.5 Chạy ứng dụng

Terminal backend:

```powershell
cd server
npm run dev
```

Kết quả mong đợi:

```text
Server running at http://localhost:3000
```

Terminal frontend:

```powershell
cd client
npm run dev
```

Mở URL Vite in ra trên terminal, thông thường là:

```text
http://localhost:5173
```

### 4.6 Kiểm tra nhanh trước khi test

```powershell
cd client
npm run build
```

Kiểm tra backend:

```text
GET http://localhost:3000/
```

Kết quả mong đợi:

```json
{
  "success": true,
  "message": "Server is running."
}
```

## 5. Tài khoản dữ liệu mẫu

Mật khẩu chung của các tài khoản seed: `Password123`.

| Vai trò | Email | Mục đích |
| --- | --- | --- |
| Admin | `admin1@elearning.vn` | Kiểm thử quản trị |
| Admin | `admin2@elearning.vn` | Kiểm thử nhiều admin |
| Giảng viên | `gv02@elearning.vn` | Dữ liệu instructor chính, `teacher_id = 4` |
| Giảng viên | `gv01@elearning.vn` | Kiểm thử ownership giữa hai giảng viên |
| Học viên | `hv01@elearning.vn` | Kiểm thử học viên |
| Học viên | `hv03@elearning.vn` | Kiểm thử học viên có dữ liệu tiến độ/lớp |
| Học viên | `hv04@elearning.vn` | Kiểm thử tương tác và bài nộp |

URL đăng nhập:

| Khu vực | URL |
| --- | --- |
| Học viên | `/student/login` |
| Giảng viên | `/instructor/login` |
| Admin | `/admin/login` |

## 6. Quy tắc nghiệp vụ cốt lõi

### 6.1 Khóa học, lớp và bài học

- `courses` là nội dung khóa học.
- `course_modules` và `lessons` dùng chung cho tất cả lớp thuộc cùng khóa.
- `course_batches` là từng lớp/đợt mở học của khóa.
- Một khóa có thể có nhiều lớp với lịch, sĩ số, hình thức và học phí riêng.
- Một học viên chỉ được ghi danh một lớp trong cùng một khóa học.
- Lớp có thể học `ONLINE`, `OFFLINE` hoặc `HYBRID`.
- Lớp trực tiếp dùng phòng học nội bộ; lớp online dùng URL và nền tảng họp.

### 6.2 Điều kiện chọn lớp và thanh toán

Học viên không được chọn/thanh toán lớp khi:

- Lớp là `DRAFT`, `FULL`, `FINISHED` hoặc `CANCELLED`.
- Chưa tới `enrollment_start_date`.
- Đã qua `enrollment_deadline`.
- Sĩ số đã đạt `max_students`.
- Học viên đã ghi danh một lớp của khóa đó.

Khóa không còn lớp hợp lệ sẽ không xuất hiện trong danh sách mua. Học viên đã
ghi danh vẫn xem được khóa/lớp trong khu vực học tập.

Backend kiểm tra lại điều kiện khi:

1. Thêm lớp vào giỏ hàng.
2. Tạo URL thanh toán VNPAY.
3. Xác nhận kết quả thanh toán VNPAY.

### 6.3 Thanh toán VNPAY

- Môi trường hiện tại là VNPAY Sandbox, không phải thanh toán thật.
- Thanh toán gắn với `batch_id`, không chỉ `course_id`.
- Thành công sẽ tạo/cập nhật `payments` và `enrollments`.
- `transaction_code` là duy nhất.
- Callback lặp lại dùng `ON DUPLICATE KEY UPDATE`, tránh tạo bản ghi thanh toán
  và ghi danh trùng.
- Không được đưa `VNPAY_HASH_SECRET` xuống frontend.

### 6.4 Lịch học và điểm danh

- Giảng viên có thể tạo một buổi hoặc sinh lịch định kỳ trong khoảng
  `start_date` đến `end_date` của lớp.
- Không cho tạo buổi ngoài thời gian lớp.
- Không cho thời gian kết thúc trước thời gian bắt đầu.
- Không cho hai buổi cùng lớp bị chồng thời gian.
- Học offline và online đều dùng bảng `session_attendance`.
- Online hiện không tự ghi nhận từ Zoom/Meet; giảng viên vẫn xác nhận trạng thái
  trên hệ thống.
- Trạng thái điểm danh: có mặt, đi trễ, vắng phép, vắng.

### 6.5 Quiz và bài tập

- Quiz/bài tập có thể áp dụng cho một lớp hoặc tất cả lớp trong cùng khóa.
- Nội dung được liên kết với bài học qua `lesson_id`.
- Dữ liệu theo từng lớp vẫn được phân biệt bằng `batch_id`.
- Học viên chỉ thấy bài thuộc lớp đã ghi danh.
- Giảng viên chỉ chấm bài/quiz thuộc khóa của mình.

### 6.6 Thảo luận, đánh giá và thông báo

- Thảo luận gắn với lớp và có thể gắn thêm bài học.
- Học viên có thể tạo chủ đề, bình luận, reaction và báo cáo nội dung.
- Giảng viên có thể trả lời thảo luận của lớp mình.
- Học viên chỉ đánh giá khi đáp ứng điều kiện ghi danh/thanh toán/tiến độ.
- Giảng viên có thể phản hồi đánh giá.
- Thông báo hỗ trợ đánh dấu đã đọc và Web Push nếu có cấu hình VAPID.

### 6.7 Phân quyền và ownership

- Student/Admin dùng `ProtectedRoute` và Bearer token.
- Instructor dùng route riêng và session giảng viên.
- Backend dùng `requireAuth` và `requireRole`.
- Instructor routes ghi đè `teacherId` bằng ID trong session, không tin
  `teacherId` do client tự gửi.
- Service kiểm tra quyền sở hữu khóa trước thao tác sửa/xóa.
- API học viên lấy ID học viên từ token, không lấy từ request body.

## 7. Luồng kiểm thử đề xuất

### Luồng A - Guest đến học viên

1. Mở `/`.
2. Xem danh sách khóa và danh mục.
3. Mở chi tiết khóa.
4. Nhấn đăng ký khi chưa đăng nhập.
5. Xác nhận hệ thống chuyển tới `/student/login`.
6. Đăng nhập học viên.
7. Chọn một lớp còn hạn, còn chỗ và đang mở.
8. Thêm vào giỏ hàng.
9. Mở giỏ và tạo thanh toán VNPAY.
10. Hoàn tất sandbox.
11. Xác nhận khóa xuất hiện trong “Khóa học của tôi”.

### Luồng B - Học tập

1. Mở khóa đã mua.
2. Xem chương và bài học.
3. Mở video/bài đọc.
4. Đánh dấu hoàn thành bài.
5. Refresh trang và kiểm tra tiến độ còn giữ.
6. Xem bài tập theo bài học và nộp file/nội dung.
7. Làm bài kiểm tra, lưu nháp, nộp và xem kết quả.
8. Xem lịch học đúng lớp đã mua.
9. Tạo thảo luận hoặc đánh giá khi đủ điều kiện.

### Luồng C - Giảng viên

1. Đăng nhập `gv02@elearning.vn`.
2. Xem dashboard.
3. Tạo khóa mới ở trạng thái nháp.
4. Thêm chương và bài học.
5. Mở nhiều lớp cho cùng khóa.
6. Tạo lịch định kỳ và một buổi riêng.
7. Kiểm tra không thể tạo buổi ngoài ngày của lớp hoặc bị trùng giờ.
8. Tạo quiz/bài tập cho một lớp.
9. Tạo quiz/bài tập cho tất cả lớp.
10. Điểm danh buổi học.
11. Chấm bài nộp/quiz.
12. Trả lời thảo luận và đánh giá.
13. Gửi khóa chờ Admin duyệt.

### Luồng D - Admin

1. Đăng nhập `admin1@elearning.vn`.
2. Kiểm tra dashboard.
3. Mở danh sách học viên/giảng viên.
4. Khóa một tài khoản và thử đăng nhập lại.
5. Mở khóa tài khoản.
6. Mở khóa học đang chờ duyệt.
7. Duyệt hoặc từ chối và nhập lý do.
8. Kiểm tra trạng thái mới phản ánh sang Instructor và catalog.

## 8. Test case ưu tiên

| ID | Tình huống | Kết quả mong đợi |
| --- | --- | --- |
| AUTH-01 | Sai mật khẩu | HTTP 401/400 phù hợp, không tạo session |
| AUTH-02 | Tài khoản bị khóa | Không đăng nhập được |
| AUTH-03 | Không có token gọi API bảo vệ | HTTP 401 |
| AUTH-04 | Student gọi API Admin/Instructor | HTTP 403 |
| AUTH-05 | Restart backend | Session RAM mất, người dùng phải đăng nhập lại |
| COURSE-01 | Instructor A sửa khóa Instructor B | Bị từ chối bởi ownership |
| COURSE-02 | Tạo giá vượt kiểu dữ liệu DB | Báo validation, không trả lỗi SQL thô |
| BATCH-01 | Lớp draft/đóng/hủy | Không chọn được |
| BATCH-02 | Lớp đầy | Không thêm giỏ và không thanh toán được |
| BATCH-03 | Chưa tới ngày đăng ký | Không thêm giỏ được |
| BATCH-04 | Quá hạn đăng ký | Không hiện với người mua mới và API từ chối |
| BATCH-05 | Hạn đăng ký là hôm nay | Được đăng ký đến hết ngày |
| BATCH-06 | Đã mua một lớp, chọn lớp khác cùng khóa | Bị từ chối |
| CART-01 | Thêm lại cùng lớp | Không sinh item trùng |
| CART-02 | Đổi sang lớp khác cùng khóa trong giỏ | Chỉ giữ một lớp |
| PAY-01 | F5 trang return | Không tạo payment/enrollment trùng |
| PAY-02 | Bấm Back rồi mở return lại | Trả kết quả đã xử lý |
| PAY-03 | Sửa tham số VNPAY | Chữ ký không hợp lệ, không ghi danh |
| PAY-04 | Lớp đầy/hết hạn sau khi đã vào giỏ | Chặn trước khi tạo/xác nhận thanh toán |
| SCHEDULE-01 | Kết thúc trước bắt đầu | Bị từ chối |
| SCHEDULE-02 | Buổi ngoài khoảng ngày lớp | Bị từ chối |
| SCHEDULE-03 | Hai buổi chồng thời gian | Bị từ chối |
| SCHEDULE-04 | Lịch định kỳ không có ngày phù hợp | Không tạo dữ liệu sai |
| QUIZ-01 | Quiz một lớp | Chỉ học viên lớp đó thấy |
| QUIZ-02 | Quiz tất cả lớp | Học viên các lớp trong khóa đều thấy |
| QUIZ-03 | Vượt số lần làm | Không tạo attempt mới |
| ASSIGN-01 | Assignment một lớp/tất cả lớp | Hiển thị đúng phạm vi |
| ASSIGN-02 | Student ngoài lớp nộp bài | Bị từ chối |
| PROFILE-01 | Avatar URL quá dài | Lưu được theo schema mới hoặc báo hợp lệ |
| DISCUSS-01 | Student ngoài lớp xem thảo luận | Không thấy dữ liệu |
| NOTIFY-01 | Đánh dấu đã đọc | Trạng thái giữ sau refresh |

## 9. API chính để kiểm thử

Base URL: `http://localhost:3000/api`.

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`

### Student

- `GET /student/courses`
- `GET /student/courses/:id`
- `GET /student/my-courses`
- `GET|POST|DELETE /student/cart...`
- `POST /student/payments/vnpay/create`
- `GET /student/payments/vnpay/return`
- `PUT /student/lessons/:id/progress`
- `GET|POST|PUT /student/exams...`
- `POST /student/assignments/:id/submission`
- `GET|POST|PATCH /student/interactions...`

### Instructor

- `POST /instructor/auth/login`
- `GET /instructor/dashboard`
- `GET|POST|PUT|DELETE /instructor/courses...`
- `POST /instructor/courses/:courseId/batches`
- `POST /instructor/courses/:courseId/batches/:batchId/sessions/generate`
- `GET|PUT /instructor/.../sessions/:sessionId/attendance`
- `GET|POST|PATCH|DELETE /instructor/assignments...`
- `GET /instructor/students`
- `GET /instructor/interaction`
- `GET /instructor/analytics`

### Admin

- `GET /admin/dashboard`
- `GET|PATCH /admin/students...`
- `GET|PATCH /admin/teachers...`
- `GET|PATCH /admin/courses...`
- `GET|PUT /admin/system-config`

Header cho API bảo vệ:

```http
Authorization: Bearer <TOKEN>
Content-Type: application/json
```

## 10. Bảng dữ liệu quan trọng

| Bảng | Vai trò |
| --- | --- |
| `users` | Tài khoản và role |
| `teacher_profiles`, `student_profiles` | Hồ sơ |
| `courses` | Khóa học |
| `course_batches` | Lớp/đợt mở học |
| `course_modules`, `lessons` | Chương và bài học dùng chung theo khóa |
| `class_sessions` | Buổi học |
| `session_attendance` | Điểm danh |
| `enrollments` | Ghi danh học viên vào lớp |
| `lesson_progress` | Tiến độ từng bài |
| `assignments`, `assignment_submissions` | Bài tập và bài nộp |
| `quizzes`, `questions`, `answer_options` | Quiz theo bài/lớp |
| `course_exams`, `course_exam_*` | Bài kiểm tra cấp khóa/lớp |
| `carts`, `cart_items` | Giỏ hàng |
| `payments` | Thanh toán |
| `course_reviews` | Đánh giá khóa và giảng viên |
| `discussions`, `discussion_comments` | Thảo luận |
| `notifications` | Thông báo |

## 11. Hạn chế đã biết

Các mục dưới đây là giới hạn hiện tại, không phải lỗi môi trường kiểm thử:

1. Session được lưu bằng `Map` trong RAM của backend. Restart server sẽ làm mất
   phiên đăng nhập.
2. Backend chưa có test tự động; script `npm test` hiện chưa triển khai.
3. VNPAY Sandbox phụ thuộc cấu hình merchant và URL return. Domain ngrok miễn phí
   có thể thay đổi hoặc offline.
4. Luồng VNPAY hiện xác nhận qua Return URL trên trình duyệt. Chưa có endpoint
   IPN server-to-server riêng; nếu người dùng thanh toán xong nhưng không quay lại
   Return URL thì hệ thống chưa tự đối soát giao dịch như hệ thống production.
5. CORS và allowed host đang liệt kê domain cụ thể, không tự nhận domain ngrok mới.
6. Điểm danh online chưa đồng bộ tự động với Zoom/Google Meet.
7. Web Push cần HTTPS, quyền trình duyệt và VAPID hợp lệ.
8. Một số migration được viết để nâng cấp database cũ; luôn backup trước khi chạy.
9. Đây là dự án học phần, chưa hướng tới production hardening, Redis session,
   rate limiting, audit log đầy đủ hoặc CI/CD.

## 12. Mẫu báo lỗi

Nhóm kiểm định vui lòng ghi lỗi theo mẫu:

```text
Mã lỗi:
Tiêu đề:
Vai trò/tài khoản:
Môi trường:
URL:

Tiền điều kiện:
1.

Các bước tái hiện:
1.
2.
3.

Kết quả thực tế:

Kết quả mong đợi:

HTTP request/response:

Console frontend:

Log backend:

Ảnh/video:

Mức độ:
- Blocker
- Critical
- Major
- Minor
- Cosmetic
```

Không đưa các nội dung sau vào ảnh/log công khai:

- `DB_PASSWORD`
- `VNPAY_HASH_SECRET`
- `VAPID_PRIVATE_KEY`
- Bearer token còn hiệu lực
- Dữ liệu cá nhân thật

## 13. Checklist bàn giao

- [ ] Clone/giải nén source thành công.
- [ ] Import database thành công.
- [ ] Backend chạy ở port 3000.
- [ ] Frontend gọi đúng `VITE_API_URL`.
- [ ] Đăng nhập được cả ba vai trò.
- [ ] Test account có dữ liệu đúng.
- [ ] Thư mục `uploads` có quyền ghi.
- [ ] VNPAY đang dùng Sandbox.
- [ ] Nếu dùng ngrok, tunnel đang online và CORS đã cập nhật.
- [ ] Đã backup database trước khi chạy seed/migration.
- [ ] Nhóm kiểm định đã nhận credential nhạy cảm qua kênh riêng.


-- LearnX demo catalog data
--
-- Mục đích: mở lại cửa sổ đăng ký cho dữ liệu hiện có và thêm một batch
-- demo cho từng khóa học đã được duyệt. Script không TRUNCATE/DELETE dữ liệu
-- cũ, có thể chạy lại an toàn nhờ mã batch duy nhất.

USE elearning_system;

START TRANSACTION;

-- Dữ liệu cũ vẫn còn đầy đủ nhưng nhiều batch đã quá hạn đăng ký. Đưa
-- enrollment_start_date/deadline về một cửa sổ hợp lệ để catalog hiển thị.
UPDATE course_batches AS cb
INNER JOIN courses AS c ON c.course_id = cb.course_id
SET cb.enrollment_start_date = LEAST(
        DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY),
        DATE_SUB(cb.start_date, INTERVAL 30 DAY)
    ),
    cb.enrollment_deadline = DATE_SUB(cb.start_date, INTERVAL 1 DAY),
    cb.updated_at = CURRENT_TIMESTAMP
WHERE c.status = 'APPROVED'
  AND cb.status IN ('OPEN', 'STARTED');

-- Thêm một batch đang mở cho mỗi khóa APPROVED. Các batch này giúp demo
-- nhiều lịch học, hình thức học và mức học phí mà không ảnh hưởng enrollment
-- lịch sử của các batch cũ.
INSERT INTO course_batches
    (course_id, teacher_id, batch_code, batch_name,
     start_date, end_date, enrollment_start_date, enrollment_deadline,
     min_students, max_students, tuition_fee, learning_mode, online_platform,
     default_meeting_url, timezone, status, note)
SELECT c.course_id, c.teacher_id, demo.batch_code, demo.batch_name,
       DATE_ADD(CURRENT_DATE(), INTERVAL demo.start_offset DAY),
       DATE_ADD(CURRENT_DATE(), INTERVAL demo.end_offset DAY),
       DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY),
       DATE_ADD(CURRENT_DATE(), INTERVAL demo.deadline_offset DAY),
       demo.min_students, demo.max_students, c.price, demo.learning_mode,
       demo.online_platform, demo.meeting_url, 'Asia/Ho_Chi_Minh', 'OPEN',
       'Batch dữ liệu demo – có thể dùng để trình diễn catalog và đăng ký.'
FROM courses AS c
INNER JOIN (
    SELECT 1 AS course_id, 'DEMO-WEB-202608' AS batch_code, 'Web căn bản – Lớp demo buổi tối' AS batch_name,
           14 AS start_offset, 56 AS end_offset, 10 AS deadline_offset, 5 AS min_students, 40 AS max_students,
           'ONLINE' AS learning_mode, 'ZOOM' AS online_platform, 'https://zoom.us/j/learnx-demo-web' AS meeting_url
    UNION ALL SELECT 2, 'DEMO-REACT-202608', 'ReactJS thực chiến – Lớp demo cuối tuần', 18, 70, 17, 5, 35,
           'HYBRID', 'GOOGLE_MEET', 'https://meet.google.com/learnx-demo-react'
    UNION ALL SELECT 3, 'DEMO-ADS-202608', 'Facebook Ads – Lớp demo tối thứ 3', 21, 63, 20, 4, 30,
           'ONLINE', 'ZOOM', 'https://zoom.us/j/learnx-demo-ads'
    UNION ALL SELECT 4, 'DEMO-TIKTOK-202608', 'TikTok Content – Lớp demo livestream', 25, 74, 24, 4, 30,
           'ONLINE', 'INTERNAL_ROOM', 'https://learnx.local/rooms/tiktok-demo'
    UNION ALL SELECT 5, 'DEMO-ENGLISH-202608', 'Tiếng Anh công sở – Lớp demo giao tiếp', 28, 84, 27, 6, 25,
           'HYBRID', 'MICROSOFT_TEAMS', 'https://teams.microsoft.com/l/learnx-demo-english'
    UNION ALL SELECT 6, 'DEMO-POWERBI-202608', 'Power BI doanh nghiệp – Lớp demo báo cáo', 31, 87, 30, 5, 30,
           'ONLINE', 'GOOGLE_MEET', 'https://meet.google.com/learnx-demo-powerbi'
    UNION ALL SELECT 7, 'DEMO-CANVA-202608', 'Canva bán hàng – Lớp demo thực hành', 35, 77, 34, 4, 35,
           'OFFLINE', 'OTHER', NULL
    UNION ALL SELECT 8, 'DEMO-PRESENT-202608', 'Thuyết trình tự tin – Lớp demo tương tác', 38, 80, 37, 5, 40,
           'ONLINE', 'ZOOM', 'https://zoom.us/j/learnx-demo-present'
    UNION ALL SELECT 9, 'DEMO-FINANCE-202608', 'Tài chính cá nhân – Lớp demo lập ngân sách', 42, 91, 41, 5, 40,
           'HYBRID', 'GOOGLE_MEET', 'https://meet.google.com/learnx-demo-finance'
) AS demo ON demo.course_id = c.course_id
WHERE c.status = 'APPROVED'
  AND NOT EXISTS (
      SELECT 1 FROM course_batches existing
      WHERE existing.batch_code = demo.batch_code
  );

COMMIT;

-- Kiểm tra nhanh sau khi chạy.
SELECT c.course_id, c.course_name, COUNT(cb.batch_id) AS available_batches,
       MIN(cb.enrollment_deadline) AS nearest_deadline
FROM courses c
LEFT JOIN course_batches cb
  ON cb.course_id = c.course_id
 AND cb.status IN ('OPEN', 'STARTED')
 AND (cb.enrollment_start_date IS NULL OR cb.enrollment_start_date <= CURRENT_DATE())
 AND (cb.enrollment_deadline IS NULL OR cb.enrollment_deadline >= CURRENT_DATE())
WHERE c.status = 'APPROVED'
GROUP BY c.course_id, c.course_name
ORDER BY c.course_id;

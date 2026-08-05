-- Chuẩn bị cửa sổ demo từ dữ liệu hiện có, không INSERT khóa học/lớp giả.
-- Mỗi khóa APPROVED chọn một batch chưa có học viên; toàn bộ ngày liên quan được
-- dịch cùng số ngày để giữ nguyên khoảng cách lịch học.

START TRANSACTION;

DROP TEMPORARY TABLE IF EXISTS demo_batch_shift;
CREATE TEMPORARY TABLE demo_batch_shift (
    batch_id BIGINT PRIMARY KEY,
    shift_days INT NOT NULL
);

INSERT INTO demo_batch_shift (batch_id, shift_days)
SELECT selected.batch_id,
       DATEDIFF(DATE_ADD(CURRENT_DATE(), INTERVAL 14 DAY), selected.start_date)
FROM (
    SELECT cb.batch_id, cb.start_date,
           ROW_NUMBER() OVER (PARTITION BY cb.course_id ORDER BY cb.batch_id) AS row_no
    FROM course_batches cb
    INNER JOIN courses c ON c.course_id = cb.course_id
    WHERE c.status = 'APPROVED'
      AND NOT EXISTS (
          SELECT 1
          FROM enrollments e
          WHERE e.batch_id = cb.batch_id
            AND e.status IN ('PENDING', 'ACTIVE', 'COMPLETED')
      )
) AS selected
WHERE selected.row_no = 1;

UPDATE class_sessions cs
INNER JOIN demo_batch_shift shift_map ON shift_map.batch_id = cs.batch_id
SET cs.start_time = DATE_ADD(cs.start_time, INTERVAL shift_map.shift_days DAY),
    cs.end_time = DATE_ADD(cs.end_time, INTERVAL shift_map.shift_days DAY);

UPDATE assignments a
INNER JOIN demo_batch_shift shift_map ON shift_map.batch_id = a.batch_id
SET a.due_date = CASE
    WHEN a.due_date IS NULL THEN NULL
    ELSE DATE_ADD(a.due_date, INTERVAL shift_map.shift_days DAY)
END;

UPDATE course_exams exam
INNER JOIN course_batches selected_batch ON selected_batch.course_id = exam.course_id
INNER JOIN demo_batch_shift shift_map ON shift_map.batch_id = selected_batch.batch_id
SET exam.open_at = CASE
        WHEN exam.open_at IS NULL THEN NULL
        ELSE DATE_ADD(exam.open_at, INTERVAL shift_map.shift_days DAY)
    END,
    exam.close_at = CASE
        WHEN exam.close_at IS NULL THEN NULL
        ELSE DATE_ADD(exam.close_at, INTERVAL shift_map.shift_days DAY)
    END;

UPDATE course_batches cb
INNER JOIN demo_batch_shift shift_map ON shift_map.batch_id = cb.batch_id
SET cb.start_date = DATE_ADD(cb.start_date, INTERVAL shift_map.shift_days DAY),
    cb.end_date = DATE_ADD(cb.end_date, INTERVAL shift_map.shift_days DAY),
    cb.enrollment_start_date = DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY),
    cb.enrollment_deadline = DATE_ADD(CURRENT_DATE(), INTERVAL 13 DAY),
    cb.status = 'OPEN';

SELECT cb.batch_id,
       c.course_name,
       cb.batch_name,
       cb.enrollment_start_date,
       cb.enrollment_deadline,
       cb.start_date,
       cb.end_date,
       cb.status
FROM course_batches cb
INNER JOIN courses c ON c.course_id = cb.course_id
INNER JOIN demo_batch_shift shift_map ON shift_map.batch_id = cb.batch_id
ORDER BY c.course_id;

COMMIT;

USE elearning_system;

-- =========================================================
-- MỞ RỘNG NGHIỆP VỤ ĐÁNH GIÁ KHÓA HỌC VÀ GIẢNG VIÊN
--
-- Quy ước:
--   VISIBLE  : hiển thị công khai cho cả guest và người đã đăng nhập.
--   HIDDEN   : bị Admin ẩn, không xuất hiện ở trang công khai.
--   REPORTED : đang chờ Admin xử lý, tạm thời không hiển thị công khai.
--
-- File này có thể chạy lại nhiều lần.
-- =========================================================

-- 1. Thêm trạng thái kiểm duyệt đánh giá.
SET @review_status_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'course_reviews'
      AND COLUMN_NAME = 'status'
);

SET @review_status_sql = IF(
    @review_status_exists = 0,
    'ALTER TABLE course_reviews
        ADD COLUMN status ENUM(''VISIBLE'', ''HIDDEN'', ''REPORTED'')
        NOT NULL DEFAULT ''VISIBLE'' AFTER teacher_comment',
    'SELECT ''course_reviews.status already exists'' AS message'
);

PREPARE review_status_stmt FROM @review_status_sql;
EXECUTE review_status_stmt;
DEALLOCATE PREPARE review_status_stmt;


-- 2. Thêm thời gian cập nhật để theo dõi lịch sử chỉnh sửa/phản hồi.
SET @review_updated_at_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'course_reviews'
      AND COLUMN_NAME = 'updated_at'
);

SET @review_updated_at_sql = IF(
    @review_updated_at_exists = 0,
    'ALTER TABLE course_reviews
        ADD COLUMN updated_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
        AFTER created_at',
    'SELECT ''course_reviews.updated_at already exists'' AS message'
);

PREPARE review_updated_at_stmt FROM @review_updated_at_sql;
EXECUTE review_updated_at_stmt;
DEALLOCATE PREPARE review_updated_at_stmt;


-- 3. Đồng bộ teacher_id theo khóa học cho dữ liệu đánh giá cũ.
UPDATE course_reviews review
INNER JOIN courses course
    ON course.course_id = review.course_id
SET review.teacher_id = course.teacher_id
WHERE review.teacher_id IS NULL
   OR review.teacher_id <> course.teacher_id;


-- 4. Index phục vụ trang công khai của khóa học.
SET @course_review_public_index_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'course_reviews'
      AND INDEX_NAME = 'idx_course_reviews_course_public'
);

SET @course_review_public_index_sql = IF(
    @course_review_public_index_exists = 0,
    'CREATE INDEX idx_course_reviews_course_public
        ON course_reviews (course_id, status, created_at)',
    'SELECT ''idx_course_reviews_course_public already exists'' AS message'
);

PREPARE course_review_public_index_stmt
    FROM @course_review_public_index_sql;
EXECUTE course_review_public_index_stmt;
DEALLOCATE PREPARE course_review_public_index_stmt;


-- 5. Index phục vụ trang hồ sơ công khai của giảng viên.
SET @teacher_review_public_index_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'course_reviews'
      AND INDEX_NAME = 'idx_course_reviews_teacher_public'
);

SET @teacher_review_public_index_sql = IF(
    @teacher_review_public_index_exists = 0,
    'CREATE INDEX idx_course_reviews_teacher_public
        ON course_reviews (teacher_id, status, created_at)',
    'SELECT ''idx_course_reviews_teacher_public already exists'' AS message'
);

PREPARE teacher_review_public_index_stmt
    FROM @teacher_review_public_index_sql;
EXECUTE teacher_review_public_index_stmt;
DEALLOCATE PREPARE teacher_review_public_index_stmt;


-- 6. Kiểm tra kết quả sau khi chạy migration.
SELECT
    COUNT(*) AS total_reviews,
    SUM(status = 'VISIBLE') AS visible_reviews,
    SUM(status = 'HIDDEN') AS hidden_reviews,
    SUM(status = 'REPORTED') AS reported_reviews,
    ROUND(AVG(rating), 2) AS average_course_rating,
    ROUND(AVG(teacher_rating), 2) AS average_teacher_rating
FROM course_reviews;

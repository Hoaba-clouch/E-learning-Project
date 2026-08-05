DELIMITER //

CREATE TRIGGER after_lesson_progress_update
AFTER UPDATE ON lesson_progress
FOR EACH ROW
BEGIN
    DECLARE total_lessons INT;
    DECLARE completed_lessons INT;
    DECLARE current_batch_id BIGINT;

    -- 1. Tìm batch_id mà bài học này thuộc về
    SELECT b.batch_id INTO current_batch_id
    FROM lessons l
    JOIN course_modules m ON l.module_id = m.module_id
    JOIN course_batches b ON m.course_id = b.course_id
    WHERE l.lesson_id = NEW.lesson_id
    LIMIT 1;

    -- 2. Đếm tổng số bài học trong khóa học đó
    SELECT COUNT(l.lesson_id) INTO total_lessons
    FROM lessons l
    JOIN course_modules m ON l.module_id = m.module_id
    JOIN course_batches b ON m.course_id = b.course_id
    WHERE b.batch_id = current_batch_id;

    -- 3. Đếm số bài học mà học viên này đã hoàn thành
    SELECT COUNT(lp.progress_id) INTO completed_lessons
    FROM lesson_progress lp
    JOIN lessons l ON lp.lesson_id = l.lesson_id
    JOIN course_modules m ON l.module_id = m.module_id
    JOIN course_batches b ON m.course_id = b.course_id
    WHERE lp.student_id = NEW.student_id 
      AND b.batch_id = current_batch_id
      AND lp.is_completed = TRUE;

    -- 4. Cập nhật lại % vào bảng enrollments
    UPDATE enrollments 
    SET progress_percent = (completed_lessons / total_lessons) * 100
    WHERE student_id = NEW.student_id AND batch_id = current_batch_id;
END;
//
DELIMITER ;
USE elearning_system;

SET @assignment_lesson_column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'assignments'
      AND COLUMN_NAME = 'lesson_id'
);

SET @add_assignment_lesson_column_sql = IF(
    @assignment_lesson_column_exists = 0,
    'ALTER TABLE assignments ADD COLUMN lesson_id BIGINT NULL AFTER batch_id',
    'SELECT ''assignments.lesson_id already exists'' AS message'
);

PREPARE add_assignment_lesson_column_stmt FROM @add_assignment_lesson_column_sql;
EXECUTE add_assignment_lesson_column_stmt;
DEALLOCATE PREPARE add_assignment_lesson_column_stmt;

UPDATE assignments a
INNER JOIN course_batches b ON b.batch_id = a.batch_id
INNER JOIN (
    SELECT
        cm.course_id,
        MIN(l.lesson_id) AS first_lesson_id
    FROM course_modules cm
    INNER JOIN lessons l ON l.module_id = cm.module_id
    GROUP BY cm.course_id
) first_lesson ON first_lesson.course_id = b.course_id
SET a.lesson_id = first_lesson.first_lesson_id
WHERE a.lesson_id IS NULL;

SET @assignment_lesson_fk_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'assignments'
      AND COLUMN_NAME = 'lesson_id'
      AND REFERENCED_TABLE_NAME = 'lessons'
);

SET @add_assignment_lesson_fk_sql = IF(
    @assignment_lesson_fk_exists = 0,
    'ALTER TABLE assignments ADD CONSTRAINT fk_assignments_lesson FOREIGN KEY (lesson_id) REFERENCES lessons(lesson_id) ON DELETE SET NULL',
    'SELECT ''assignments.lesson_id foreign key already exists'' AS message'
);

PREPARE add_assignment_lesson_fk_stmt FROM @add_assignment_lesson_fk_sql;
EXECUTE add_assignment_lesson_fk_stmt;
DEALLOCATE PREPARE add_assignment_lesson_fk_stmt;

CREATE INDEX idx_assignments_lesson_id ON assignments (lesson_id);

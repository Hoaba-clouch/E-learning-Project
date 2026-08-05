USE elearning_system;

SET @classroom_name_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'course_batches'
      AND COLUMN_NAME = 'classroom_name'
);

SET @add_classroom_name_sql = IF(
    @classroom_name_exists = 0,
    'ALTER TABLE course_batches ADD COLUMN classroom_name VARCHAR(100) NULL AFTER default_meeting_url',
    'SELECT ''course_batches.classroom_name already exists'' AS message'
);

PREPARE add_classroom_name_stmt FROM @add_classroom_name_sql;
EXECUTE add_classroom_name_stmt;
DEALLOCATE PREPARE add_classroom_name_stmt;

SET @classroom_address_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'course_batches'
      AND COLUMN_NAME = 'classroom_address'
);

SET @add_classroom_address_sql = IF(
    @classroom_address_exists = 0,
    'ALTER TABLE course_batches ADD COLUMN classroom_address VARCHAR(255) NULL AFTER classroom_name',
    'SELECT ''course_batches.classroom_address already exists'' AS message'
);

PREPARE add_classroom_address_stmt FROM @add_classroom_address_sql;
EXECUTE add_classroom_address_stmt;
DEALLOCATE PREPARE add_classroom_address_stmt;

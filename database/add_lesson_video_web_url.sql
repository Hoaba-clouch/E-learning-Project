USE elearning_system;

SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'lessons'
      AND COLUMN_NAME = 'video_web_url'
);

SET @alter_sql = IF(
    @column_exists = 0,
    'ALTER TABLE lessons ADD COLUMN video_web_url VARCHAR(500) NULL AFTER video_url',
    'SELECT ''video_web_url already exists'' AS message'
);

PREPARE lesson_video_column_stmt FROM @alter_sql;
EXECUTE lesson_video_column_stmt;
DEALLOCATE PREPARE lesson_video_column_stmt;

UPDATE lessons
SET video_web_url = CASE
    WHEN lesson_type <> 'VIDEO' THEN NULL
    WHEN MOD(lesson_id, 3) = 1 THEN 'https://www.w3schools.com/html/mov_bbb.mp4'
    WHEN MOD(lesson_id, 3) = 2 THEN 'https://www.w3schools.com/html/movie.mp4'
    ELSE 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'
END;

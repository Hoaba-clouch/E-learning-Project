USE elearning_system;

-- Mở rộng thảo luận để hỗ trợ hỏi đáp theo bài học, ghim và giải quyết.
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name = 'discussions'
     AND column_name = 'lesson_id') = 0,
  'ALTER TABLE discussions ADD COLUMN lesson_id BIGINT NULL AFTER batch_id,
   ADD CONSTRAINT fk_discussion_lesson FOREIGN KEY (lesson_id)
   REFERENCES lessons(lesson_id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name = 'discussions'
     AND column_name = 'discussion_type') = 0,
  'ALTER TABLE discussions ADD COLUMN discussion_type
   ENUM(''DISCUSSION'',''QUESTION'') NOT NULL DEFAULT ''DISCUSSION'' AFTER user_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name = 'discussions'
     AND column_name = 'status') = 0,
  'ALTER TABLE discussions ADD COLUMN status
   ENUM(''OPEN'',''RESOLVED'',''HIDDEN'') NOT NULL DEFAULT ''OPEN'' AFTER content',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name = 'discussions'
     AND column_name = 'is_pinned') = 0,
  'ALTER TABLE discussions ADD COLUMN is_pinned BOOLEAN NOT NULL DEFAULT FALSE AFTER status',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name = 'discussions'
     AND column_name = 'updated_at') = 0,
  'ALTER TABLE discussions ADD COLUMN updated_at DATETIME NOT NULL
   DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Bình luận dạng luồng và câu trả lời được giảng viên xác nhận.
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name = 'discussion_comments'
     AND column_name = 'parent_comment_id') = 0,
  'ALTER TABLE discussion_comments ADD COLUMN parent_comment_id BIGINT NULL AFTER discussion_id,
   ADD CONSTRAINT fk_discussion_comment_parent FOREIGN KEY (parent_comment_id)
   REFERENCES discussion_comments(comment_id) ON DELETE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name = 'discussion_comments'
     AND column_name = 'is_instructor_answer') = 0,
  'ALTER TABLE discussion_comments ADD COLUMN is_instructor_answer
   BOOLEAN NOT NULL DEFAULT FALSE AFTER content',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name = 'discussion_comments'
     AND column_name = 'status') = 0,
  'ALTER TABLE discussion_comments ADD COLUMN status
   ENUM(''VISIBLE'',''HIDDEN'') NOT NULL DEFAULT ''VISIBLE'' AFTER is_instructor_answer',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = DATABASE() AND table_name = 'discussion_comments'
     AND column_name = 'updated_at') = 0,
  'ALTER TABLE discussion_comments ADD COLUMN updated_at DATETIME NOT NULL
   DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS discussion_reactions (
  reaction_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  discussion_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  reaction_type ENUM('LIKE') NOT NULL DEFAULT 'LIKE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_discussion_reaction (discussion_id, user_id, reaction_type),
  CONSTRAINT fk_reaction_discussion FOREIGN KEY (discussion_id)
    REFERENCES discussions(discussion_id) ON DELETE CASCADE,
  CONSTRAINT fk_reaction_user FOREIGN KEY (user_id)
    REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS content_reports (
  report_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  reporter_id BIGINT NOT NULL,
  target_type ENUM('DISCUSSION','COMMENT','REVIEW') NOT NULL,
  target_id BIGINT NOT NULL,
  reason VARCHAR(255) NOT NULL,
  details TEXT NULL,
  status ENUM('PENDING','RESOLVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  resolved_by BIGINT NULL,
  resolution_note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME NULL,
  UNIQUE KEY uk_content_reporter_target (reporter_id, target_type, target_id),
  INDEX idx_content_reports_status (status, created_at),
  CONSTRAINT fk_content_reporter FOREIGN KEY (reporter_id)
    REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_content_report_resolver FOREIGN KEY (resolved_by)
    REFERENCES users(user_id) ON DELETE SET NULL
);

USE elearning_system;

-- 1. Mở rộng bảng thông báo hiện tại.
-- Chỉ chạy phần ALTER TABLE này một lần.
ALTER TABLE notifications
    ADD COLUMN notification_type VARCHAR(50) NOT NULL DEFAULT 'SYSTEM'
        AFTER user_id,
    ADD COLUMN reference_type VARCHAR(50) NULL
        AFTER content,
    ADD COLUMN reference_id BIGINT NULL
        AFTER reference_type,
    ADD COLUMN target_url VARCHAR(500) NULL
        AFTER reference_id,
    ADD COLUMN priority ENUM('LOW', 'NORMAL', 'HIGH')
        NOT NULL DEFAULT 'NORMAL'
        AFTER target_url,
    ADD COLUMN read_at DATETIME NULL
        AFTER is_read;

CREATE INDEX idx_notifications_user_read_created
    ON notifications (user_id, is_read, created_at);

CREATE INDEX idx_notifications_reference
    ON notifications (reference_type, reference_id);


-- 2. Lưu trình duyệt hoặc thiết bị nhận Web Push.
-- DROP dùng để xóa bảng đã tạo sai kiểu endpoint trước đó.
DROP TABLE IF EXISTS push_subscriptions;

CREATE TABLE push_subscriptions (
    subscription_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,

    endpoint VARCHAR(1000) CHARACTER SET ascii NOT NULL,
    p256dh VARCHAR(255) CHARACTER SET ascii NOT NULL,
    auth_token VARCHAR(255) CHARACTER SET ascii NOT NULL,

    user_agent VARCHAR(500) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    last_used_at DATETIME NULL,

    CONSTRAINT fk_push_subscription_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    UNIQUE KEY uk_push_subscription_endpoint (endpoint),
    INDEX idx_push_subscription_user_active (user_id, is_active)
);


-- 3. Lưu cấu hình nhận thông báo của từng người dùng.
CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id BIGINT PRIMARY KEY,

    course_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    assignment_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    exam_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    payment_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    account_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    system_notifications BOOLEAN NOT NULL DEFAULT TRUE,

    web_push_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    email_enabled BOOLEAN NOT NULL DEFAULT FALSE,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_notification_preference_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);


-- 4. Tạo cấu hình mặc định cho các tài khoản hiện có.
-- INSERT IGNORE tránh bản ghi trùng và không dùng VALUES() đã bị deprecated.
INSERT IGNORE INTO notification_preferences (user_id)
SELECT user_id
FROM users;

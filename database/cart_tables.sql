USE elearning_system;

-- =========================
-- CARTS
-- One active cart per student.
-- =========================

CREATE TABLE IF NOT EXISTS carts (
    cart_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    student_id BIGINT NOT NULL,

    status ENUM('ACTIVE', 'CHECKED_OUT', 'ABANDONED') DEFAULT 'ACTIVE',

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_carts_student_status (student_id, status),

    FOREIGN KEY (student_id) REFERENCES users(user_id)
        ON DELETE CASCADE
);

-- =========================
-- CART ITEMS
-- Items point to course_batches because checkout/payment/enrollment happen by batch.
-- =========================

CREATE TABLE IF NOT EXISTS cart_items (
    cart_item_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    cart_id BIGINT NOT NULL,
    batch_id BIGINT NOT NULL,

    price_snapshot DECIMAL(12,2) NOT NULL DEFAULT 0,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_cart_items_cart_batch (cart_id, batch_id),

    FOREIGN KEY (cart_id) REFERENCES carts(cart_id)
        ON DELETE CASCADE,

    FOREIGN KEY (batch_id) REFERENCES course_batches(batch_id)
        ON DELETE CASCADE,

    CHECK (price_snapshot >= 0)
);

CREATE INDEX idx_cart_items_batch_id ON cart_items(batch_id);

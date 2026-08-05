CREATE DATABASE elearning_system
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE elearning_system;

-- =========================
-- 1. USERS
-- =========================

CREATE TABLE users (
    user_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    avatar_url VARCHAR(1000),

    role ENUM('ADMIN', 'TEACHER', 'STUDENT') NOT NULL,
    status ENUM('ACTIVE', 'INACTIVE', 'LOCKED') DEFAULT 'ACTIVE',

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =========================
-- 2. TEACHER PROFILE
-- =========================

CREATE TABLE teacher_profiles (
    teacher_id BIGINT PRIMARY KEY,
    bio TEXT,
    specialization VARCHAR(255),
    experience_years INT DEFAULT 0,
    qualification VARCHAR(255),
    workplace VARCHAR(255),

    FOREIGN KEY (teacher_id) REFERENCES users(user_id)
        ON DELETE CASCADE,

    CHECK (experience_years >= 0)
);

-- =========================
-- 3. STUDENT PROFILE
-- =========================

CREATE TABLE student_profiles (
    student_id BIGINT PRIMARY KEY,
    date_of_birth DATE,
    gender ENUM('MALE', 'FEMALE', 'OTHER'),
    address VARCHAR(255),

    FOREIGN KEY (student_id) REFERENCES users(user_id)
        ON DELETE CASCADE
);

-- =========================
-- 4. COURSE CATEGORY
-- =========================

CREATE TABLE course_categories (
    category_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE'
);

-- =========================
-- 5. COURSES
-- Khóa học gốc
-- =========================

CREATE TABLE courses (
    course_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    category_id BIGINT NOT NULL,
    teacher_id BIGINT NOT NULL,

    course_name VARCHAR(200) NOT NULL,
    description TEXT,
    thumbnail_url VARCHAR(255),
    level ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED') DEFAULT 'BEGINNER',
    price DECIMAL(12,2) DEFAULT 0,

    status ENUM('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'HIDDEN') DEFAULT 'DRAFT',

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (category_id) REFERENCES course_categories(category_id),
    FOREIGN KEY (teacher_id) REFERENCES users(user_id),

    CHECK (price >= 0)
);

-- 1. Tạm thời tắt kiểm tra khóa ngoại để xóa dữ liệu sạch sẽ
SET FOREIGN_KEY_CHECKS = 0;

-- 2. Xóa toàn bộ dữ liệu cũ trong bảng courses
TRUNCATE TABLE courses;

-- 3. Chèn lại dữ liệu mới với teacher_id chuẩn (ID 4, 5, 6, 7 là TEACHER)
INSERT INTO courses (course_id, category_id, teacher_id, course_name, description, thumbnail_url, level, price, status) VALUES
(1, 1, 4, 'Lập trình Web căn bản với HTML, CSS, JavaScript', 'Khóa học dành cho người mới bắt đầu xây dựng giao diện web.', '/courses/web-basic.jpg', 'BEGINNER', 799000.00, 'APPROVED'),
(2, 1, 4, 'ReactJS thực chiến cho người mới', 'Học ReactJS qua dự án thực tế, xây dựng giao diện chuyên nghiệp.', '/courses/react-basic.jpg', 'INTERMEDIATE', 1299000.00, 'APPROVED'),
(3, 2, 5, 'Facebook Ads thực chiến cho người mới', 'Nắm vững nền tảng chạy quảng cáo Facebook tối ưu chi phí.', '/courses/facebook-ads.jpg', 'BEGINNER', 990000.00, 'APPROVED'),
(4, 2, 5, 'TikTok Content & Livestream bán hàng', 'Xây dựng kịch bản video ngắn và livestream nghìn đơn.', '/courses/tiktok-content.jpg', 'INTERMEDIATE', 1199000.00, 'APPROVED'),
(5, 3, 6, 'Tiếng Anh giao tiếp cho người đi làm', 'Tập trung phản xạ giao tiếp công sở, họp hành và thuyết trình.', '/courses/english-office.jpg', 'BEGINNER', 890000.00, 'APPROVED'),
(6, 4, 6, 'Excel và Power BI cho báo cáo doanh nghiệp', 'Xử lý dữ liệu và tạo dashboard báo cáo chuyên nghiệp.', '/courses/powerbi-excel.jpg', 'INTERMEDIATE', 1499000.00, 'APPROVED'),
(7, 5, 7, 'Thiết kế bài đăng bán hàng bằng Canva', 'Tạo hình ảnh quảng cáo, banner đẹp mắt chỉ với Canva.', '/courses/canva-sale.jpg', 'BEGINNER', 699000.00, 'APPROVED'),
(8, 6, 7, 'Kỹ năng thuyết trình tự tin', 'Rèn luyện cách trình bày và kiểm soát giọng nói trước đám đông.', '/courses/presentation.jpg', 'BEGINNER', 590000.00, 'APPROVED'),
(9, 7, 4, 'Tài chính cá nhân cho người trẻ', 'Quản lý thu chi, tiết kiệm và đầu tư cơ bản.', '/courses/personal-finance.jpg', 'BEGINNER', 799000.00, 'APPROVED'),
(10, 7, 5, 'Vận hành shop online trên sàn TMĐT', 'Quản lý sản phẩm, đơn hàng và chăm sóc khách hàng hiệu quả.', '/courses/ecommerce.jpg', 'INTERMEDIATE', 1099000.00, 'PENDING');

-- 4. Bật lại kiểm tra khóa ngoại
SET FOREIGN_KEY_CHECKS = 1;

-- =========================
-- 6. COURSE BATCHES
-- Đợt mở lớp của khóa học
-- =========================

CREATE TABLE course_batches (
    batch_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    course_id BIGINT NOT NULL,
    teacher_id BIGINT NOT NULL,

    batch_code VARCHAR(50) UNIQUE,
    batch_name VARCHAR(150) NOT NULL,

    -- Khoảng thời gian tổng thể của lớp
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    -- Thời gian mở / đóng đăng ký
    enrollment_start_date DATE,
    enrollment_deadline DATE,

    min_students INT DEFAULT 1,
    max_students INT DEFAULT 50,

    -- Học phí riêng cho từng đợt mở lớp nếu cần
    tuition_fee DECIMAL(12,2),

    -- Hình thức học
    learning_mode ENUM('ONLINE', 'OFFLINE', 'HYBRID') DEFAULT 'ONLINE',

    -- Nền tảng học online mặc định
    online_platform ENUM('ZOOM', 'GOOGLE_MEET', 'MICROSOFT_TEAMS', 'JITSI', 'INTERNAL_ROOM', 'OTHER') DEFAULT 'ZOOM',

    -- Link phòng học mặc định, nếu mỗi buổi dùng cùng một link
    default_meeting_url VARCHAR(500),

    -- Múi giờ
    timezone VARCHAR(50) DEFAULT 'Asia/Ho_Chi_Minh',

    status ENUM(
        'DRAFT',
        'OPEN',
        'FULL',
        'STARTED',
        'FINISHED',
        'CANCELLED'
    ) DEFAULT 'DRAFT',

    note TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (course_id) REFERENCES courses(course_id)
        ON DELETE CASCADE,

    FOREIGN KEY (teacher_id) REFERENCES users(user_id),

    CHECK (end_date > start_date),
    CHECK (min_students > 0),
    CHECK (max_students >= min_students),
    CHECK (tuition_fee IS NULL OR tuition_fee >= 0)
);

CREATE TABLE class_sessions (
    session_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    batch_id BIGINT NOT NULL,
    teacher_id BIGINT NOT NULL,

    session_title VARCHAR(200) NOT NULL,
    session_description TEXT,

    -- Thời gian học cụ thể từng buổi
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,

    -- Link học online riêng cho từng buổi
    meeting_url VARCHAR(500),
    meeting_password VARCHAR(100),

    platform ENUM(
        'ZOOM',
        'GOOGLE_MEET',
        'MICROSOFT_TEAMS',
        'JITSI',
        'INTERNAL_ROOM',
        'OTHER'
    ) DEFAULT 'ZOOM',

    status ENUM(
        'SCHEDULED',
        'LIVE',
        'COMPLETED',
        'CANCELLED'
    ) DEFAULT 'SCHEDULED',

    recording_url VARCHAR(500),
    note TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (batch_id) REFERENCES course_batches(batch_id)
        ON DELETE CASCADE,

    FOREIGN KEY (teacher_id) REFERENCES users(user_id),

    CHECK (end_time > start_time)
);

CREATE TABLE session_attendance (
    attendance_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    session_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,

    status ENUM('PRESENT', 'ABSENT', 'LATE', 'EXCUSED') DEFAULT 'ABSENT',

    joined_at DATETIME,
    left_at DATETIME,

    duration_minutes INT DEFAULT 0,
    note TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (session_id, student_id),

    FOREIGN KEY (session_id) REFERENCES class_sessions(session_id)
        ON DELETE CASCADE,

    FOREIGN KEY (student_id) REFERENCES users(user_id),

    CHECK (duration_minutes >= 0)
);

-- =========================
-- 7. ENROLLMENTS
-- Học viên đăng ký vào batch
-- =========================

CREATE TABLE enrollments (
    enrollment_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    student_id BIGINT NOT NULL,
    batch_id BIGINT NOT NULL,

    enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status ENUM('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED') DEFAULT 'PENDING',
    progress_percent DECIMAL(5,2) DEFAULT 0,

    UNIQUE (student_id, batch_id),

    FOREIGN KEY (student_id) REFERENCES users(user_id),
    FOREIGN KEY (batch_id) REFERENCES course_batches(batch_id)
        ON DELETE CASCADE,

    CHECK (progress_percent >= 0 AND progress_percent <= 100)
);

-- =========================
-- 8. COURSE MODULES
-- Chương học
-- =========================

CREATE TABLE course_modules (
    module_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    course_id BIGINT NOT NULL,

    module_title VARCHAR(200) NOT NULL,
    description TEXT,
    order_no INT NOT NULL,

    FOREIGN KEY (course_id) REFERENCES courses(course_id)
        ON DELETE CASCADE,

    UNIQUE (course_id, order_no),
    CHECK (order_no > 0)
);

-- =========================
-- 9. LESSONS
-- Bài học
-- =========================

CREATE TABLE lessons (
    lesson_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    module_id BIGINT NOT NULL,

    lesson_title VARCHAR(200) NOT NULL,
    lesson_type ENUM('VIDEO', 'TEXT', 'PDF', 'LIVE') DEFAULT 'VIDEO',

    content TEXT,
    video_url VARCHAR(255),
    video_web_url VARCHAR(500),
    duration_minutes INT DEFAULT 0,
    is_preview BOOLEAN DEFAULT FALSE,
    order_no INT NOT NULL,

    FOREIGN KEY (module_id) REFERENCES course_modules(module_id)
        ON DELETE CASCADE,

    UNIQUE (module_id, order_no),
    CHECK (duration_minutes >= 0),
    CHECK (order_no > 0)
);

-- =========================
-- 10. LESSON RESOURCES
-- Tài liệu bài học
-- =========================

CREATE TABLE lesson_resources (
    resource_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    lesson_id BIGINT NOT NULL,

    resource_name VARCHAR(200) NOT NULL,
    resource_type ENUM('PDF', 'SLIDE', 'IMAGE', 'LINK', 'OTHER') DEFAULT 'PDF',
    resource_url VARCHAR(255) NOT NULL,

    FOREIGN KEY (lesson_id) REFERENCES lessons(lesson_id)
        ON DELETE CASCADE
);

-- =========================
-- 11. LESSON PROGRESS
-- Tiến độ từng bài học
-- =========================

CREATE TABLE lesson_progress (
    progress_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    student_id BIGINT NOT NULL,
    lesson_id BIGINT NOT NULL,

    is_completed BOOLEAN DEFAULT FALSE,
    completed_at DATETIME,

    UNIQUE (student_id, lesson_id),

    FOREIGN KEY (student_id) REFERENCES users(user_id),
    FOREIGN KEY (lesson_id) REFERENCES lessons(lesson_id)
        ON DELETE CASCADE
);

-- =========================
-- 12. ASSIGNMENTS
-- Bài tập theo batch
-- =========================

CREATE TABLE assignments (
    assignment_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    batch_id BIGINT NOT NULL,

    title VARCHAR(200) NOT NULL,
    description TEXT,
    due_date DATETIME,
    max_score DECIMAL(5,2) DEFAULT 10,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (batch_id) REFERENCES course_batches(batch_id)
        ON DELETE CASCADE,

    CHECK (max_score > 0)
);

-- =========================
-- 13. ASSIGNMENT SUBMISSIONS
-- Bài nộp
-- =========================

CREATE TABLE assignment_submissions (
    submission_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    assignment_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,

    file_url VARCHAR(255),
    content TEXT,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    score DECIMAL(5,2),
    feedback TEXT,
    graded_at DATETIME,
    graded_by BIGINT,

    UNIQUE (assignment_id, student_id),

    FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id)
        ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(user_id),
    FOREIGN KEY (graded_by) REFERENCES users(user_id),

    CHECK (score IS NULL OR score >= 0)
);

-- =========================
-- 14. QUIZZES
-- Bài kiểm tra theo batch
-- =========================

CREATE TABLE quizzes (
    quiz_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    batch_id BIGINT NOT NULL,
    lesson_id BIGINT,

    title VARCHAR(200) NOT NULL,
    description TEXT,
    duration_minutes INT,
    max_score DECIMAL(5,2) DEFAULT 10,
    pass_score DECIMAL(5,2) DEFAULT 5,
    attempt_limit INT DEFAULT 1,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (batch_id) REFERENCES course_batches(batch_id)
        ON DELETE CASCADE,

    CHECK (duration_minutes IS NULL OR duration_minutes > 0),
    CHECK (max_score > 0),
    CHECK (pass_score >= 0),
    CHECK (pass_score <= max_score),
    CHECK (attempt_limit > 0)
);

-- 1. Tắt kiểm tra khóa ngoại
SET FOREIGN_KEY_CHECKS = 0;-- 2. Làm sạch bảng quizzes (để không còn lesson_id cũ bị lỗi 1452)
TRUNCATE TABLE quizzes;

-- 3. Thực hiện lệnh thêm khóa ngoại trỏ vào lesson_id
ALTER TABLE quizzes 
ADD CONSTRAINT fk_quiz_lesson 
FOREIGN KEY (lesson_id) REFERENCES lessons(lesson_id) 
ON DELETE CASCADE;

-- 4. Bật lại kiểm tra khóa ngoại
SET FOREIGN_KEY_CHECKS = 1;

-- =========================
-- 15. QUESTIONS
-- Câu hỏi
-- =========================

CREATE TABLE questions (
    question_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    quiz_id BIGINT NOT NULL,

    question_text TEXT NOT NULL,
    question_type ENUM('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'ESSAY') DEFAULT 'SINGLE_CHOICE',
    score DECIMAL(5,2) DEFAULT 1,

    FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id)
        ON DELETE CASCADE,

    CHECK (score > 0)
);

-- =========================
-- 16. ANSWER OPTIONS
-- Đáp án trắc nghiệm
-- =========================

CREATE TABLE answer_options (
    option_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    question_id BIGINT NOT NULL,

    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,

    FOREIGN KEY (question_id) REFERENCES questions(question_id)
        ON DELETE CASCADE
);

-- =========================
-- 17. QUIZ ATTEMPTS
-- Lần làm bài
-- =========================

CREATE TABLE quiz_attempts (
    attempt_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    quiz_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,

    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    submitted_at DATETIME,
    score DECIMAL(5,2),
    status ENUM('IN_PROGRESS', 'SUBMITTED', 'GRADED') DEFAULT 'IN_PROGRESS',

    FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id)
        ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(user_id),

    CHECK (score IS NULL OR score >= 0)
);

-- =========================
-- 18. QUIZ ANSWERS
-- Câu trả lời của học viên
-- =========================

CREATE TABLE quiz_answers (
    answer_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    attempt_id BIGINT NOT NULL,
    question_id BIGINT NOT NULL,
    option_id BIGINT,
    essay_answer TEXT,

    FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(attempt_id)
        ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(question_id),
    FOREIGN KEY (option_id) REFERENCES answer_options(option_id)
);

-- =========================
-- 19. PAYMENTS
-- Thanh toán theo batch
-- =========================

CREATE TABLE payments (
    payment_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    student_id BIGINT NOT NULL,
    batch_id BIGINT NOT NULL,

    amount DECIMAL(12,2) NOT NULL,
    payment_method ENUM('CASH', 'BANK_TRANSFER', 'MOMO', 'VNPAY', 'OTHER') DEFAULT 'OTHER',
    payment_status ENUM('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED') DEFAULT 'PENDING',

    transaction_code VARCHAR(100) UNIQUE,
    paid_at DATETIME,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (student_id) REFERENCES users(user_id),
    FOREIGN KEY (batch_id) REFERENCES course_batches(batch_id),

    CHECK (amount >= 0)
);

-- =========================
-- 20. CERTIFICATES
-- Chứng chỉ
-- =========================

CREATE TABLE certificates (
    certificate_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    student_id BIGINT NOT NULL,
    batch_id BIGINT NOT NULL,

    certificate_code VARCHAR(100) NOT NULL UNIQUE,
    certificate_url VARCHAR(255),
    issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (student_id, batch_id),

    FOREIGN KEY (student_id) REFERENCES users(user_id),
    FOREIGN KEY (batch_id) REFERENCES course_batches(batch_id)
);

-- =========================
-- 21. COURSE REVIEWS
-- Đánh giá khóa học
-- =========================

CREATE TABLE course_reviews (
    review_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    student_id BIGINT NOT NULL,
    course_id BIGINT NOT NULL,

    rating INT NOT NULL,
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (student_id, course_id),

    FOREIGN KEY (student_id) REFERENCES users(user_id),
    FOREIGN KEY (course_id) REFERENCES courses(course_id)
        ON DELETE CASCADE,

    CHECK (rating BETWEEN 1 AND 5)
);

-- Thêm cột điểm đánh giá riêng cho giảng viên vào bảng đánh giá khóa học
ALTER TABLE course_reviews 
ADD COLUMN teacher_rating INT DEFAULT NULL AFTER rating,
ADD COLUMN teacher_comment TEXT DEFAULT NULL AFTER comment;

-- Thêm ràng buộc để điểm từ 1 đến 5
ALTER TABLE course_reviews
ADD CONSTRAINT chk_teacher_rating CHECK (teacher_rating BETWEEN 1 AND 5);

-- (Tùy chọn) Thêm teacher_id để truy vấn nhanh hơn mà không cần JOIN qua bảng courses
ALTER TABLE course_reviews
ADD COLUMN teacher_id BIGINT DEFAULT NULL AFTER course_id,
ADD FOREIGN KEY (teacher_id) REFERENCES users(user_id);

-- =========================
-- 22. DISCUSSIONS
-- Thảo luận trong batch
-- =========================

CREATE TABLE discussions (
    discussion_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    batch_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,

    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (batch_id) REFERENCES course_batches(batch_id)
        ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE discussion_comments (
    comment_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    discussion_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,

    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (discussion_id) REFERENCES discussions(discussion_id)
        ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- =========================
-- 23. NOTIFICATIONS
-- Thông báo
-- =========================

CREATE TABLE notifications (
    notification_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,

    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
);

USE elearning_system;

CREATE TABLE IF NOT EXISTS course_exams (
    exam_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    course_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    open_at DATETIME NULL,
    close_at DATETIME NULL,
    duration_minutes INT NOT NULL DEFAULT 45,
    max_score DECIMAL(5,2) NOT NULL DEFAULT 10,
    pass_score DECIMAL(5,2) NOT NULL DEFAULT 5,
    attempt_limit INT NOT NULL DEFAULT 1,
    status ENUM('DRAFT', 'OPEN', 'CLOSED', 'PUBLISHED') NOT NULL DEFAULT 'OPEN',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_course_exam_course
        FOREIGN KEY (course_id)
        REFERENCES courses(course_id)
        ON DELETE CASCADE,

    INDEX idx_course_exam_course_status (course_id, status),
    INDEX idx_course_exam_open_at (open_at)
);

CREATE TABLE IF NOT EXISTS course_exam_questions (
    question_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    exam_id BIGINT NOT NULL,
    question_text TEXT NOT NULL,
    question_type ENUM('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'ESSAY')
        NOT NULL DEFAULT 'SINGLE_CHOICE',
    score DECIMAL(5,2) NOT NULL DEFAULT 1,
    order_no INT NOT NULL DEFAULT 1,

    CONSTRAINT fk_course_exam_question_exam
        FOREIGN KEY (exam_id)
        REFERENCES course_exams(exam_id)
        ON DELETE CASCADE,

    INDEX idx_course_exam_question_order (exam_id, order_no)
);

CREATE TABLE IF NOT EXISTS course_exam_options (
    option_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    question_id BIGINT NOT NULL,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    order_no INT NOT NULL DEFAULT 1,

    CONSTRAINT fk_course_exam_option_question
        FOREIGN KEY (question_id)
        REFERENCES course_exam_questions(question_id)
        ON DELETE CASCADE,

    INDEX idx_course_exam_option_order (question_id, order_no)
);

CREATE TABLE IF NOT EXISTS course_exam_attempts (
    attempt_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    exam_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submitted_at DATETIME NULL,
    score DECIMAL(5,2) NULL,
    status ENUM('IN_PROGRESS', 'SUBMITTED', 'GRADED', 'EXPIRED')
        NOT NULL DEFAULT 'IN_PROGRESS',
    feedback TEXT NULL,
    graded_at DATETIME NULL,
    graded_by BIGINT NULL,

    CONSTRAINT fk_course_exam_attempt_exam
        FOREIGN KEY (exam_id)
        REFERENCES course_exams(exam_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_course_exam_attempt_student
        FOREIGN KEY (student_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_course_exam_attempt_grader
        FOREIGN KEY (graded_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    INDEX idx_course_exam_attempt_student (student_id, exam_id, status),
    INDEX idx_course_exam_attempt_exam (exam_id, submitted_at)
);

CREATE TABLE IF NOT EXISTS course_exam_answers (
    answer_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    attempt_id BIGINT NOT NULL,
    question_id BIGINT NOT NULL,
    option_id BIGINT NULL,
    essay_answer TEXT NULL,

    CONSTRAINT fk_course_exam_answer_attempt
        FOREIGN KEY (attempt_id)
        REFERENCES course_exam_attempts(attempt_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_course_exam_answer_question
        FOREIGN KEY (question_id)
        REFERENCES course_exam_questions(question_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_course_exam_answer_option
        FOREIGN KEY (option_id)
        REFERENCES course_exam_options(option_id)
        ON DELETE SET NULL,

    UNIQUE KEY uq_course_exam_answer_question (attempt_id, question_id),
    INDEX idx_course_exam_answer_question (question_id)
);

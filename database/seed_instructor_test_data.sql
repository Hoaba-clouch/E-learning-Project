USE elearning_system;

-- Sample data for instructor teacher_id = 4
-- Safe to run multiple times thanks to INSERT IGNORE.

INSERT IGNORE INTO courses
(course_id, category_id, teacher_id, course_name, description, thumbnail_url, level, price, status, created_at, updated_at)
VALUES
(11, 1, 4, 'VueJS thuc hanh cho nguoi moi', 'Khoa hoc thuc hanh VueJS tu co ban den xay dung dashboard nho.', '/courses/vue-practice.jpg', 'BEGINNER', 899000, 'DRAFT', '2026-06-01 08:00:00', '2026-06-01 08:00:00'),
(12, 7, 4, 'ChatGPT cho cong viec van phong', 'Ung dung AI vao soan thao, tong hop va tu dong hoa quy trinh lam viec.', '/courses/chatgpt-office.jpg', 'BEGINNER', 699000, 'PENDING', '2026-06-03 08:00:00', '2026-06-03 08:00:00'),
(13, 1, 4, 'Docker va deploy co ban', 'Hieu container va dua ung dung web len moi truong san sang san xuat.', '/courses/docker-deploy.jpg', 'INTERMEDIATE', 1099000, 'REJECTED', '2026-06-05 08:00:00', '2026-06-05 08:00:00');

INSERT IGNORE INTO course_batches
(batch_id, course_id, teacher_id, batch_code, batch_name, start_date, end_date, enrollment_start_date, enrollment_deadline, min_students, max_students, tuition_fee, learning_mode, online_platform, default_meeting_url, timezone, status, note)
VALUES
(104, 11, 4, 'VUE-TEACH-01', 'VueJS K01 - Sang', '2026-06-18', '2026-08-10', '2026-06-01', '2026-06-16', 5, 24, 899000, 'ONLINE', 'ZOOM', 'https://zoom.us/j/vue-teach-01', 'Asia/Ho_Chi_Minh', 'OPEN', 'Lop mau de test them/sua/xoa batch.'),
(105, 11, 4, 'VUE-TEACH-02', 'VueJS K02 - Toi', '2026-07-01', '2026-08-25', '2026-06-10', '2026-06-28', 6, 28, 949000, 'HYBRID', 'GOOGLE_MEET', 'https://meet.google.com/vue-teach-02', 'Asia/Ho_Chi_Minh', 'DRAFT', 'Batch de test trang thai ban nhap.'),
(106, 12, 4, 'GPT-TEACH-01', 'AI Office K01', '2026-06-22', '2026-08-15', '2026-06-05', '2026-06-20', 4, 30, 699000, 'ONLINE', 'ZOOM', 'https://zoom.us/j/gpt-teach-01', 'Asia/Ho_Chi_Minh', 'STARTED', 'Lop da bat dau de test trang thai lop.'),
(107, 13, 4, 'DOCKER-TEACH-01', 'Docker K01', '2026-06-25', '2026-08-05', '2026-06-08', '2026-06-23', 5, 20, 1099000, 'ONLINE', 'MICROSOFT_TEAMS', 'https://teams.microsoft.com/l/docker-teach-01', 'Asia/Ho_Chi_Minh', 'OPEN', 'Batch mau gan voi khoa bi tu choi.');

INSERT IGNORE INTO class_sessions
(session_id, batch_id, teacher_id, session_title, session_description, start_time, end_time, meeting_url, meeting_password, platform, status, recording_url, note)
VALUES
(204, 104, 4, 'VueJS overview', 'Gioi thieu framework va toolchain.', '2026-06-18 19:00:00', '2026-06-18 20:30:00', 'https://zoom.us/j/vue-teach-01', '111111', 'ZOOM', 'SCHEDULED', NULL, 'Buoi 1 cua batch VueJS.'),
(205, 105, 4, 'Component va reactive data', 'Kiem tra giao dien reactive.', '2026-07-01 19:00:00', '2026-07-01 20:30:00', 'https://meet.google.com/vue-teach-02', '222222', 'GOOGLE_MEET', 'SCHEDULED', NULL, 'Buoi 1 cua batch VueJS K02.'),
(206, 106, 4, 'AI workflow cho office', 'Thuc hanh prompt va template.', '2026-06-22 19:00:00', '2026-06-22 20:30:00', 'https://zoom.us/j/gpt-teach-01', '333333', 'ZOOM', 'LIVE', NULL, 'Buoi hoc dang chay.'),
(207, 107, 4, 'Docker image basics', 'Luyen tap build image va container.', '2026-06-25 19:00:00', '2026-06-25 20:30:00', 'https://teams.microsoft.com/l/docker-teach-01', NULL, 'MICROSOFT_TEAMS', 'SCHEDULED', NULL, 'Batch Docker de test.');

INSERT IGNORE INTO course_modules (module_id, course_id, module_title, description, order_no) VALUES
(307, 11, 'Nhap mon VueJS', 'Loi mo dau ve component va template.', 1),
(308, 11, 'Data binding va directive', 'Su dung v-model, v-if, v-for.', 2),
(309, 12, 'Prompt co ban', 'Cach dat cau hoi va tao outline.', 1),
(310, 12, 'Tu dong hoa cong viec', 'Ung dung AI vao email, report va checklist.', 2),
(311, 13, 'Xay dung image va container', 'Dockerfile co ban va lenh CLI.', 1),
(312, 13, 'Chien luoc deploy', 'Doi moi moi truong va quan ly version.', 2);

INSERT IGNORE INTO lessons
(lesson_id, module_id, lesson_title, lesson_type, content, video_url, duration_minutes, is_preview, order_no)
VALUES
(413, 307, 'VueJS la gi', 'VIDEO', 'Tong quan ve Vue va project structure.', '/videos/vue/intro.mp4', 18, TRUE, 1),
(414, 307, 'Template syntax', 'VIDEO', 'Cach bind du lieu va render component.', '/videos/vue/template.mp4', 32, FALSE, 2),
(415, 308, 'v-model va form', 'TEXT', 'Quan ly input va form trong Vue.', NULL, 20, TRUE, 1),
(416, 308, 'Directive thuc hanh', 'LIVE', 'Lam bai tap voi v-if va v-for.', NULL, 60, FALSE, 2),
(417, 309, 'Tao prompt hieu qua', 'VIDEO', 'Cac mau prompt de lay ket qua tot hon.', '/videos/gpt/prompt.mp4', 25, TRUE, 1),
(418, 310, 'AI cho email', 'VIDEO', 'Soan email va phan loai phan hoi.', '/videos/gpt/email.mp4', 28, FALSE, 1),
(419, 311, 'Dockerfile co ban', 'VIDEO', 'Cac lenh FROM, RUN, COPY va CMD.', '/videos/docker/dockerfile.mp4', 35, TRUE, 1),
(420, 312, 'Deploy version moi', 'PDF', 'Checklist deploy an toan va rollback.', NULL, 20, FALSE, 1);

INSERT IGNORE INTO enrollments (enrollment_id, student_id, batch_id, enrolled_at, status, progress_percent) VALUES
(510, 8, 104, '2026-06-02 09:00:00', 'ACTIVE', 40),
(511, 9, 104, '2026-06-03 09:00:00', 'ACTIVE', 68),
(512, 10, 105, '2026-06-12 09:00:00', 'PENDING', 0),
(513, 11, 106, '2026-06-05 09:00:00', 'ACTIVE', 55),
(514, 12, 106, '2026-06-06 09:00:00', 'ACTIVE', 82),
(515, 13, 107, '2026-06-08 09:00:00', 'ACTIVE', 18);


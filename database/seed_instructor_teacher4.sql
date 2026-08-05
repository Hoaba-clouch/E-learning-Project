USE elearning_system;

INSERT IGNORE INTO course_categories (category_id, category_name, description, status) VALUES
(1, 'Lap trinh', 'Cac khoa hoc ve lap trinh web, backend, frontend va co so du lieu.', 'ACTIVE'),
(7, 'Kinh doanh', 'Cac khoa hoc thuong mai dien tu, tai chinh va van hanh kinh doanh.', 'ACTIVE');

INSERT IGNORE INTO course_batches
(batch_id, course_id, teacher_id, batch_code, batch_name, start_date, end_date, enrollment_start_date, enrollment_deadline, min_students, max_students, tuition_fee, learning_mode, online_platform, default_meeting_url, timezone, status, note)
VALUES
(101, 1, 4, 'WEB-TEACH-01', 'Web co ban K01', '2026-06-02', '2026-07-12', '2026-05-10', '2026-06-01', 5, 30, 799000, 'ONLINE', 'ZOOM', 'https://zoom.us/j/web-teach-01', 'Asia/Ho_Chi_Minh', 'STARTED', 'Lop lap trinh web cho giang vien 02.'),
(102, 2, 4, 'REACT-TEACH-01', 'React thuc chien K01', '2026-06-15', '2026-08-01', '2026-05-20', '2026-06-14', 5, 25, 1299000, 'ONLINE', 'GOOGLE_MEET', 'https://meet.google.com/react-teach-01', 'Asia/Ho_Chi_Minh', 'OPEN', 'Lop ReactJS thuc chien.'),
(103, 9, 4, 'FINANCE-TEACH-01', 'Tai chinh ca nhan K01', '2026-06-20', '2026-08-05', '2026-05-25', '2026-06-18', 5, 30, 790000, 'ONLINE', 'ZOOM', 'https://zoom.us/j/finance-teach-01', 'Asia/Ho_Chi_Minh', 'OPEN', 'Lop tai chinh ca nhan cho nguoi tre.');

INSERT IGNORE INTO class_sessions
(session_id, batch_id, teacher_id, session_title, session_description, start_time, end_time, meeting_url, meeting_password, platform, status, recording_url, note)
VALUES
(201, 101, 4, 'HTML/CSS workshop', 'On tap giao dien va responsive.', '2026-06-11 19:00:00', '2026-06-11 20:30:00', 'https://zoom.us/j/web-teach-01', '123456', 'ZOOM', 'SCHEDULED', NULL, 'Buoi hoc toi nay.'),
(202, 102, 4, 'React props and state', 'Lam viec voi component co ban.', '2026-06-13 19:00:00', '2026-06-13 20:30:00', 'https://meet.google.com/react-teach-01', '654321', 'GOOGLE_MEET', 'SCHEDULED', NULL, 'Buoi hoc tuan nay.'),
(203, 103, 4, 'Budget planning practice', 'Thuc hanh lap ke hoach chi tieu.', '2026-06-15 19:00:00', '2026-06-15 20:30:00', 'https://zoom.us/j/finance-teach-01', '789012', 'ZOOM', 'SCHEDULED', NULL, 'Buoi hoc tuan toi.');

INSERT IGNORE INTO course_modules (module_id, course_id, module_title, description, order_no) VALUES
(301, 1, 'Nen tang HTML va cau truc website', 'Lam quen voi HTML va semantic tags.', 1),
(302, 1, 'CSS va bo cuc giao dien', 'Flexbox, grid va responsive.',     2),
(303, 2, 'Tong quan ReactJS', 'Component, props va state.', 1),
(304, 2, 'Xay dung du an React thuc te', 'Mini project quan ly khoa hoc.', 2),
(305, 9, 'Quan ly thu chi ca nhan', 'Lap ke hoach chi tieu va ngan sach.', 1),
(306, 9, 'Dau tu co ban', 'Cac kenh dau tu pho bien.', 2);

INSERT IGNORE INTO lessons
(lesson_id, module_id, lesson_title, lesson_type, content, video_url, duration_minutes, is_preview, order_no)
VALUES
(401, 301, 'Gioi thieu khoa hoc va lo trinh', 'VIDEO', 'Tong quan khoa hoc.', '/videos/web/intro.mp4', 15, TRUE, 1),
(402, 301, 'HTML co ban', 'VIDEO', 'Cach tao trang HTML dau tien.', '/videos/web/html-basic.mp4', 35, FALSE, 2),
(403, 302, 'CSS co ban', 'VIDEO', 'Canh le, mau sac va font chu.', '/videos/web/css-basic.mp4', 40, FALSE, 1),
(404, 302, 'Responsive layout', 'LIVE', 'Buoi hoc truc tiep ve giao dien responsive.', NULL, 90, FALSE, 2),
(405, 303, 'ReactJS la gi', 'VIDEO', 'Gioi thieu React va component.', '/videos/react/intro.mp4', 30, TRUE, 1),
(406, 303, 'State va Props', 'VIDEO', 'Quan ly du lieu trong component.', '/videos/react/state-props.mp4', 45, FALSE, 2),
(407, 304, 'Xay dung giao dien danh sach khoa hoc', 'LIVE', 'Thuc hanh voi React.', NULL, 120, FALSE, 1),
(408, 304, 'Custom Hook co ban', 'VIDEO', 'Tap trung vao xu ly logic dung chung.', '/videos/react/hooks.mp4', 35, FALSE, 2),
(409, 305, 'Lap bang thu chi', 'VIDEO', 'Theo doi tien vao va tien ra.', '/videos/finance/budget.mp4', 35, TRUE, 1),
(410, 305, 'Xay dung quy du phong', 'VIDEO', 'Quy trinh kiem soat chi tieu.', '/videos/finance/fund.mp4', 40, FALSE, 2),
(411, 306, 'Dau tu co ban', 'LIVE', 'Hoi dap truc tuyen ve dau tu an toan.', NULL, 90, FALSE, 1),
(412, 306, 'Quan ly rui ro', 'VIDEO', 'Xay dung ke hoach dau tu an toan hon.', '/videos/finance/risk.mp4', 30, FALSE, 2);

INSERT IGNORE INTO enrollments (enrollment_id, student_id, batch_id, enrolled_at, status, progress_percent) VALUES
(501, 8, 101, '2026-05-11 08:00:00', 'ACTIVE', 92),
(502, 9, 101, '2026-05-12 08:00:00', 'ACTIVE', 76),
(503, 10, 101, '2026-05-13 08:00:00', 'COMPLETED', 100),
(504, 11, 102, '2026-05-20 08:00:00', 'ACTIVE', 48),
(505, 12, 102, '2026-05-21 08:00:00', 'ACTIVE', 66),
(506, 13, 102, '2026-05-22 08:00:00', 'ACTIVE', 33),
(507, 14, 103, '2026-05-25 08:00:00', 'ACTIVE', 58),
(508, 15, 103, '2026-05-26 08:00:00', 'ACTIVE', 81),
(509, 16, 103, '2026-05-27 08:00:00', 'ACTIVE', 74);

INSERT IGNORE INTO lesson_progress (progress_id, student_id, lesson_id, is_completed, completed_at) VALUES
(601, 8, 401, TRUE, '2026-06-01 10:00:00'),
(602, 8, 402, TRUE, '2026-06-02 10:00:00'),
(603, 9, 401, TRUE, '2026-06-01 10:00:00'),
(604, 11, 405, FALSE, NULL),
(605, 12, 405, TRUE, '2026-06-08 11:00:00'),
(606, 14, 409, TRUE, '2026-06-09 15:00:00');

INSERT IGNORE INTO assignments (assignment_id, batch_id, title, description, due_date, max_score) VALUES
(701, 101, 'Bai tap HTML/CSS', 'Xay dung trang gioi thieu don gian.', '2026-06-18 23:59:59', 10),
(702, 102, 'Bai tap React', 'Xay dung component quan ly danh sach.', '2026-06-25 23:59:59', 10);

INSERT IGNORE INTO assignment_submissions
(submission_id, assignment_id, student_id, file_url, content, submitted_at, score, feedback, graded_at, graded_by)
VALUES
(801, 701, 8, NULL, 'Em da hoan thanh bai tap.', '2026-06-14 20:00:00', NULL, NULL, NULL, NULL),
(802, 701, 9, NULL, 'Bai nop cua em.', '2026-06-14 20:15:00', 8.5, 'Tot, can sua phan CSS.', '2026-06-15 10:00:00', 4),
(803, 702, 11, NULL, 'React project cua em.', '2026-06-20 21:00:00', NULL, NULL, NULL, NULL);

INSERT IGNORE INTO payments
(payment_id, student_id, batch_id, amount, payment_method, payment_status, transaction_code, paid_at, created_at)
VALUES
(901, 8, 101, 799000, 'BANK_TRANSFER', 'SUCCESS', 'PAY-WEB-001', '2026-05-11 09:00:00', '2026-05-11 09:00:00'),
(902, 9, 101, 799000, 'MOMO', 'SUCCESS', 'PAY-WEB-002', '2026-05-12 09:00:00', '2026-05-12 09:00:00'),
(903, 11, 102, 1299000, 'BANK_TRANSFER', 'SUCCESS', 'PAY-REACT-001', '2026-05-20 09:00:00', '2026-05-20 09:00:00'),
(904, 12, 102, 1299000, 'VNPAY', 'SUCCESS', 'PAY-REACT-002', '2026-05-21 09:00:00', '2026-05-21 09:00:00'),
(905, 14, 103, 790000, 'MOMO', 'SUCCESS', 'PAY-FIN-001', '2026-05-25 09:00:00', '2026-05-25 09:00:00');

INSERT IGNORE INTO course_reviews
(review_id, student_id, course_id, teacher_id, rating, teacher_rating, comment, teacher_comment, created_at)
VALUES
(1001, 8, 1, 4, 5, 5, 'Rat hay va de hieu.', 'Cam on hoc vien da dong gop y kien.', '2026-06-02 12:00:00'),
(1002, 11, 2, 4, 4, 4, 'Noi dung thuc te.', 'Se bo sung them vi du.', '2026-06-09 12:00:00'),
(1003, 14, 9, 4, 5, 5, 'Rieng phan ngan sach rat de hieu.', 'Rat vui vi hoc vien tiep thu tot.', '2026-06-10 12:00:00');

INSERT IGNORE INTO quizzes
(quiz_id, batch_id, lesson_id, title, description, duration_minutes, max_score, pass_score, attempt_limit, created_at)
VALUES
(1101, 101, 402, 'Quiz HTML va CSS co ban', 'Kiem tra kien thuc nen tang HTML/CSS.', 30, 10, 5, 2, '2026-06-03 10:00:00'),
(1102, 102, 406, 'Quiz React Props va State', 'Kiem tra component, props va state.', 45, 10, 6, 2, '2026-06-08 10:00:00'),
(1103, 103, 409, 'Quiz Tai chinh ca nhan', 'Kiem tra lap ngan sach va quan ly thu chi.', 35, 10, 5, 2, '2026-06-10 10:00:00');

INSERT IGNORE INTO questions
(question_id, quiz_id, question_text, question_type, score)
VALUES
(1201, 1101, 'The nao dung de tao tieu de lon nhat trong HTML?', 'SINGLE_CHOICE', 2),
(1202, 1101, 'Flexbox thuong dung de lam gi?', 'SINGLE_CHOICE', 2),
(1203, 1102, 'Props trong React dung de lam gi?', 'SINGLE_CHOICE', 2),
(1204, 1102, 'State co the thay doi trong qua trinh chay khong?', 'TRUE_FALSE', 2),
(1205, 1103, 'Quy du phong nen phu hop voi muc nao?', 'SINGLE_CHOICE', 2),
(1206, 1103, 'Ngan sach ca nhan giup ich gi?', 'ESSAY', 4);

INSERT IGNORE INTO answer_options
(option_id, question_id, option_text, is_correct)
VALUES
(1251, 1201, 'The h1', TRUE),
(1252, 1201, 'The p', FALSE),
(1253, 1201, 'The div', FALSE),
(1254, 1201, 'The img', FALSE),
(1255, 1202, 'Can chinh va sap xep layout', TRUE),
(1256, 1202, 'Tao database', FALSE),
(1257, 1202, 'Gui email', FALSE),
(1258, 1202, 'Ma hoa mat khau', FALSE),
(1259, 1203, 'Truyen du lieu tu component cha sang con', TRUE),
(1260, 1203, 'Luu trang thai thay doi noi bo', FALSE),
(1261, 1203, 'Tao route backend', FALSE),
(1262, 1203, 'Ket noi database', FALSE),
(1263, 1204, 'True', TRUE),
(1264, 1204, 'False', FALSE),
(1265, 1205, '3 den 6 thang chi phi sinh hoat', TRUE),
(1266, 1205, 'Toan bo thu nhap hang thang', FALSE),
(1267, 1205, 'Chi tien giai tri', FALSE),
(1268, 1205, 'Khong can quy du phong', FALSE);

INSERT IGNORE INTO quiz_attempts
(attempt_id, quiz_id, student_id, started_at, submitted_at, score, status)
VALUES
(1301, 1101, 8, '2026-06-05 19:00:00', '2026-06-05 19:25:00', 9, 'GRADED'),
(1302, 1101, 9, '2026-06-05 19:00:00', '2026-06-05 19:29:00', 7, 'GRADED'),
(1303, 1102, 11, '2026-06-09 19:00:00', '2026-06-09 19:44:00', NULL, 'SUBMITTED'),
(1304, 1102, 12, '2026-06-09 19:00:00', '2026-06-09 19:39:00', 8, 'GRADED'),
(1305, 1103, 14, '2026-06-10 19:00:00', '2026-06-10 19:31:00', NULL, 'SUBMITTED');

INSERT IGNORE INTO quiz_answers
(answer_id, attempt_id, question_id, option_id, essay_answer)
VALUES
(1351, 1301, 1201, 1251, NULL),
(1352, 1301, 1202, 1255, NULL),
(1353, 1302, 1201, 1251, NULL),
(1354, 1302, 1202, 1256, NULL),
(1355, 1303, 1203, 1259, NULL),
(1356, 1303, 1204, 1263, NULL),
(1357, 1304, 1203, 1259, NULL),
(1358, 1304, 1204, 1264, NULL),
(1359, 1305, 1205, 1265, NULL),
(1360, 1305, 1206, NULL, 'Ngan sach ca nhan giup theo doi dong tien, uu tien tiet kiem va han che chi tieu cam tinh.');

INSERT IGNORE INTO discussions
(discussion_id, batch_id, user_id, title, content, created_at)
VALUES
(1401, 101, 8, 'Em can giai thich them ve responsive', 'Thay co the cho them vi du ve mobile layout khong a?', '2026-06-11 08:20:00'),
(1402, 102, 11, 'Props va state khac nhau nhu the nao?', 'Em van bi nham khi truyen du lieu qua component.', '2026-06-11 09:10:00'),
(1403, 103, 14, 'Xin mau bang ngan sach', 'Thay co file mau de em ap dung khong a?', '2026-06-10 20:15:00');

INSERT IGNORE INTO discussion_comments
(comment_id, discussion_id, user_id, content, created_at)
VALUES
(1501, 1401, 4, 'Thay se bo sung vi du trong buoi toi nay.', '2026-06-11 08:45:00'),
(1502, 1403, 4, 'Thay da dang file mau trong tai lieu lop.', '2026-06-10 20:40:00');

INSERT IGNORE INTO notifications
(notification_id, user_id, title, content, is_read, created_at)
VALUES
(1601, 4, 'Thong bao doi lich lop React', 'Lop React toi thu Sau se bat dau luc 19:30.', FALSE, '2026-06-11 07:30:00'),
(1602, 4, 'Da dang rubric bai tap HTML/CSS', 'Hoc vien co the xem rubric trong khu vuc bai tap.', TRUE, '2026-06-10 17:30:00'),
(1603, 4, 'Han nop bai tai chinh ca nhan', 'Nhac hoc vien nop bai truoc 23:59 Chu nhat.', FALSE, '2026-06-09 17:30:00');

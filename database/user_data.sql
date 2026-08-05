INSERT INTO users
(user_id, full_name, email, password_hash, phone, avatar_url, role, status)
VALUES
(1, 'Admin 01', 'admin1@elearning.vn', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0900000001', NULL, 'ADMIN', 'ACTIVE'),
(2, 'Admin 02', 'admin2@elearning.vn', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0900000002', NULL, 'ADMIN', 'ACTIVE'),

(3, 'Giảng viên 01', 'gv01@elearning.vn', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0910000001', NULL, 'TEACHER', 'ACTIVE'),
(4, 'Giảng viên 02', 'gv02@elearning.vn', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0910000002', NULL, 'TEACHER', 'ACTIVE'),
(5, 'Giảng viên 03', 'gv03@elearning.vn', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0910000003', NULL, 'TEACHER', 'ACTIVE'),
(6, 'Giảng viên 04', 'gv04@elearning.vn', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0910000004', NULL, 'TEACHER', 'ACTIVE'),
(7, 'Giảng viên 05', 'gv05@elearning.vn', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0910000005', NULL, 'TEACHER', 'ACTIVE'),

(8, 'Học viên 01', 'hv01@elearning.vn', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0920000001', NULL, 'STUDENT', 'ACTIVE'),
(9, 'Học viên 02', 'hv02@elearning.vn', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0920000002', NULL, 'STUDENT', 'ACTIVE'),
(10, 'Học viên 03', 'hv03@elearning.vn', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0920000003', NULL, 'STUDENT', 'ACTIVE'),
(11, 'Học viên 04', 'hv04@elearning.vn', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0920000004', NULL, 'STUDENT', 'ACTIVE'),
(12, 'Học viên 05', 'hv05@elearning.vn', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0920000005', NULL, 'STUDENT', 'ACTIVE'),
(13, 'Học viên 06', 'hv06@elearning.vn', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0920000006', NULL, 'STUDENT', 'ACTIVE'),
(14, 'Học viên 07', 'hv07@elearning.vn', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0920000007', NULL, 'STUDENT', 'ACTIVE'),
(15, 'Học viên 08', 'hv08@elearning.vn', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0920000008', NULL, 'STUDENT', 'ACTIVE'),
(16, 'Học viên 09', 'hv09@elearning.vn', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0920000009', NULL, 'STUDENT', 'ACTIVE'),
(17, 'Học viên 10', 'hv10@elearning.vn', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '0920000010', NULL, 'STUDENT', 'ACTIVE');

INSERT INTO teacher_profiles
(teacher_id, bio, specialization, experience_years, qualification, workplace)
VALUES
(3, 'Giảng viên demo 01', 'Lập trình Web', 5, 'Cử nhân CNTT', 'E-learning Center'),
(4, 'Giảng viên demo 02', 'Digital Marketing', 6, 'Cử nhân Marketing', 'E-learning Center'),
(5, 'Giảng viên demo 03', 'Tiếng Anh', 4, 'TESOL', 'E-learning Center'),
(6, 'Giảng viên demo 04', 'Phân tích dữ liệu', 5, 'Cử nhân HTTT', 'E-learning Center'),
(7, 'Giảng viên demo 05', 'Thiết kế đồ họa', 3, 'Cử nhân Thiết kế', 'E-learning Center');

INSERT INTO student_profiles
(student_id, date_of_birth, gender, address)
VALUES
(8, '2001-01-01', 'MALE', 'TP.HCM'),
(9, '2001-01-02', 'FEMALE', 'TP.HCM'),
(10, '2001-01-03', 'MALE', 'TP.HCM'),
(11, '2001-01-04', 'FEMALE', 'TP.HCM'),
(12, '2001-01-05', 'MALE', 'TP.HCM'),
(13, '2001-01-06', 'FEMALE', 'TP.HCM'),
(14, '2001-01-07', 'MALE', 'TP.HCM'),
(15, '2001-01-08', 'FEMALE', 'TP.HCM'),
(16, '2001-01-09', 'MALE', 'TP.HCM'),
(17, '2001-01-10', 'FEMALE', 'TP.HCM');

 Admin:c
      - admin1@elearning.vn / Password123
      - admin2@elearning.vn / Password123

  - Giảng viên:
      - gv01@elearning.vn / Password123
      - gv02@elearning.vn / Password123
      - gv03@elearning.vn / Password123

  - Học viên:
      - hv01@elearning.vn / Password123
      - hv02@elearning.vn / Password123
      - hv03@elearning.vn / Password123
      - hv04@elearning.vn / Password123
      - hv05@elearning.vn / Password123

  - Tài khoản test:
      - student@example.com / 12345678
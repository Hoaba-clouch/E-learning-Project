-- Dữ liệu demo chi tiết cho một khóa học duy nhất:
--   TikTok Content & Livestream bán hàng (course_id = 4)
--
-- Script chỉ INSERT dữ liệu có mã demo riêng, không TRUNCATE/DELETE dữ liệu
-- hiện có. Có thể chạy lại nhiều lần nhờ INSERT IGNORE.

USE elearning_system;
START TRANSACTION;

-- 1) Thêm các module nâng cao cho course 4.
INSERT IGNORE INTO course_modules (module_id, course_id, module_title, description, order_no) VALUES
(31, 4, 'Chiến lược nội dung TikTok', 'Xây dựng trụ cột nội dung, lịch đăng và nhận diện thương hiệu.', 4),
(32, 4, 'Tối ưu hồ sơ và thuật toán', 'Tối ưu bio, từ khóa, hashtag và tín hiệu đề xuất.', 5),
(33, 4, 'Quảng cáo và chuyển đổi', 'Kết hợp nội dung tự nhiên với quảng cáo để tăng đơn hàng.', 6),
(34, 4, 'Đo lường hiệu quả kênh', 'Đọc số liệu, đánh giá phễu và cải thiện tỷ lệ chuyển đổi.', 7),
(35, 4, 'Dự án cuối khóa', 'Xây dựng một chiến dịch TikTok hoàn chỉnh từ ý tưởng đến báo cáo.', 8);

-- 2) Bổ sung bài học nhiều loại: video, text, PDF và live.
INSERT IGNORE INTO lessons
    (lesson_id, module_id, lesson_title, lesson_type, content, video_url,
     video_web_url, duration_minutes, is_preview, order_no)
VALUES
(61, 31, 'Xác định chân dung người xem', 'VIDEO', 'Phân tích khách hàng mục tiêu và nhu cầu theo từng nhóm hành vi.', 'https://www.youtube.com/watch?v=demo-tiktok-61', 'https://www.w3schools.com/html/mov_bbb.mp4', 22, TRUE, 1),
(62, 31, 'Xây dựng 5 trụ cột nội dung', 'TEXT', 'Bài đọc hướng dẫn tạo nhóm nội dung ổn định cho kênh.', NULL, NULL, 18, FALSE, 2),
(63, 31, 'Lịch đăng 30 ngày', 'PDF', 'Mẫu lịch đăng nội dung TikTok theo tuần.', NULL, NULL, 12, FALSE, 3),
(64, 32, 'Tối ưu bio và ảnh đại diện', 'VIDEO', 'Thiết lập hồ sơ giúp người xem hiểu kênh trong 5 giây đầu.', 'https://www.youtube.com/watch?v=demo-tiktok-64', 'https://www.w3schools.com/html/movie.mp4', 20, TRUE, 1),
(65, 32, 'Hashtag và từ khóa tìm kiếm', 'TEXT', 'Cách chọn hashtag có ý định mua hàng và từ khóa ngách.', NULL, NULL, 16, FALSE, 2),
(66, 32, 'Livestream thử: kiểm tra thiết bị', 'LIVE', 'Buổi live thử để kiểm tra âm thanh, ánh sáng và đường truyền.', NULL, NULL, 60, FALSE, 3),
(67, 33, 'Thiết lập TikTok Shop', 'VIDEO', 'Chuẩn bị sản phẩm, giá bán và voucher trên TikTok Shop.', 'https://www.youtube.com/watch?v=demo-tiktok-67', 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', 28, FALSE, 1),
(68, 33, 'Kịch bản ưu đãi và CTA', 'TEXT', 'Các mẫu lời kêu gọi hành động để tăng tỷ lệ chốt đơn.', NULL, NULL, 19, FALSE, 2),
(69, 33, 'Quảng cáo Spark Ads', 'VIDEO', 'Đọc chỉ số cơ bản và chọn video để chạy Spark Ads.', 'https://www.youtube.com/watch?v=demo-tiktok-69', 'https://www.w3schools.com/html/mov_bbb.mp4', 34, FALSE, 3),
(70, 34, 'Đọc TikTok Analytics', 'VIDEO', 'Phân tích lượt xem, thời gian xem và nguồn truy cập.', 'https://www.youtube.com/watch?v=demo-tiktok-70', 'https://www.w3schools.com/html/movie.mp4', 26, TRUE, 1),
(71, 34, 'Theo dõi phễu chuyển đổi', 'TEXT', 'Từ lượt xem đến click sản phẩm và đơn hàng.', NULL, NULL, 15, FALSE, 2),
(72, 34, 'Workshop tối ưu một video', 'LIVE', 'Giảng viên nhận xét trực tiếp số liệu và đề xuất chỉnh sửa.', NULL, NULL, 75, FALSE, 3),
(73, 35, 'Brief dự án cuối khóa', 'PDF', 'Yêu cầu và tiêu chí chấm chiến dịch TikTok.', NULL, NULL, 10, FALSE, 1),
(74, 35, 'Quay video dự án', 'VIDEO', 'Thực hành quay, dựng và xuất bản video bán hàng.', 'https://www.youtube.com/watch?v=demo-tiktok-74', 'https://www.w3schools.com/html/mov_bbb.mp4', 45, FALSE, 2),
(75, 35, 'Báo cáo kết quả chiến dịch', 'TEXT', 'Mẫu báo cáo và cách trình bày insight sau chiến dịch.', NULL, NULL, 25, FALSE, 3);

-- 3) Bài tập gắn với batch đang có học viên (batch 5).
INSERT IGNORE INTO assignments
    (assignment_id, batch_id, lesson_id, title, description, due_date, max_score)
VALUES
(7, 5, 61, 'Bài tập 1: Phân tích chân dung khách hàng', 'Lập một hồ sơ khách hàng mục tiêu cho sản phẩm tự chọn.', DATE_ADD(CURRENT_TIMESTAMP(), INTERVAL 10 DAY), 10),
(8, 5, 64, 'Bài tập 2: Tối ưu hồ sơ TikTok', 'Nộp ảnh chụp bio, avatar và giải thích lựa chọn từ khóa.', DATE_ADD(CURRENT_TIMESTAMP(), INTERVAL 17 DAY), 10),
(9, 5, 68, 'Bài tập 3: Viết kịch bản livestream', 'Viết kịch bản mở đầu, giới thiệu sản phẩm, xử lý từ chối và chốt đơn.', DATE_ADD(CURRENT_TIMESTAMP(), INTERVAL 24 DAY), 10),
(10, 5, 74, 'Đồ án cuối khóa: Chiến dịch 7 ngày', 'Xây dựng và báo cáo một chiến dịch TikTok bán hàng trong 7 ngày.', DATE_ADD(CURRENT_TIMESTAMP(), INTERVAL 35 DAY), 20);

-- 4) Quiz với nhiều dạng câu hỏi.
INSERT IGNORE INTO quizzes
    (quiz_id, batch_id, lesson_id, title, description, duration_minutes, max_score, pass_score, attempt_limit)
VALUES
(7, 5, 62, 'Quiz chiến lược nội dung', 'Kiểm tra kiến thức về trụ cột nội dung và hook.', 20, 10, 5, 2),
(8, 5, 68, 'Quiz chuyển đổi và chốt đơn', 'Kiểm tra CTA, ưu đãi và xử lý phản đối.', 25, 10, 6, 2),
(9, 5, 70, 'Quiz đọc TikTok Analytics', 'Kiểm tra cách đọc số liệu và phễu chuyển đổi.', 30, 10, 5, 2);

INSERT IGNORE INTO questions (question_id, quiz_id, question_text, question_type, score) VALUES
(13, 7, 'Hook TikTok nên làm gì trong những giây đầu?', 'SINGLE_CHOICE', 2),
(14, 7, 'Một kênh nên có nhiều trụ cột nội dung để tránh nhàm chán.', 'TRUE_FALSE', 2),
(15, 7, 'Lịch đăng nội dung giúp ích gì?', 'SINGLE_CHOICE', 2),
(16, 8, 'CTA phù hợp khi khách còn do dự là gì?', 'SINGLE_CHOICE', 2),
(17, 8, 'Những yếu tố nào hỗ trợ chốt đơn trong livestream?', 'MULTIPLE_CHOICE', 2),
(18, 8, 'Có thể thử nhiều cách mở đầu livestream để so sánh.', 'TRUE_FALSE', 2),
(19, 9, 'Chỉ số nào phản ánh khả năng giữ chân người xem?', 'SINGLE_CHOICE', 2),
(20, 9, 'Tỷ lệ chuyển đổi được tính dựa trên điều gì?', 'SINGLE_CHOICE', 2),
(21, 9, 'Hãy nêu hai hành động cải thiện một video có nhiều lượt xem nhưng ít đơn.', 'ESSAY', 2);

INSERT IGNORE INTO answer_options (option_id, question_id, option_text, is_correct) VALUES
(47, 13, 'Tạo sự chú ý và nêu lợi ích rõ ràng', TRUE), (48, 13, 'Giới thiệu dài về người bán', FALSE), (49, 13, 'Để màn hình trống', FALSE), (50, 13, 'Đọc toàn bộ thông tin liên hệ', FALSE),
(51, 14, 'Đúng', TRUE), (52, 14, 'Sai', FALSE),
(53, 15, 'Duy trì nhịp xuất bản và đo lường kết quả', TRUE), (54, 15, 'Xóa toàn bộ video cũ', FALSE), (55, 15, 'Chỉ đăng khi có khuyến mãi', FALSE), (56, 15, 'Không cần theo dõi dữ liệu', FALSE),
(57, 16, 'Mời khách thử ưu đãi có thời hạn', TRUE), (58, 16, 'Ép khách mua ngay', FALSE), (59, 16, 'Tắt phần bình luận', FALSE), (60, 16, 'Bỏ qua câu hỏi của khách', FALSE),
(61, 17, 'Demo sản phẩm', TRUE), (62, 17, 'Mã giảm giá', TRUE), (63, 17, 'Tương tác bình luận', TRUE), (64, 17, 'Ẩn giá sản phẩm', FALSE),
(65, 18, 'Đúng', TRUE), (66, 18, 'Sai', FALSE),
(67, 19, 'Thời gian xem trung bình', TRUE), (68, 19, 'Số ký tự trong caption', FALSE), (69, 19, 'Số lần đổi avatar', FALSE), (70, 19, 'Số sản phẩm trong kho', FALSE),
(71, 20, 'Số đơn hàng chia cho số lượt truy cập sản phẩm', TRUE), (72, 20, 'Số người theo dõi chia cho số video', FALSE), (73, 20, 'Số phút livestream', FALSE), (74, 20, 'Số hashtag trong caption', FALSE);

-- 4b) Bổ sung quiz cho các bài học còn lại để khóa demo có đủ dữ liệu kiểm thử.
-- Các mã 10-20, 22-54 và 75-184 là mã demo riêng, INSERT IGNORE giúp chạy lặp an toàn.
INSERT IGNORE INTO quizzes
    (quiz_id, batch_id, lesson_id, title, description, duration_minutes, max_score, pass_score, attempt_limit)
VALUES
(10, 5, 61, 'Quiz chân dung người xem', 'Kiểm tra cách xác định khách hàng mục tiêu và nhu cầu xem.', 15, 10, 5, 2),
(11, 5, 63, 'Quiz lịch đăng 30 ngày', 'Kiểm tra cách lập lịch và duy trì nhịp xuất bản.', 15, 10, 5, 2),
(12, 5, 64, 'Quiz tối ưu hồ sơ TikTok', 'Kiểm tra bio, ảnh đại diện và thông điệp kênh.', 15, 10, 5, 2),
(13, 5, 65, 'Quiz hashtag và từ khóa', 'Kiểm tra cách chọn từ khóa có ý định mua hàng.', 15, 10, 5, 2),
(14, 5, 67, 'Quiz thiết lập TikTok Shop', 'Kiểm tra sản phẩm, giá bán và voucher trước khi mở bán.', 20, 10, 6, 2),
(15, 5, 69, 'Quiz Spark Ads', 'Kiểm tra các chỉ số và quy trình chạy quảng cáo Spark Ads.', 20, 10, 6, 2),
(16, 5, 71, 'Quiz phễu chuyển đổi', 'Kiểm tra hành trình từ lượt xem tới đơn hàng.', 15, 10, 5, 2),
(17, 5, 72, 'Quiz workshop tối ưu video', 'Kiểm tra cách đọc insight và đề xuất cải thiện video.', 15, 10, 5, 2),
(18, 5, 73, 'Quiz brief dự án cuối khóa', 'Kiểm tra yêu cầu và tiêu chí của chiến dịch cuối khóa.', 15, 10, 5, 2),
(19, 5, 74, 'Quiz quay video dự án', 'Kiểm tra quy trình quay, dựng và xuất bản video bán hàng.', 20, 10, 5, 2),
(20, 5, 75, 'Quiz báo cáo chiến dịch', 'Kiểm tra cách trình bày số liệu và insight sau chiến dịch.', 20, 10, 6, 2);

INSERT IGNORE INTO questions (question_id, quiz_id, question_text, question_type, score) VALUES
(22, 10, 'Chân dung người xem nên tập trung vào thông tin nào?', 'SINGLE_CHOICE', 2),
(23, 10, 'Có thể dùng dữ liệu bình luận để hiểu nhu cầu người xem.', 'TRUE_FALSE', 2),
(24, 10, 'Cách nào giúp kiểm tra giả thuyết về khách hàng mục tiêu?', 'SINGLE_CHOICE', 2),
(25, 11, 'Lịch đăng 30 ngày nên được xây dựng dựa trên yếu tố nào?', 'SINGLE_CHOICE', 2),
(26, 11, 'Những việc nào giúp duy trì lịch đăng ổn định?', 'MULTIPLE_CHOICE', 2),
(27, 11, 'Nên theo dõi hiệu quả từng nhóm nội dung sau khi đăng.', 'TRUE_FALSE', 2),
(28, 12, 'Bio tốt cần giúp người mới hiểu điều gì trong vài giây đầu?', 'SINGLE_CHOICE', 2),
(29, 12, 'Ảnh đại diện không cần liên quan tới chủ đề kênh.', 'TRUE_FALSE', 2),
(30, 12, 'Thông tin nào nên xuất hiện trong hồ sơ bán hàng?', 'SINGLE_CHOICE', 2),
(31, 13, 'Từ khóa có ý định mua hàng thường mô tả điều gì?', 'SINGLE_CHOICE', 2),
(32, 13, 'Những việc nào giúp hashtag phù hợp với nội dung?', 'MULTIPLE_CHOICE', 2),
(33, 13, 'Dùng càng nhiều hashtag thì video luôn càng hiệu quả.', 'TRUE_FALSE', 2),
(34, 14, 'Trước khi mở bán trên TikTok Shop cần chuẩn bị gì?', 'SINGLE_CHOICE', 2),
(35, 14, 'Những yếu tố nào hỗ trợ tăng tỷ lệ chốt đơn?', 'MULTIPLE_CHOICE', 2),
(36, 14, 'Nên kiểm tra giá và tồn kho trước khi livestream.', 'TRUE_FALSE', 2),
(37, 15, 'Spark Ads thường dùng nội dung nào làm điểm bắt đầu?', 'SINGLE_CHOICE', 2),
(38, 15, 'Những chỉ số nào cần theo dõi khi chạy quảng cáo?', 'MULTIPLE_CHOICE', 2),
(39, 15, 'Có thể tối ưu quảng cáo chỉ dựa vào lượt hiển thị.', 'TRUE_FALSE', 2),
(40, 16, 'Bước nào gần với chuyển đổi mua hàng nhất?', 'SINGLE_CHOICE', 2),
(41, 16, 'Những điểm chạm nào có thể đưa người xem vào phễu?', 'MULTIPLE_CHOICE', 2),
(42, 16, 'Tỷ lệ chuyển đổi nên được so sánh theo từng giai đoạn.', 'TRUE_FALSE', 2),
(43, 17, 'Khi tối ưu video, nên ưu tiên cải thiện yếu tố nào trước?', 'SINGLE_CHOICE', 2),
(44, 17, 'Những dữ liệu nào giúp đánh giá chất lượng video?', 'MULTIPLE_CHOICE', 2),
(45, 17, 'Một video nhiều lượt xem chắc chắn tạo ra nhiều đơn hàng.', 'TRUE_FALSE', 2),
(46, 18, 'Brief dự án cần nêu rõ mục tiêu nào?', 'SINGLE_CHOICE', 2),
(47, 18, 'Brief tốt cần có những thành phần nào?', 'MULTIPLE_CHOICE', 2),
(48, 18, 'Có thể bỏ qua tiêu chí đo lường trong brief.', 'TRUE_FALSE', 2),
(49, 19, 'Trước khi quay video cần chuẩn bị gì?', 'SINGLE_CHOICE', 2),
(50, 19, 'Những yếu tố nào ảnh hưởng chất lượng video bán hàng?', 'MULTIPLE_CHOICE', 2),
(51, 19, 'Nên kiểm tra âm thanh trước khi xuất bản video.', 'TRUE_FALSE', 2),
(52, 20, 'Báo cáo chiến dịch nên bắt đầu bằng nội dung nào?', 'SINGLE_CHOICE', 2),
(53, 20, 'Những chỉ số nào nên có trong báo cáo?', 'MULTIPLE_CHOICE', 2),
(54, 20, 'Insight chỉ là danh sách số liệu, không cần giải thích.', 'TRUE_FALSE', 2);

INSERT IGNORE INTO answer_options (option_id, question_id, option_text, is_correct) VALUES
(75, 22, 'Nhu cầu, hành vi và vấn đề của nhóm khách hàng', TRUE), (76, 22, 'Màu nền của ứng dụng', FALSE), (77, 22, 'Số lượng nhân viên bán hàng', FALSE), (78, 22, 'Tên nhà cung cấp mạng', FALSE),
(79, 23, 'Đúng', TRUE), (80, 23, 'Sai', FALSE),
(81, 24, 'Phỏng vấn, thử nội dung và đo phản hồi', TRUE), (82, 24, 'Đoán theo cảm tính', FALSE), (83, 24, 'Chỉ xem số người theo dõi', FALSE), (84, 24, 'Tắt bình luận', FALSE),
(85, 25, 'Mục tiêu, nguồn lực và hành vi người xem', TRUE), (86, 25, 'Số ngày nghỉ của người bán', FALSE), (87, 25, 'Màu sắc logo', FALSE), (88, 25, 'Số lượng điện thoại', FALSE),
(89, 26, 'Chuẩn bị nội dung trước', TRUE), (90, 26, 'Dùng lịch nhắc đăng', TRUE), (91, 26, 'Theo dõi hiệu quả', TRUE), (92, 26, 'Đăng ngẫu nhiên hoàn toàn', FALSE),
(93, 27, 'Đúng', TRUE), (94, 27, 'Sai', FALSE),
(95, 28, 'Chủ đề kênh và lợi ích người xem nhận được', TRUE), (96, 28, 'Mật khẩu tài khoản', FALSE), (97, 28, 'Danh sách bạn bè', FALSE), (98, 28, 'Số serial điện thoại', FALSE),
(99, 29, 'Đúng', FALSE), (100, 29, 'Sai', TRUE),
(101, 30, 'Sản phẩm, lời hứa giá trị và cách liên hệ', TRUE), (102, 30, 'Mã OTP cá nhân', FALSE), (103, 30, 'Lịch sử chat riêng tư', FALSE), (104, 30, 'Mật khẩu ngân hàng', FALSE),
(105, 31, 'Nhu cầu hoặc vấn đề người xem muốn giải quyết', TRUE), (106, 31, 'Tên màu yêu thích của người bán', FALSE), (107, 31, 'Số lượt đổi avatar', FALSE), (108, 31, 'Số lượng thiết bị quay', FALSE),
(109, 32, 'Liên quan trực tiếp tới nội dung', TRUE), (110, 32, 'Có lượng tìm kiếm phù hợp', TRUE), (111, 32, 'Có thể kết hợp từ khóa ngách', TRUE), (112, 32, 'Chọn hashtag bất kỳ', FALSE),
(113, 33, 'Đúng', FALSE), (114, 33, 'Sai', TRUE),
(115, 34, 'Sản phẩm, giá, tồn kho và thông tin vận chuyển', TRUE), (116, 34, 'Chỉ cần một video bất kỳ', FALSE), (117, 34, 'Mật khẩu khách hàng', FALSE), (118, 34, 'Danh sách bạn bè', FALSE),
(119, 35, 'Demo sản phẩm', TRUE), (120, 35, 'Voucher có thời hạn', TRUE), (121, 35, 'Trả lời bình luận', TRUE), (122, 35, 'Ẩn giá sản phẩm', FALSE),
(123, 36, 'Đúng', TRUE), (124, 36, 'Sai', FALSE),
(125, 37, 'Một video tự nhiên đã có tín hiệu tốt', TRUE), (126, 37, 'Một bản nháp chưa quay', FALSE), (127, 37, 'Một trang tính trống', FALSE), (128, 37, 'Một tin nhắn riêng tư', FALSE),
(129, 38, 'Chi phí trên kết quả', TRUE), (130, 38, 'Tỷ lệ nhấp', TRUE), (131, 38, 'Tỷ lệ chuyển đổi', TRUE), (132, 38, 'Số lần đổi tên kênh', FALSE),
(133, 39, 'Đúng', FALSE), (134, 39, 'Sai', TRUE),
(135, 40, 'Khách hoàn tất đặt hàng hoặc thanh toán', TRUE), (136, 40, 'Khách chỉ lướt qua', FALSE), (137, 40, 'Khách đổi ảnh đại diện', FALSE), (138, 40, 'Khách tắt âm thanh', FALSE),
(139, 41, 'Video giới thiệu sản phẩm', TRUE), (140, 41, 'Trang sản phẩm', TRUE), (141, 41, 'Livestream', TRUE), (142, 41, 'Màn hình cài đặt điện thoại', FALSE),
(143, 42, 'Đúng', TRUE), (144, 42, 'Sai', FALSE),
(145, 43, 'Hook và tỷ lệ giữ chân ở những giây đầu', TRUE), (146, 43, 'Màu nền của trình soạn thảo', FALSE), (147, 43, 'Số người trong danh bạ', FALSE), (148, 43, 'Tên thiết bị quay', FALSE),
(149, 44, 'Thời gian xem trung bình', TRUE), (150, 44, 'Tỷ lệ xem hết', TRUE), (151, 44, 'Tỷ lệ nhấp sản phẩm', TRUE), (152, 44, 'Số lần đổi avatar', FALSE),
(153, 45, 'Đúng', FALSE), (154, 45, 'Sai', TRUE),
(155, 46, 'Mục tiêu, đối tượng và kết quả cần đạt', TRUE), (156, 46, 'Mật khẩu đăng nhập', FALSE), (157, 46, 'Danh sách liên hệ cá nhân', FALSE), (158, 46, 'Màu nền ứng dụng', FALSE),
(159, 47, 'Thông điệp chính', TRUE), (160, 47, 'Kênh triển khai', TRUE), (161, 47, 'Tiêu chí đo lường', TRUE), (162, 47, 'Mật khẩu tài khoản', FALSE),
(163, 48, 'Đúng', FALSE), (164, 48, 'Sai', TRUE),
(165, 49, 'Kịch bản, sản phẩm, ánh sáng và âm thanh', TRUE), (166, 49, 'Chỉ cần mở camera', FALSE), (167, 49, 'Mật khẩu khách hàng', FALSE), (168, 49, 'Danh sách bạn bè', FALSE),
(169, 50, 'Ánh sáng ổn định', TRUE), (170, 50, 'Âm thanh rõ', TRUE), (171, 50, 'Khung hình và lời kêu gọi hành động', TRUE), (172, 50, 'Số lượng ứng dụng cài đặt', FALSE),
(173, 51, 'Đúng', TRUE), (174, 51, 'Sai', FALSE),
(175, 52, 'Mục tiêu và kết quả tổng quan', TRUE), (176, 52, 'Danh sách mật khẩu', FALSE), (177, 52, 'Lịch sử tin nhắn riêng', FALSE), (178, 52, 'Tên thiết bị cá nhân', FALSE),
(179, 53, 'Lượt xem và thời gian xem', TRUE), (180, 53, 'Chi phí và tỷ lệ chuyển đổi', TRUE), (181, 53, 'Số đơn hàng', TRUE), (182, 53, 'Số lần đổi avatar', FALSE),
(183, 54, 'Đúng', FALSE), (184, 54, 'Sai', TRUE);

-- 5) Lịch học cho cả batch cũ và học viên đang demo.
INSERT IGNORE INTO class_sessions
    (session_id, batch_id, teacher_id, session_title, session_description,
     start_time, end_time, meeting_url, meeting_password, platform, status,
     recording_url, note)
VALUES
(31, 5, 4, 'Workshop: phân tích một video bán hàng', 'Mổ xẻ hook, nhịp dựng và CTA của video mẫu.', DATE_ADD(DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY), INTERVAL 19 HOUR), DATE_ADD(DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY), INTERVAL 21 HOUR), 'https://meet.google.com/tiktok-k01', 'TTK001', 'GOOGLE_MEET', 'COMPLETED', 'https://learnx.local/recordings/tiktok-session-31', 'Đã có bản ghi để học viên xem lại.'),
(32, 5, 4, 'Livestream thử lần 1', 'Thực hành ánh sáng, âm thanh và kịch bản mở đầu.', DATE_ADD(DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY), INTERVAL 19 HOUR), DATE_ADD(DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY), INTERVAL 21 HOUR), 'https://meet.google.com/tiktok-k01', 'TTK002', 'GOOGLE_MEET', 'COMPLETED', 'https://learnx.local/recordings/tiktok-session-32', 'Giảng viên đã nhận xét phần thực hành.'),
(33, 5, 4, 'Workshop: tối ưu TikTok Shop', 'Thiết lập sản phẩm, voucher và kịch bản chốt đơn.', DATE_ADD(DATE_ADD(CURRENT_DATE(), INTERVAL 2 DAY), INTERVAL 19 HOUR), DATE_ADD(DATE_ADD(CURRENT_DATE(), INTERVAL 2 DAY), INTERVAL 21 HOUR), 'https://meet.google.com/tiktok-k01', 'TTK003', 'GOOGLE_MEET', 'SCHEDULED', NULL, 'Buổi học sắp tới.'),
(34, 5, 4, 'Livestream thử lần 2', 'Thực hành xử lý từ chối và chốt đơn.', DATE_ADD(DATE_ADD(CURRENT_DATE(), INTERVAL 9 DAY), INTERVAL 19 HOUR), DATE_ADD(DATE_ADD(CURRENT_DATE(), INTERVAL 9 DAY), INTERVAL 21 HOUR), 'https://meet.google.com/tiktok-k01', 'TTK004', 'GOOGLE_MEET', 'SCHEDULED', NULL, NULL),
(35, 5, 4, 'Phân tích số liệu kênh', 'Đọc Analytics và chọn video cần tối ưu.', DATE_ADD(DATE_ADD(CURRENT_DATE(), INTERVAL 16 DAY), INTERVAL 19 HOUR), DATE_ADD(DATE_ADD(CURRENT_DATE(), INTERVAL 16 DAY), INTERVAL 21 HOUR), 'https://meet.google.com/tiktok-k01', 'TTK005', 'GOOGLE_MEET', 'SCHEDULED', NULL, NULL),
(36, 5, 4, 'Bảo vệ đồ án cuối khóa', 'Trình bày chiến dịch 7 ngày và nhận phản biện.', DATE_ADD(DATE_ADD(CURRENT_DATE(), INTERVAL 30 DAY), INTERVAL 19 HOUR), DATE_ADD(DATE_ADD(CURRENT_DATE(), INTERVAL 30 DAY), INTERVAL 21 HOUR), 'https://meet.google.com/tiktok-k01', 'TTK006', 'GOOGLE_MEET', 'SCHEDULED', NULL, NULL);

-- 6) Nhiều trạng thái học viên để demo danh sách, tiến độ và thanh toán.
INSERT IGNORE INTO enrollments
    (enrollment_id, student_id, batch_id, enrolled_at, status, progress_percent)
VALUES
(33, 11, 5, DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 20 DAY), 'ACTIVE', 15),
(34, 12, 5, DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 18 DAY), 'ACTIVE', 35),
(35, 13, 5, DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 16 DAY), 'ACTIVE', 50),
(36, 14, 5, DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 14 DAY), 'ACTIVE', 65),
(37, 15, 5, DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 12 DAY), 'ACTIVE', 80),
(38, 16, 5, DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 35 DAY), 'COMPLETED', 100),
(39, 17, 5, DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 3 DAY), 'PENDING', 0);

INSERT IGNORE INTO payments
    (payment_id, student_id, batch_id, amount, payment_method, payment_status,
     transaction_code, paid_at, created_at)
VALUES
(23, 11, 5, 1199000, 'BANK_TRANSFER', 'SUCCESS', 'DEMO-TT-PAY-001', DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 20 DAY), DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 20 DAY)),
(24, 12, 5, 1199000, 'MOMO', 'SUCCESS', 'DEMO-TT-PAY-002', DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 18 DAY), DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 18 DAY)),
(25, 13, 5, 1199000, 'VNPAY', 'SUCCESS', 'DEMO-TT-PAY-003', DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 16 DAY), DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 16 DAY)),
(26, 14, 5, 1199000, 'BANK_TRANSFER', 'SUCCESS', 'DEMO-TT-PAY-004', DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 14 DAY), DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 14 DAY)),
(27, 15, 5, 1199000, 'VNPAY', 'SUCCESS', 'DEMO-TT-PAY-005', DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 12 DAY), DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 12 DAY)),
(28, 16, 5, 1199000, 'MOMO', 'SUCCESS', 'DEMO-TT-PAY-006', DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 35 DAY), DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 35 DAY)),
(29, 17, 5, 1199000, 'VNPAY', 'PENDING', 'DEMO-TT-PAY-007', NULL, DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 3 DAY));

-- 7) Tiến độ bài học, bài nộp và kết quả quiz.
INSERT IGNORE INTO lesson_progress (progress_id, student_id, lesson_id, is_completed, completed_at) VALUES
(13, 11, 61, TRUE, DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 18 DAY)), (14, 11, 62, FALSE, NULL),
(15, 12, 61, TRUE, DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 16 DAY)), (16, 12, 62, TRUE, DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 15 DAY)), (17, 12, 63, FALSE, NULL),
(18, 13, 61, TRUE, DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 14 DAY)), (19, 13, 62, TRUE, DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 13 DAY)), (20, 13, 63, TRUE, DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 12 DAY)),
(21, 14, 61, TRUE, DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 12 DAY)), (22, 14, 62, TRUE, DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 11 DAY)), (23, 14, 63, TRUE, DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 10 DAY)), (24, 14, 64, FALSE, NULL),
(25, 15, 61, TRUE, DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 10 DAY)), (26, 15, 62, TRUE, DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 9 DAY)), (27, 15, 63, TRUE, DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 8 DAY)), (28, 15, 64, TRUE, DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)),
(29, 16, 61, TRUE, DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)), (30, 16, 62, TRUE, DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 29 DAY)), (31, 16, 63, TRUE, DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 28 DAY)), (32, 16, 64, TRUE, DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 27 DAY));

INSERT IGNORE INTO assignment_submissions
    (submission_id, assignment_id, student_id, file_url, content, submitted_at, score, feedback, graded_at, graded_by)
VALUES
(5, 7, 11, NULL, 'Đã hoàn thành chân dung khách hàng mục tiêu.', DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 12 DAY), 8.0, 'Phân tích rõ, cần bổ sung hành vi mua.', DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 10 DAY), 4),
(6, 7, 12, NULL, 'Bản persona cho sản phẩm thời trang.', DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 11 DAY), 9.0, 'Ví dụ thực tế và có insight tốt.', DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 9 DAY), 4),
(7, 8, 12, NULL, 'Đã tối ưu bio và bộ hashtag.', DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 5 DAY), NULL, NULL, NULL, NULL),
(8, 8, 13, NULL, 'Đã nộp ảnh chụp hồ sơ TikTok.', DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 4 DAY), 7.5, 'CTA có thể rõ hơn.', DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 2 DAY), 4),
(9, 9, 14, NULL, 'Kịch bản livestream 45 phút.', DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 3 DAY), NULL, NULL, NULL, NULL),
(10, 10, 16, NULL, 'Báo cáo chiến dịch 7 ngày.', DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 2 DAY), 17.5, 'Đạt yêu cầu, số liệu trình bày tốt.', DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY), 4);

INSERT IGNORE INTO quiz_attempts (attempt_id, quiz_id, student_id, started_at, submitted_at, score, status) VALUES
(7, 7, 11, DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 10 DAY), DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 10 DAY), 7.5, 'GRADED'),
(8, 7, 12, DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 9 DAY), DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 9 DAY), 9.0, 'GRADED'),
(9, 8, 13, DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 6 DAY), DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 6 DAY), 6.5, 'GRADED'),
(10, 8, 14, DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 5 DAY), NULL, NULL, 'IN_PROGRESS'),
(11, 9, 15, DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 4 DAY), DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 4 DAY), 8.0, 'SUBMITTED'),
(12, 9, 16, DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 25 DAY), DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 25 DAY), 10.0, 'GRADED');

-- 8) Đánh giá, thảo luận và bình luận để demo tương tác.
INSERT IGNORE INTO course_reviews
    (review_id, student_id, course_id, teacher_id, rating, teacher_rating, comment, teacher_comment, status, created_at)
VALUES
(7, 11, 4, 4, 5, 5, 'Nhiều ví dụ thực tế, dễ áp dụng cho shop nhỏ.', 'Cảm ơn em, tiếp tục thử nghiệm nhiều hook mới nhé.', 'VISIBLE', DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 15 DAY)),
(8, 12, 4, 4, 4, 5, 'Phần livestream rất hữu ích, bài tập sát thực tế.', 'Chúc em tự tin hơn khi lên sóng.', 'VISIBLE', DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 13 DAY)),
(9, 13, 4, 4, 5, 4, 'Đọc Analytics dễ hiểu và có checklist rõ ràng.', 'Thầy đã ghi nhận góp ý về phần báo cáo.', 'VISIBLE', DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 11 DAY)),
(10, 14, 4, 4, 4, 4, 'Nội dung tốt, mong có thêm case ngành mỹ phẩm.', NULL, 'VISIBLE', DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 9 DAY)),
(11, 15, 4, 4, 5, 5, 'Đồ án cuối khóa giúp em có portfolio đầu tiên.', 'Rất tốt, hãy tiếp tục cập nhật số liệu.', 'VISIBLE', DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)),
(12, 16, 4, 4, 5, 5, 'Lộ trình đầy đủ từ nội dung đến chốt đơn.', 'Chúc mừng em đã hoàn thành khóa học.', 'VISIBLE', DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 5 DAY)),
(13, 17, 4, 4, 3, 4, 'Đang học phần đầu, ví dụ khá trực quan.', NULL, 'VISIBLE', DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 2 DAY));

INSERT IGNORE INTO discussions
    (discussion_id, batch_id, lesson_id, user_id, discussion_type, title, content, status, is_pinned)
VALUES
(6, 5, 61, 11, 'QUESTION', 'Làm sao nghĩ hook cho sản phẩm ít khác biệt?', 'Em đang bán phụ kiện điện thoại, mong thầy gợi ý cách mở đầu video.', 'OPEN', 0),
(7, 5, 66, 12, 'DISCUSSION', 'Checklist chuẩn bị livestream', 'Mọi người thường kiểm tra những gì trước khi bấm nút live?', 'OPEN', 1),
(8, 5, 70, 14, 'QUESTION', 'Tỷ lệ xem hết video bao nhiêu là tốt?', 'Em muốn biết mốc tham khảo để đánh giá video 30 giây.', 'RESOLVED', 0);

INSERT IGNORE INTO discussion_comments
    (comment_id, discussion_id, parent_comment_id, user_id, content, is_instructor_answer, status)
VALUES
(6, 6, NULL, 4, 'Em hãy thử mở đầu bằng vấn đề khách hàng gặp phải và kết quả sau khi dùng sản phẩm.', TRUE, 'VISIBLE'),
(7, 6, 6, 11, 'Em hiểu rồi, em sẽ thử hai phiên bản hook để so sánh.', FALSE, 'VISIBLE'),
(8, 7, NULL, 14, 'Em thường kiểm tra pin, mạng, mic và danh sách sản phẩm.', FALSE, 'VISIBLE'),
(9, 7, NULL, 4, 'Bổ sung thêm ánh sáng và kịch bản xử lý bình luận nhé.', TRUE, 'VISIBLE'),
(10, 8, NULL, 4, 'Không có một mốc cố định; nên so sánh với các video cùng chủ đề và mục tiêu.', TRUE, 'VISIBLE'),
(11, 8, NULL, 14, 'Cảm ơn thầy, em sẽ theo dõi thêm thời gian xem trung bình.', FALSE, 'VISIBLE');

-- 9) Điểm danh cho lịch học đã hoàn thành.
INSERT IGNORE INTO session_attendance
    (attendance_id, session_id, student_id, status, joined_at, left_at, duration_minutes, note)
VALUES
(37, 31, 11, 'PRESENT', DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 14 DAY), DATE_ADD(DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 14 DAY), INTERVAL 110 MINUTE), 110, NULL),
(38, 31, 12, 'PRESENT', DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 14 DAY), DATE_ADD(DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 14 DAY), INTERVAL 105 MINUTE), 105, NULL),
(39, 31, 13, 'LATE', DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 14 DAY), DATE_ADD(DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 14 DAY), INTERVAL 80 MINUTE), 80, 'Vào muộn 20 phút.'),
(40, 31, 14, 'ABSENT', NULL, NULL, 0, 'Có phép.'),
(41, 32, 11, 'PRESENT', DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY), DATE_ADD(DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY), INTERVAL 115 MINUTE), 115, NULL),
(42, 32, 12, 'PRESENT', DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY), DATE_ADD(DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY), INTERVAL 108 MINUTE), 108, NULL),
(43, 32, 13, 'PRESENT', DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY), DATE_ADD(DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY), INTERVAL 100 MINUTE), 100, NULL),
(44, 32, 14, 'LATE', DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY), DATE_ADD(DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY), INTERVAL 90 MINUTE), 90, 'Mất kết nối đầu buổi.'),
(45, 32, 15, 'PRESENT', DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY), DATE_ADD(DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY), INTERVAL 118 MINUTE), 118, NULL),
(46, 32, 16, 'PRESENT', DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY), DATE_ADD(DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY), INTERVAL 120 MINUTE), 120, NULL);

-- 10) Một vài thông báo để demo chuông thông báo của học viên.
INSERT IGNORE INTO notifications
    (notification_id, user_id, notification_type, title, content, reference_type, reference_id, target_url, priority, is_read)
VALUES
(9, 11, 'ASSIGNMENT', 'Bài tập mới được giao', 'Bài tập phân tích chân dung khách hàng đã mở.', 'ASSIGNMENT', 7, '/student/assignments', 'NORMAL', 0),
(10, 12, 'QUIZ', 'Quiz chiến lược nội dung', 'Bạn có thể làm quiz chương 4 ngay hôm nay.', 'QUIZ', 7, '/student/quizzes', 'NORMAL', 0),
(11, 14, 'SESSION', 'Lịch livestream thử lần 2', 'Buổi học trực tuyến sẽ diễn ra sau 9 ngày.', 'SESSION', 34, '/student/schedule', 'HIGH', 0),
(12, 16, 'COURSE', 'Chúc mừng hoàn thành khóa học', 'Bạn đã hoàn thành khóa TikTok Content & Livestream bán hàng.', 'COURSE', 4, '/student/courses', 'HIGH', 1);

COMMIT;

SELECT
    c.course_name,
    (SELECT COUNT(*) FROM course_modules WHERE course_id = 4) AS module_count,
    (SELECT COUNT(*) FROM lessons l INNER JOIN course_modules m ON m.module_id = l.module_id WHERE m.course_id = 4) AS lesson_count,
    (SELECT COUNT(*) FROM enrollments WHERE batch_id = 5) AS batch5_enrollment_count,
    (SELECT COUNT(*) FROM assignments WHERE batch_id = 5) AS assignment_count,
    (SELECT COUNT(*) FROM quizzes WHERE batch_id = 5) AS quiz_count,
    (SELECT COUNT(*) FROM course_reviews WHERE course_id = 4 AND status = 'VISIBLE') AS review_count
FROM courses c WHERE c.course_id = 4;

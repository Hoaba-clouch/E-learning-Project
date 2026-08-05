// Mock data used by instructor pages during development
export type InstructorNavKey =
	| "dashboard"
	| "courses"
	| "quizzes"
	| "students"
	| "interaction"
	| "analytics"
	| "profile";

export const instructorProfile = {
	name: "Giảng viên 02",
	role: "Giảng viên chính",
	avatar:
		"https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80",
};

export const instructorNavItems: {
	key: InstructorNavKey;
	label: string;
	icon: string;
	path: string;
}[] = [
	{ key: "dashboard", label: "Tổng quan", icon: "dashboard", path: "/instructor" },
	{
		key: "courses",
		label: "Quản lý khóa học",
		icon: "library_books",
		path: "/instructor/courses",
	},
	{
		key: "quizzes",
		label: "Bài kiểm tra",
		icon: "quiz",
		path: "/instructor/quizzes",
	},
	{ key: "students", label: "Học viên", icon: "group", path: "/instructor/students" },
	{
		key: "interaction",
		label: "Tương tác",
		icon: "forum",
		path: "/instructor/interaction",
	},
	{
		key: "analytics",
		label: "Phân tích",
		icon: "analytics",
		path: "/instructor/analytics",
	},
	{
		key: "profile",
		label: "Hồ sơ",
		icon: "account_circle",
		path: "/instructor/profile",
	},
];

export const courseManagementStats = [
	{ label: "Khóa học", value: "12", icon: "menu_book", tone: "primary" },
	{ label: "Học viên", value: "240", icon: "groups", tone: "accent" },
	{ label: "Chương", value: "48", icon: "view_list", tone: "muted" },
	{ label: "Lớp nhận học viên", value: "6", icon: "event_available", tone: "success" },
];

export const instructorCourses = [
	{
		id: 101,
		title: "Lập trình Python cho người mới",
		category: "Lập trình",
		level: "BEGINNER",
		students: 120,
		modules: 8,
		lessons: 32,
		completion: 72,
		thumbnail: "",
		status: "Đã xuất bản",
		statusTone: "success",
		workflowStatus: "APPROVED",
	},
	{
		id: 102,
		title: "Thiết kế Web với React",
		category: "Frontend",
		level: "INTERMEDIATE",
		students: 80,
		modules: 6,
		lessons: 24,
		completion: 55,
		thumbnail: "",
		status: "Bản nháp",
		statusTone: "muted",
		workflowStatus: "DRAFT",
	},
];

export const courseBatches = [
	{
		id: 201,
		code: "BATCH-201",
		name: "Lớp sáng",
		students: "30/40",
		status: "OPEN",
		statusValue: "OPEN",
		course: "Lập trình Python cho người mới",
		dates: "01/06/2026 - 30/06/2026",
		mode: "Offline",
	},
	{
		id: 202,
		code: "BATCH-202",
		name: "Lớp tối",
		students: "40/40",
		status: "FULL",
		statusValue: "FULL",
		course: "Thiết kế Web với React",
		dates: "05/06/2026 - 05/07/2026",
		mode: "Online",
	},
];

export const lessonPlanner = [
	{
		id: 301,
		module: "Module 1: Giới thiệu",
		title: "Tuần 1 - Giới thiệu",
		courseId: 101,
		lessons: 4,
		duration: "3 giờ",
		state: "scheduled",
		date: "2026-06-01",
	},
	{
		id: 302,
		module: "Module 2: Cơ bản",
		title: "Tuần 2 - Cơ bản Python",
		courseId: 101,
		lessons: 5,
		duration: "4 giờ",
		state: "planned",
		date: "2026-06-08",
	},
];

export const dashboardStats = [
	{ label: "Khóa học đang dạy", value: "8", change: "+2 trong tháng này", icon: "menu_book", tone: "blue" },
	{ label: "Tổng học viên", value: "426", change: "+18.4% tăng trưởng", icon: "groups", tone: "slate" },
	{ label: "Hoàn thành TB", value: "78%", change: "+6.2% cải thiện", icon: "trending_up", tone: "green" },
	{ label: "Cần chấm điểm", value: "23", change: "Cần xử lý", icon: "rate_review", tone: "amber" },
];

export const teachingSchedule = [
	{
		time: "09:00",
		title: "Workshop ReactJS thực chiến",
		batch: "REACT-TEACH-01",
		mode: "Google Meet",
		status: "Sắp diễn ra",
	},
	{
		time: "14:00",
		title: "Ôn tập HTML/CSS",
		batch: "WEB-TEACH-01",
		mode: "Zoom",
		status: "Hôm nay",
	},
	{
		time: "19:30",
		title: "Tư vấn tài chính cá nhân",
		batch: "FINANCE-TEACH-01",
		mode: "Zoom",
		status: "Tối nay",
	},
];

export const analyticsBars = [
	{ label: "T1", value: 44 },
	{ label: "T2", value: 58 },
	{ label: "T3", value: 62 },
	{ label: "T4", value: 74 },
	{ label: "T5", value: 68 },
	{ label: "T6", value: 82 },
];

export const coursePerformance = [
	{
		id: 1,
		title: "Lập trình Web căn bản với HTML, CSS, JavaScript",
		category: "Lập trình",
		students: 3,
		completion: 89,
		rating: 5,
		revenue: "2 triệu",
		status: "Đã duyệt",
	},
	{
		id: 2,
		title: "ReactJS thực chiến cho người mới",
		category: "Lập trình",
		students: 3,
		completion: 49,
		rating: 4,
		revenue: "3 triệu",
		status: "Đã duyệt",
	},
	{
		id: 9,
		title: "Tài chính cá nhân cho người trẻ",
		category: "Kinh doanh",
		students: 3,
		completion: 71,
		rating: 5,
		revenue: "2 triệu",
		status: "Đã duyệt",
	},
];

export const studentSignals = [
	{
		id: 6,
		name: "Học viên 06",
		course: "ReactJS thực chiến cho người mới",
		note: "Tiến độ dưới 50%, cần hỗ trợ sớm.",
		progress: 33,
	},
	{
		id: 4,
		name: "Học viên 04",
		course: "ReactJS thực chiến cho người mới",
		note: "Chuyên cần giảm trong tuần gần nhất.",
		progress: 48,
	},
	{
		id: 3,
		name: "Học viên 03",
		course: "Cơ sở dữ liệu",
		note: "Chưa bắt đầu học sau khi được xếp lớp.",
		progress: 0,
	},
];

export const studentManagementStats = [
	{ label: "Học viên", value: "15", icon: "groups", tone: "blue" },
	{ label: "Đang học", value: "12", icon: "school", tone: "green" },
	{ label: "Cần hỗ trợ", value: "3", icon: "support_agent", tone: "amber" },
	{ label: "Hoàn thành", value: "2", icon: "verified", tone: "slate" },
];

export const cohortFilters = [
	"Tất cả lớp",
	"WEB-TEACH-01",
	"REACT-TEACH-01",
	"FINANCE-TEACH-01",
	"VUE-TEACH-01",
	"DOCKER-TEACH-01",
];

export const instructorStudents = [
	{
		id: 1,
		name: "Học viên 01",
		email: "hv01@elearning.vn",
		course: "Lập trình Web căn bản với HTML, CSS, JavaScript",
		batch: "WEB-TEACH-01",
		progress: 92,
		attendance: 88,
		status: "Xuất sắc",
		lastActive: "1 ngày trước",
		latestIntervention: {
			id: 1,
			note: "Theo dõi tốt, có thể giao bài nâng cao.",
			nextAction: "Gửi tài liệu mở rộng.",
			createdAt: "2026-06-11 08:00:00",
		},
	},
	{
		id: 4,
		name: "Học viên 04",
		email: "hv04@elearning.vn",
		course: "ReactJS thực chiến cho người mới",
		batch: "REACT-TEACH-01",
		progress: 48,
		attendance: 70,
		status: "Có rủi ro",
		lastActive: "5 ngày trước",
		latestIntervention: {
			id: 2,
			note: "Cần nhắc học viên hoàn thành bài React props.",
			nextAction: "Nhắn tin sau buổi học.",
			createdAt: "2026-06-11 09:00:00",
		},
	},
	{
		id: 6,
		name: "Học viên 06",
		email: "hv06@elearning.vn",
		course: "Docker và deploy cơ bản",
		batch: "DOCKER-TEACH-01",
		progress: 18,
		attendance: 70,
		status: "Có rủi ro",
		lastActive: "9 ngày trước",
		latestIntervention: {
			id: 3,
			note: "Tiến độ thấp, cần hẹn hỗ trợ riêng.",
			nextAction: "Gửi lịch phụ đạo.",
			createdAt: "2026-06-11 10:00:00",
		},
	},
	{
		id: 9,
		name: "Học viên 09",
		email: "hv09@elearning.vn",
		course: "Tài chính cá nhân cho người trẻ",
		batch: "FINANCE-TEACH-01",
		progress: 74,
		attendance: 70,
		status: "Cần xem xét",
		lastActive: "3 ngày trước",
		latestIntervention: {
			id: 4,
			note: "Cần hoàn thành quiz tài chính.",
			nextAction: "Nhắc trước hạn.",
			createdAt: "2026-06-11 11:00:00",
		},
	},
];

export const studentAttentionQueue = [
	{
		name: "Học viên 06",
		priority: "Cao",
		reason: "Tiến độ dưới 50%, cần hỗ trợ sớm.",
		action: "Chi tiết",
	},
	{
		name: "Học viên 04",
		priority: "Cao",
		reason: "Chuyên cần giảm và còn bài chưa hoàn thành.",
		action: "Chi tiết",
	},
	{
		name: "Học viên 09",
		priority: "Trung bình",
		reason: "Cần nhắc hoàn thành bài kiểm tra.",
		action: "Chi tiết",
	},
];

export const interactionStats = [
	{ label: "Thảo luận mới", value: "7", icon: "forum", tone: "blue" },
	{ label: "Tin nhắn", value: "12", icon: "mail", tone: "slate" },
	{ label: "Thông báo", value: "5", icon: "campaign", tone: "green" },
	{ label: "Cần phản hồi", value: "3", icon: "quickreply", tone: "amber" },
];

export const discussionThreads = [
	{
		id: 1402,
		title: "Props và state khác nhau như thế nào?",
		content: "Em vẫn bị nhầm khi truyền dữ liệu qua component.",
		author: "Học viên 04",
		course: "ReactJS thực chiến cho người mới",
		batch: "REACT-TEACH-01",
		replies: 1,
		lastActivity: "7 ngày trước",
		status: "Cần phản hồi",
		comments: [
			{
				id: 1,
				author: "Học viên 04",
				time: "7 ngày trước",
				content: "Em vẫn bị nhầm khi truyền dữ liệu qua component.",
				isTeacher: false,
			},
		],
	},
	{
		id: 1401,
		title: "Em cần giải thích thêm về responsive",
		content: "Thầy có thể cho thêm ví dụ về mobile layout không ạ?",
		author: "Học viên 01",
		course: "Lập trình Web căn bản với HTML, CSS, JavaScript",
		batch: "WEB-TEACH-01",
		replies: 2,
		lastActivity: "7 ngày trước",
		status: "Đã trả lời",
		comments: [
			{
				id: 1,
				author: "Học viên 01",
				time: "7 ngày trước",
				content: "Thầy có thể cho thêm ví dụ về mobile layout không ạ?",
				isTeacher: false,
			},
			{
				id: 2,
				author: "Giảng viên 02",
				time: "7 ngày trước",
				content: "Thầy sẽ bổ sung ví dụ trong buổi tối nay.",
				isTeacher: true,
			},
		],
	},
];

export const directMessages = [
	{
		student: "Học viên 04",
		preview: "Em vẫn bị nhầm khi truyền dữ liệu qua component.",
		time: "7 ngày trước",
		priority: "Cao",
	},
	{
		student: "Học viên 01",
		preview: "Thầy có thể cho thêm ví dụ về mobile layout không ạ?",
		time: "7 ngày trước",
		priority: "Trung bình",
	},
	{
		student: "Học viên 07",
		preview: "Thầy có file mẫu để em áp dụng không ạ?",
		time: "7 ngày trước",
		priority: "Trung bình",
	},
];

export const announcementDrafts = [
	{ title: "Nhắc lịch học tối nay", target: "WEB-TEACH-01", state: "Đã gửi" },
	{ title: "Cập nhật bài tập React", target: "REACT-TEACH-01", state: "Bản nháp" },
	{ title: "Tài liệu ôn tập tài chính", target: "FINANCE-TEACH-01", state: "Đã gửi" },
];

export const quizManagementStats = [
	{ label: "Bài kiểm tra", value: "8", icon: "quiz", tone: "blue" },
	{ label: "Câu hỏi", value: "42", icon: "help", tone: "slate" },
	{ label: "Lượt làm", value: "96", icon: "assignment_turned_in", tone: "green" },
	{ label: "Cần chấm", value: "3", icon: "rate_review", tone: "amber" },
];

export const instructorQuizzes = [
	{
		title: "Quiz HTML và CSS cơ bản",
		course: "Lập trình Web căn bản với HTML, CSS, JavaScript",
		batch: "WEB-TEACH-01",
		questions: 2,
		duration: "30 phút",
		attempts: 2,
		passRate: 100,
		status: "Đã xuất bản",
	},
	{
		title: "Quiz React Props và State",
		course: "ReactJS thực chiến cho người mới",
		batch: "REACT-TEACH-01",
		questions: 2,
		duration: "45 phút",
		attempts: 2,
		passRate: 50,
		status: "Đã xuất bản",
	},
	{
		title: "Quiz Tài chính cá nhân",
		course: "Tài chính cá nhân cho người trẻ",
		batch: "FINANCE-TEACH-01",
		questions: 2,
		duration: "35 phút",
		attempts: 1,
		passRate: 0,
		status: "Bản nháp",
	},
];

export const quizQuestionBank = [
	{
		topic: "HTML cơ bản",
		title: "Thẻ nào dùng để tạo tiêu đề lớn nhất trong HTML?",
		course: "Lập trình Web căn bản với HTML, CSS, JavaScript",
		type: "Trắc nghiệm",
		difficulty: "Cơ bản",
		usage: "3 lần dùng",
		count: 12,
	},
	{
		topic: "React Props và State",
		title: "Props trong React dùng để làm gì?",
		course: "ReactJS thực chiến cho người mới",
		type: "Trắc nghiệm",
		difficulty: "Trung bình",
		usage: "2 lần dùng",
		count: 8,
	},
];

export const gradingQueue = [
	{
		student: "Học viên 07",
		quiz: "Quiz Tài chính cá nhân",
		score: "Chờ chấm",
		submitted: "1 ngày trước",
	},
	{
		student: "Học viên 04",
		quiz: "Quiz React Props và State",
		score: "Chờ chấm",
		submitted: "2 ngày trước",
	},
];

export const analyticsStats = [
	{ label: "Tỷ lệ hoàn thành", value: "78%", icon: "trending_up", tone: "green" },
	{ label: "Điểm TB", value: "8.2", icon: "grade", tone: "blue" },
	{ label: "Chuyên cần", value: "82%", icon: "event_available", tone: "slate" },
	{ label: "Cần theo dõi", value: "5", icon: "warning", tone: "amber" },
];

export const engagementTrend = [
	{ label: "T1", value: 42 },
	{ label: "T2", value: 55 },
	{ label: "T3", value: 61 },
	{ label: "T4", value: 72 },
	{ label: "T5", value: 66 },
	{ label: "T6", value: 84 },
];

export const learnerSegments = [
	{ label: "Hoàn thành tốt", value: 46, tone: "green" },
	{ label: "Đang ổn định", value: 38, tone: "blue" },
	{ label: "Cần hỗ trợ", value: 16, tone: "amber" },
];

export const courseInsights = [
	{
		title: "Lập trình Web căn bản với HTML, CSS, JavaScript",
		completion: 89,
		quizAverage: 8.8,
		attendance: 86,
		trend: "+12%",
	},
	{
		title: "ReactJS thực chiến cho người mới",
		completion: 49,
		quizAverage: 7.2,
		attendance: 70,
		trend: "-4%",
	},
	{
		title: "Tài chính cá nhân cho người trẻ",
		completion: 71,
		quizAverage: 8.1,
		attendance: 78,
		trend: "+6%",
	},
];

export const analyticsRecommendations = [
	{
		title: "Nhắc nhóm học viên tiến độ thấp",
		impact: "Ưu tiên cao",
		detail: "Có 3 học viên dưới 50% tiến độ, nên gửi nhắc việc và gợi ý tài liệu ôn tập.",
	},
	{
		title: "Bổ sung ví dụ React Props",
		impact: "Tác động vừa",
		detail: "Câu hỏi về props/state xuất hiện nhiều trong thảo luận, nên thêm bài luyện tập ngắn.",
	},
	{
		title: "Tổng kết lớp tài chính",
		impact: "Tác động tốt",
		detail: "Lớp có chuyên cần ổn, phù hợp gửi checklist trước buổi cuối.",
	},
];

export default {};

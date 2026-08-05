import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import GuestLayout from "../components/GuestLayout";
import StudentCourseCard from "../../student/components/StudentCourseCard";
import { getPublicInstructor } from "../../student/services/studentCoursesApi";
import type { PublicInstructorDetail } from "../../student/types/course.types";

function GuestInstructorPage() {
  const navigate = useNavigate();
  const teacherId = Number(useParams().teacherId);
  const isValidTeacherId = Number.isInteger(teacherId) && teacherId > 0;
  const [teacher, setTeacher] = useState<PublicInstructorDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isValidTeacherId) return;
    getPublicInstructor(teacherId)
      .then(setTeacher)
      .catch((loadError) =>
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Không thể tải hồ sơ giảng viên.",
        ),
      );
  }, [isValidTeacherId, teacherId]);

  return (
    <GuestLayout activeView="courses">
      <main className="sp-public-instructor-page">
        {!isValidTeacherId ? (
          <p className="sp-state-line error">Giảng viên không hợp lệ.</p>
        ) : null}
        {error ? <p className="sp-state-line error">{error}</p> : null}
        {isValidTeacherId && !teacher && !error ? (
          <p className="sp-state-line">Đang tải hồ sơ...</p>
        ) : null}
        {teacher ? (
          <>
            <section className="sp-public-instructor-hero">
              <img
                alt={teacher.fullName}
                src={
                  teacher.avatarUrl ??
                  `https://api.dicebear.com/9.x/personas/svg?seed=${teacher.email}`
                }
              />
              <div>
                <p className="sp-eyebrow">Hồ sơ giảng viên</p>
                <h1>{teacher.fullName}</h1>
                <strong>
                  {teacher.specialization || "Chưa cập nhật chuyên môn"}
                </strong>
                <p>
                  {teacher.bio ||
                    "Giảng viên chưa cập nhật phần giới thiệu."}
                </p>
                <div className="sp-public-instructor-stats">
                  <span><b>{teacher.stats.averageRating}</b> điểm</span>
                  <span><b>{teacher.stats.reviewCount}</b> đánh giá</span>
                  <span><b>{teacher.stats.courseCount}</b> khóa học</span>
                  <span><b>{teacher.stats.studentCount}</b> lượt học</span>
                </div>
              </div>
            </section>

            <section className="sp-public-instructor-section">
              <h2>Khóa học của giảng viên</h2>
              <div className="sp-course-grid">
                {teacher.courses.map((course) => (
                  <StudentCourseCard
                    course={course}
                    key={course.id}
                    onOpen={(id) => navigate(`/courses/${id}`)}
                  />
                ))}
              </div>
            </section>

            <section className="sp-public-instructor-section">
              <h2>Đánh giá về giảng viên</h2>
              <div className="sp-review-list">
                {teacher.reviews.map((review) => (
                  <article className="sp-review-card" key={review.id}>
                    <img
                      alt=""
                      src={
                        review.student.avatarUrl ??
                        `https://api.dicebear.com/9.x/personas/svg?seed=${review.student.id}`
                      }
                    />
                    <div>
                      <strong>{review.student.fullName}</strong>
                      <span>{review.teacherRating}/5</span>
                      <p>{review.comment || "Không có nội dung nhận xét."}</p>
                      <small>{review.course.name}</small>
                    </div>
                  </article>
                ))}
                {!teacher.reviews.length ? (
                  <p>Chưa có đánh giá công khai.</p>
                ) : null}
              </div>
            </section>
          </>
        ) : null}
      </main>
    </GuestLayout>
  );
}

export default GuestInstructorPage;

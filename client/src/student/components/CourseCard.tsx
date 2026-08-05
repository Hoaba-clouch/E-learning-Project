import type { Course } from "../types/student.types";

type CourseCardProps = {
  course: Course;
};

function CourseCard({ course }: CourseCardProps) {
  return (
    <article className="sp-course-card">
      <div className="sp-course-media">
        <img src={course.image} alt={course.title} />
        <span>{course.category}</span>
      </div>
      <div className="sp-course-body">
        <h3>{course.title}</h3>
        <p className="sp-author">
          <img
            src={`https://api.dicebear.com/9.x/personas/svg?seed=${course.author}`}
            alt=""
          />{" "}
          {course.author}
        </p>
        <div className="sp-course-footer">
          <div>
            <p>
             {course.rating} <small>(1.2k)</small>
            </p>
            <strong>{course.price}</strong>
          </div>
          <button type="button">Thêm </button>
        </div>
      </div>
    </article>
  );
}

export default CourseCard;

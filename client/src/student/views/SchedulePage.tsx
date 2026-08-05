import { useEffect, useMemo, useState } from "react";
import Icon from "../components/Icon";
import { getCourseDetail, getMyCourses } from "../services/studentCoursesApi";
import type {
  StudentClassSession,
  StudentCourseDetail,
  StudentEnrolledCourse,
} from "../types/course.types";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getSessionState(session: StudentClassSession) {
  const now = Date.now();
  const start = new Date(session.startTime).getTime();
  const end = new Date(session.endTime).getTime();
  const status = String(session.status ?? "").toUpperCase();

  if (status === "CANCELLED") {
    return { label: "Đã hủy", tone: "cancelled" };
  }

  if (status === "COMPLETED") {
    return { label: "Đã xong", tone: "done" };
  }

  if (status === "LIVE" || (now >= start && now <= end)) {
    return { label: "Đang học", tone: "live" };
  }

  if (now < start) {
    const isToday = new Date(start).toDateString() === new Date().toDateString();
    return { label: isToday ? "Hôm nay" : "Sắp diễn ra", tone: "upcoming" };
  }

  return { label: "Đã xong", tone: "done" };
}

function buildScheduleItems(courses: StudentCourseDetail[]) {
  return courses.flatMap((course) =>
    course.batches.flatMap((batch) =>
      batch.sessions.map((session) => ({
        batchCode: batch.code ?? batch.name,
        batchId: batch.id,
        courseId: course.id,
        courseName: course.name,
        defaultMeetingUrl: batch.defaultMeetingUrl,
        classroomName: batch.classroomName,
        classroomAddress: batch.classroomAddress,
        learningMode: batch.learningMode,
        session,
      })),
    ),
  );
}

function filterCoursesByEnrollments(
  courses: StudentCourseDetail[],
  enrollments: StudentEnrolledCourse[],
) {
  const enrolledBatchIdsByCourseId = enrollments.reduce<Map<number, Set<number>>>(
    (result, item) => {
      const courseId = item.course.id;
      const batchIds = result.get(courseId) ?? new Set<number>();
      batchIds.add(item.batch.id);
      result.set(courseId, batchIds);
      return result;
    },
    new Map<number, Set<number>>(),
  );

  return courses
    .map((course) => {
      const enrolledBatchIds = enrolledBatchIdsByCourseId.get(course.id) ?? new Set<number>();
      return {
        ...course,
        batches: course.batches.filter((batch) => enrolledBatchIds.has(batch.id)),
      };
    })
    .filter((course) => course.batches.length > 0);
}

function SchedulePage() {
  const [courses, setCourses] = useState<StudentCourseDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("all");
  const [selectedBatchId, setSelectedBatchId] = useState("all");

  useEffect(() => {
    let mounted = true;

    async function loadSchedule() {
      setIsLoading(true);
      setError("");

      try {
        const enrolledCourses = await getMyCourses();
        const details = await Promise.all(
          enrolledCourses.map((item) => getCourseDetail(item.course.id)),
        );

        if (mounted) {
          setCourses(filterCoursesByEnrollments(details, enrolledCourses));
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : "Không thể tải lịch học.");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void loadSchedule();

    return () => {
      mounted = false;
    };
  }, []);

  const scheduleItems = useMemo(() => buildScheduleItems(courses), [courses]);
  const courseOptions = courses.map((course) => ({ id: course.id, name: course.name }));
  const batchOptions = scheduleItems
    .filter((item, index, list) => list.findIndex((current) => current.batchId === item.batchId) === index)
    .filter((item) => selectedCourseId === "all" || String(item.courseId) === selectedCourseId);

  const filteredSchedule = scheduleItems
    .filter((item) => selectedCourseId === "all" || String(item.courseId) === selectedCourseId)
    .filter((item) => selectedBatchId === "all" || String(item.batchId) === selectedBatchId)
    .sort((first, second) => new Date(first.session.startTime).getTime() - new Date(second.session.startTime).getTime());

  return (
    <main className="sp-schedule-page">
      <section className="sp-schedule-hero">
        <div>
          <span>Lịch học</span>
          <h1>Lịch học của tôi</h1>
          <p>Theo dõi các buổi học được giảng viên tạo cho lớp: thời gian, trạng thái và link tham gia.</p>
        </div>
        <div className="sp-schedule-summary">
          <strong>{filteredSchedule.length}</strong>
          <span>buổi học</span>
        </div>
      </section>

      <section className="sp-schedule-toolbar">
        <label>
          <span>Khóa học</span>
          <select
            value={selectedCourseId}
            onChange={(event) => {
              setSelectedCourseId(event.target.value);
              setSelectedBatchId("all");
            }}
          >
            <option value="all">Tất cả khóa học</option>
            {courseOptions.map((course) => (
              <option key={course.id} value={course.id}>{course.name}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Lớp học</span>
          <select value={selectedBatchId} onChange={(event) => setSelectedBatchId(event.target.value)}>
            <option value="all">Tất cả lớp</option>
            {batchOptions.map((item) => (
              <option key={item.batchId} value={item.batchId}>{item.batchCode} - {item.courseName}</option>
            ))}
          </select>
        </label>
      </section>

      {isLoading ? <p className="sp-schedule-state">Đang tải lịch học...</p> : null}
      {error ? <p className="sp-schedule-state error">{error}</p> : null}

      {!isLoading && !error ? (
        <section className="sp-schedule-list">
          {filteredSchedule.length === 0 ? (
            <article className="sp-schedule-empty">
              <Icon name="event_busy" />
              <h2>Chưa có lịch học</h2>
              <p>Khi giảng viên tạo buổi học hoặc lịch định kỳ, lịch sẽ xuất hiện ở đây.</p>
            </article>
          ) : (
            filteredSchedule.map((item) => {
              const sessionState = getSessionState(item.session);
              const meetingUrl = item.session.meetingUrl ?? item.defaultMeetingUrl;
              const classroom = [item.classroomName, item.classroomAddress].filter(Boolean).join(" - ");

              return (
                <article className="sp-schedule-card" key={item.session.id}>
                  <div className="sp-schedule-date">
                    <Icon name="event" />
                    <span>{formatDateTime(item.session.startTime)}</span>
                  </div>
                  <div className="sp-schedule-main">
                    <div>
                      <h2>{item.session.title}</h2>
                      <p>{item.courseName} • {item.batchCode}</p>
                    </div>
                    <span className={`sp-schedule-status ${sessionState.tone}`}>{sessionState.label}</span>
                  </div>
                  {item.session.description ? <p>{item.session.description}</p> : null}
                  <div className="sp-schedule-meta">
                    <span><Icon name="school" /> {item.learningMode}</span>
                    {item.learningMode !== "OFFLINE" ? (
                      <span><Icon name="video_call" /> {item.session.platform}</span>
                    ) : null}
                    {item.learningMode !== "ONLINE" && classroom ? (
                      <span><Icon name="location_on" /> {classroom}</span>
                    ) : null}
                    {item.session.recordingUrl ? <span><Icon name="movie" /> Có ghi hình</span> : null}
                  </div>
                  <div className="sp-schedule-actions">
                    {item.learningMode !== "OFFLINE" && meetingUrl ? (
                      <a href={meetingUrl} rel="noreferrer" target="_blank">
                        <Icon name="open_in_new" /> Vào lớp học
                      </a>
                    ) : item.learningMode !== "ONLINE" && classroom ? (
                      <button disabled type="button">
                        <Icon name="location_on" /> Học tại {classroom}
                      </button>
                    ) : (
                      <button disabled type="button">
                        {item.learningMode === "OFFLINE" ? "Chưa có phòng học" : "Chưa có link học"}
                      </button>
                    )}
                    {item.session.recordingUrl ? (
                      <a href={item.session.recordingUrl} rel="noreferrer" target="_blank">
                        <Icon name="play_circle" /> Xem lại
                      </a>
                    ) : null}
                  </div>
                </article>
              );
            })
          )}
        </section>
      ) : null}
    </main>
  );
}

export default SchedulePage;


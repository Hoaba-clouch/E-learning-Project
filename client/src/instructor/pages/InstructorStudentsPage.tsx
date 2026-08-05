import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { instructorApiRequest } from "../api/instructorApi";
import { getInstructorAuthTeacherId } from "../auth/instructorAuth";
import InstructorLayout from "../components/InstructorLayout";
import {
  cohortFilters,
  instructorStudents,
  studentAttentionQueue,
  studentManagementStats,
} from "../data/instructorMockData";

const DEFAULT_TEACHER_ID = getInstructorAuthTeacherId();

type StudentManagementStat = (typeof studentManagementStats)[number];
type StudentIntervention = {
  id: number;
  note: string;
  nextAction: string;
  createdAt: string;
};
type InstructorStudent = (typeof instructorStudents)[number] & {
  id?: number;
  batchId?: number;
  latestIntervention?: StudentIntervention | null;
};
type StudentAttentionItem = (typeof studentAttentionQueue)[number] & {
  studentId?: number;
  batchId?: number;
};

type InstructorStudentsApiResponse = {
  success: boolean;
  data: {
    studentManagementStats: StudentManagementStat[];
    cohortFilters: string[];
    instructorStudents: InstructorStudent[];
    studentAttentionQueue: StudentAttentionItem[];
  };
};

function getStatusClass(status: string) {
  if (status === "Co rui ro" || status === "Có rủi ro") return "risk";
  if (status === "Can xem xet" || status === "Cần xem xét") return "review";
  if (status === "Xuat sac" || status === "Xuất sắc") return "excellent";
  return "track";
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function InstructorStudentsPage() {
  const { t } = useTranslation("instructor");
  const location = useLocation();
  const navigate = useNavigate();
  const [pageData, setPageData] =
    useState<InstructorStudentsApiResponse["data"] | null>(null);
  const [selectedCohort, setSelectedCohort] = useState("ALL");
  const [selectedStudent, setSelectedStudent] = useState<InstructorStudent | null>(null);
  const [interventionNote, setInterventionNote] = useState("");
  const [interventionNextAction, setInterventionNextAction] = useState("");
  const [interventionError, setInterventionError] = useState<string | null>(null);
  const [isSavingIntervention, setIsSavingIntervention] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadStudents() {
      try {
        const payload = await instructorApiRequest<InstructorStudentsApiResponse>(
          "/api/instructor/students",
          {
            query: { teacherId: DEFAULT_TEACHER_ID },
            signal: controller.signal,
          },
        );
        if (!payload.success) throw new Error("Students API returned unsuccessful response.");

        setPageData(payload.data);
        setSelectedStudent((current) => {
          if (!current) return current;
          return payload.data.instructorStudents.find(
            (student) => student.email === current.email && student.batch === current.batch,
          ) ?? current;
        });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        console.error(error);
      }
    }

    loadStudents();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const displayedStats = pageData?.studentManagementStats ?? studentManagementStats;
  const displayedFilters = pageData?.cohortFilters ?? cohortFilters;
  const displayedStudents: InstructorStudent[] = pageData?.instructorStudents ?? instructorStudents;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const studentId = Number(params.get("studentId"));
    const studentName = params.get("studentName");

    if ((!Number.isFinite(studentId) || studentId <= 0) && !studentName) {
      return;
    }

    const targetStudent = displayedStudents.find((student) => {
      if (Number.isFinite(studentId) && studentId > 0) {
        return Number(student.id) === studentId;
      }

      return student.name === studentName;
    });

    if (!targetStudent) {
      return;
    }

    openStudentDetail(targetStudent);
    params.delete("studentId");
    params.delete("studentName");

    const nextSearch = params.toString();
    navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : "",
      },
      { replace: true },
    );
  }, [displayedStudents, location.pathname, location.search, navigate]);

  const filteredStudents = displayedStudents.filter((student) => {
    if (selectedCohort === "ALL") {
      return true;
    }

    return student.batch === selectedCohort;
  });
  const displayedAttentionQueue = pageData?.studentAttentionQueue ?? studentAttentionQueue;

  function openStudentDetail(student: InstructorStudent) {
    setSelectedStudent(student);
    setInterventionError(null);
    setInterventionNote(student.latestIntervention?.note ?? "");
    setInterventionNextAction(student.latestIntervention?.nextAction ?? "");
  }

  function handleExportStudents() {
    if (filteredStudents.length === 0) {
      setToast({ type: "error", message: "Không có học viên để xuất danh sách." });
      return;
    }

    const header = [
      "Họ tên",
      "Email",
      "Khóa học",
      "Lớp",
      "Tiến độ",
      "Chuyên cần",
      "Trạng thái",
      "Ghi chú can thiệp gần nhất",
      "Hành động tiếp theo",
    ];
    const csv = [
      header.map(csvCell).join(","),
      ...filteredStudents.map((student) =>
        [
          student.name,
          student.email,
          student.course,
          student.batch,
          `${student.progress}%`,
          `${student.attendance}%`,
          student.status,
          student.latestIntervention?.note ?? "",
          student.latestIntervention?.nextAction ?? "",
        ].map(csvCell).join(","),
      ),
    ].join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const cohortSlug = selectedCohort === "ALL" ? "tat-ca-lop" : selectedCohort.replaceAll(/\s+/g, "-");

    link.href = url;
    link.download = `danh-sach-hoc-vien-${cohortSlug}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setToast({ type: "success", message: "Đã xuất danh sách học viên CSV." });
  }

  function handleOpenClassMessage() {
    const params = new URLSearchParams();
    params.set("compose", "message");
    if (selectedCohort && selectedCohort !== "ALL") {
      params.set("cohort", selectedCohort);
    }

    navigate(`/instructor/interaction?${params.toString()}`);
  }

  async function handleSaveIntervention() {
    if (!selectedStudent) return;
    if (!selectedStudent.id || !selectedStudent.batchId) {
      setInterventionError("Chưa có dữ liệu backend cho học viên này.");
      return;
    }
    if (!interventionNote.trim()) {
      setInterventionError("Hãy nhập ghi chú can thiệp.");
      return;
    }

    setIsSavingIntervention(true);
    setInterventionError(null);

    try {
      const payload = await instructorApiRequest<{
        success: boolean;
        data: StudentIntervention;
      }>(`/api/instructor/students/${selectedStudent.id}/interventions`, {
        method: "POST",
        query: { teacherId: DEFAULT_TEACHER_ID },
        body: {
          batchId: selectedStudent.batchId,
          note: interventionNote,
          nextAction: interventionNextAction,
        },
      });
      if (!payload.success) throw new Error("Không thể lưu ghi chú can thiệp.");

      setPageData((current) => {
        if (!current) return current;
        return {
          ...current,
          instructorStudents: current.instructorStudents.map((student) =>
            student.email === selectedStudent.email && student.batch === selectedStudent.batch
              ? { ...student, latestIntervention: payload.data }
              : student,
          ),
        };
      });
      setSelectedStudent((current) =>
        current ? { ...current, latestIntervention: payload.data } : current,
      );
      setToast({ type: "success", message: "Đã lưu ghi chú can thiệp." });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Không thể lưu ghi chú can thiệp.";
      setInterventionError(message);
      setToast({ type: "error", message });
    } finally {
      setIsSavingIntervention(false);
    }
  }

  return (
    <InstructorLayout activePage="students">
      <section className="instructor-hero instructor-students-hero">
        <div>
          <p className="instructor-eyebrow">{t("studentsPage.eyebrow")}</p>
          <h2>{t("studentsPage.title")}</h2>
          <p>
            Theo dõi tiến độ, chuyên cần, lớp học và các tín hiệu cần hỗ trợ
            trước khi vấn đề nhỏ ảnh hưởng đến kết quả học tập.
          </p>
        </div>
        <div className="instructor-hero-actions">
          <button className="instructor-secondary-button" onClick={handleExportStudents} type="button">
            <span className="material-symbols-outlined">download</span>
            Xuất danh sách
          </button>
          <button className="instructor-primary-button" onClick={handleOpenClassMessage} type="button">
            <span className="material-symbols-outlined">chat</span>
            Nhắn tin cho lớp
          </button>
        </div>
      </section>

      <section className="instructor-stat-grid" aria-label={t("studentsPage.statsLabel")}>
        {displayedStats.map((stat) => (
          <article className="instructor-stat-card" key={stat.label}>
            <div className={`instructor-stat-icon ${stat.tone}`}>
              <span className="material-symbols-outlined">{stat.icon}</span>
            </div>
            <p>{stat.label}</p>
            <div>
              <strong>{stat.value}</strong>
              <span>{pageData ? "Theo lớp đang học" : "Trong các lớp đang học"}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="instructor-students-grid">
        <article className="instructor-panel instructor-students-table-panel">
          <div className="instructor-panel-header">
            <div>
              <p className="instructor-eyebrow">{t("studentsPage.listEyebrow")}</p>
              <h3>{t("studentsPage.activeStudents")}</h3>
            </div>
            <div
              className="instructor-filter-tabs instructor-cohort-tabs"
              aria-label="Bộ lọc lớp học"
            >
              {displayedFilters.map((filter, index) => (
                <button
                  className={
                    selectedCohort === filter ||
                    (index === 0 && selectedCohort === "ALL")
                      ? "active"
                      : ""
                  }
                  key={filter}
                  onClick={() => setSelectedCohort(index === 0 ? "ALL" : filter)}
                  type="button"
                >
                  {index === 0 ? t("studentsPage.allClasses") : filter}
                </button>
              ))}
            </div>
          </div>

          <div className="instructor-student-table">
            <div className="instructor-student-table-head">
              <span>{t("studentsPage.student")}</span>
              <span>{t("studentsPage.course")}</span>
              <span>Tiến độ</span>
              <span>Chuyên cần</span>
              <span>Trạng thái</span>
              <span>Can thiệp</span>
            </div>

            {filteredStudents.length === 0 ? (
              <p className="instructor-empty-state">Không có học viên trong lớp này.</p>
            ) : filteredStudents.map((student) => (
              <div className="instructor-student-table-row" key={student.email}>
                <div className="instructor-student-person">
                  <div className="instructor-student-avatar">
                    {student.name
                      .split(" ")
                      .slice(-2)
                      .map((part) => part[0])
                      .join("")}
                  </div>
                  <div>
                    <h4>{student.name}</h4>
                    <p>{student.email}</p>
                  </div>
                </div>

                <div>
                  <strong>{student.course}</strong>
                  <p>{student.batch}</p>
                </div>

                <div className="instructor-table-progress">
                  <div className="instructor-progress-track">
                    <span style={{ width: `${student.progress}%` }} />
                  </div>
                  <b>{student.progress}%</b>
                </div>

                <div className="instructor-attendance-cell">
                  <strong>{student.attendance}%</strong>
                  <p>{student.lastActive}</p>
                </div>

                <span className={`instructor-status-pill ${getStatusClass(student.status)}`}>
                  {student.status}
                </span>

                <button className="instructor-student-detail-button" onClick={() => openStudentDetail(student)} type="button">
                  Chi tiết
                </button>
              </div>
            ))}
          </div>
        </article>

        <aside className="instructor-panel instructor-attention-panel">
          <div className="instructor-panel-header">
            <div>
              <p className="instructor-eyebrow">{t("studentsPage.interventionEyebrow")}</p>
              <h3>{t("studentsPage.needsSupport")}</h3>
            </div>
            <span className="material-symbols-outlined">support_agent</span>
          </div>

          <div className="instructor-attention-list">
            {displayedAttentionQueue.map((item) => (
              <article className="instructor-attention-card" key={item.name}>
                <div>
                  <h4>{item.name}</h4>
                  <span>{item.priority}</span>
                </div>
                <p>{item.reason}</p>
                <button
                  onClick={() => {
                    const student = displayedStudents.find(
                      (candidate) => candidate.name === item.name,
                    );
                    if (student) openStudentDetail(student);
                  }}
                  type="button"
                >
                  {item.action}
                </button>
              </article>
            ))}
          </div>
        </aside>
      </section>

      {selectedStudent && (
        <div className="instructor-course-create-backdrop" onClick={() => setSelectedStudent(null)} role="presentation">
          <aside
            aria-label="Chi tiết học viên"
            aria-modal="true"
            className="instructor-course-detail-modal no-hero instructor-student-detail-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="instructor-create-course-header">
              <div>
                <p className="instructor-eyebrow">{t("studentsPage.studentEyebrow")}</p>
                <h3>{selectedStudent.name}</h3>
                <p>{selectedStudent.course} - {selectedStudent.batch}</p>
              </div>
              <button
                aria-label="Đóng chi tiết học viên"
                className="instructor-course-detail-close"
                onClick={() => setSelectedStudent(null)}
                type="button"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="instructor-student-detail-grid">
              <article>
                <span>Tiến độ</span>
                <strong>{selectedStudent.progress}%</strong>
              </article>
              <article>
                <span>Chuyên cần</span>
                <strong>{selectedStudent.attendance}%</strong>
              </article>
              <article>
                <span>Trạng thái</span>
                <strong>{selectedStudent.status}</strong>
              </article>
            </div>

            <div className="instructor-student-intervention-history">
              <span>Ghi chú gần nhất</span>
              <p>{selectedStudent.latestIntervention?.note || "Chưa có ghi chú can thiệp."}</p>
              <small>{selectedStudent.latestIntervention?.nextAction || "Chưa có hành động tiếp theo."}</small>
            </div>

            {interventionError && <p className="instructor-course-detail-error">{interventionError}</p>}

            <label className="instructor-create-course-field instructor-create-course-field-wide">
              <span>Ghi chú can thiệp</span>
              <textarea
                rows={4}
                value={interventionNote}
                onChange={(event) => setInterventionNote(event.target.value)}
                placeholder="Ví dụ: học viên nghỉ 2 buổi, cần gọi nhắc và gửi tài liệu ôn tập"
              />
            </label>

            <label className="instructor-create-course-field instructor-create-course-field-wide">
              <span>Hành động tiếp theo</span>
              <input
                value={interventionNextAction}
                onChange={(event) => setInterventionNextAction(event.target.value)}
                placeholder="Ví dụ: nhắn riêng sau buổi học và hẹn lịch bù"
              />
            </label>

            <div className="instructor-create-course-actions">
              <button type="button" onClick={() => setSelectedStudent(null)}>
                Đóng
              </button>
              <button disabled={isSavingIntervention} onClick={handleSaveIntervention} type="button">
                {isSavingIntervention ? t("studentsPage.saving") : t("studentsPage.saveNote")}
              </button>
            </div>
          </aside>
        </div>
      )}

      {toast && (
        <div className={`instructor-toast ${toast.type}`} role="status">
          <span className="material-symbols-outlined">
            {toast.type === "success" ? "check_circle" : "error"}
          </span>
          <p>{toast.message}</p>
          <button onClick={() => setToast(null)} type="button">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}
    </InstructorLayout>
  );
}

export default InstructorStudentsPage;

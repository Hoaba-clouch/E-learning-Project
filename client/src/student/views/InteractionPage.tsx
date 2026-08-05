import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Icon from "../components/Icon";
import { getMyCourses } from "../services/studentCoursesApi";
import {
  createInteraction,
  createInteractionComment,
  getInteractions,
  reportInteraction,
  toggleInteractionLike,
  updateInteraction,
  type InteractionData,
} from "../services/studentInteractionsApi";
import type { StudentEnrolledCourse } from "../types/course.types";

type Tab = "ALL" | "QUESTION" | "MINE" | "REVIEWS";

function InteractionPage({ onReviewCourse }: { onReviewCourse: (id: number) => void }) {
  const { t } = useTranslation("student");
  const [data, setData] = useState<InteractionData | null>(null);
  const [reviewCourses, setReviewCourses] = useState<StudentEnrolledCourse[]>([]);
  const [tab, setTab] = useState<Tab>("ALL");
  const [courseId, setCourseId] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ batchId: "", lessonId: "", type: "QUESTION", title: "", content: "" });
  const [reply, setReply] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (courseId) params.set("courseId", courseId);
      if (tab === "QUESTION") params.set("type", "QUESTION");
      if (tab === "MINE") params.set("mine", "true");
      if (search.trim()) params.set("search", search.trim());
      const [interactionData, enrolled] = await Promise.all([
        getInteractions(params),
        getMyCourses(),
      ]);
      setData(interactionData);
      setReviewCourses(enrolled);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("interaction.loadError"));
    } finally {
      setLoading(false);
    }
  }, [courseId, search, tab, t]);

  useEffect(() => { void load(); }, [load]);

  const selectedBatchLessons = useMemo(
    () => data?.lessons.filter((lesson) => String(lesson.batchId) === form.batchId) ?? [],
    [data, form.batchId],
  );

  async function submitDiscussion() {
    try {
      await createInteraction({
        ...form,
        batchId: Number(form.batchId),
        lessonId: form.lessonId ? Number(form.lessonId) : null,
      });
      setShowCreate(false);
      setForm({ batchId: "", lessonId: "", type: "QUESTION", title: "", content: "" });
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("interaction.submitError"));
    }
  }

  async function submitReply(id: number) {
    if (!reply[id]?.trim()) return;
    await createInteractionComment(id, { content: reply[id] });
    setReply((current) => ({ ...current, [id]: "" }));
    await load();
  }

  return (
    <main className="sp-community-page interaction-live-page">
      <section className="sp-community-head">
        <div>
          <p className="sp-eyebrow">{t("interaction.eyebrow")}</p>
          <h1>{t("interaction.title")}</h1>
          <p>{t("interaction.description")}</p>
        </div>
        <aside>
          <strong>{data?.discussions.length ?? 0}</strong>
          <span>{t("interaction.topics")}</span>
          <p>
            {t("interaction.openTopics", {
              count: data?.discussions.filter((item) => item.status === "OPEN").length ?? 0,
            })}
          </p>
          <button onClick={() => setShowCreate(true)} type="button">{t("interaction.createTopic")}</button>
        </aside>
      </section>

      <div className="sp-community-layout">
        <aside className="sp-discussion-nav">
          {([
            ["ALL", "forum", t("interaction.allDiscussions")],
            ["QUESTION", "help", t("interaction.qa")],
            ["MINE", "history", t("interaction.myQuestions")],
            ["REVIEWS", "rate_review", t("interaction.myReviews")],
          ] as const).map(([key, icon, label]) => (
            <button className={tab === key ? "active" : ""} key={key}
              onClick={() => setTab(key)} type="button">
              <Icon name={icon} /> {label}
            </button>
          ))}
          <h3>{t("interaction.filterByCourse")}</h3>
          <button className={!courseId ? "active" : ""} onClick={() => setCourseId("")} type="button">
            {t("interaction.allCourses")}
          </button>
          {data?.courses.map((course) => (
            <button className={courseId === String(course.id) ? "active" : ""}
              key={course.id} onClick={() => setCourseId(String(course.id))} type="button">
              {course.name}
            </button>
          ))}
        </aside>

        <section className="sp-discussions">
          <div className="sp-discussion-tools">
            <label><Icon name="search" /><input value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("interaction.searchPlaceholder")} /></label>
            <button onClick={() => setShowCreate(true)} type="button">
              <Icon name="add_comment" /> {t("interaction.askQuestion")}
            </button>
          </div>
          {error ? <p className="sp-state-line error">{error}</p> : null}
          {loading ? <p className="sp-state-line">{t("interaction.loading")}</p> : null}

          {tab === "REVIEWS" ? (
            <div className="interaction-review-list">
              {reviewCourses.map((item) => {
                const eligible = item.enrollment.progressPercent >= 30 &&
                  ["ACTIVE", "COMPLETED"].includes(item.enrollment.status);
                return (
                  <article className="sp-discussion-card" key={item.enrollment.id}>
                    <h2>{item.course.name}</h2>
                    <p>
                      {t("interaction.progress")} {item.enrollment.progressPercent}% · {item.batch.name}
                    </p>
                    <footer>
                      <button disabled={!eligible} onClick={() => onReviewCourse(item.course.id)} type="button">
                        <Icon name="star" /> {eligible ? t("interaction.writeOrEditReview") : t("interaction.needProgress")}
                      </button>
                    </footer>
                  </article>
                );
              })}
            </div>
          ) : data?.discussions.map((item) => (
            <article className={`sp-discussion-card ${item.isPinned ? "pinned" : ""}`} key={item.id}>
              <header className="interaction-thread-head">
                <div>
                  <small>{item.course.name} · {item.lessonTitle || item.batchName}</small>
                  <h2>{item.title}</h2>
                  <p>{item.author.name} · {new Date(item.createdAt).toLocaleString("vi-VN")}</p>
                </div>
                <span className={`interaction-status ${item.status.toLowerCase()}`}>
                  {item.status === "RESOLVED" ? t("interaction.resolved") : t("interaction.open")}
                </span>
              </header>
              <p>{item.content}</p>
              <footer>
                <button onClick={async () => { await toggleInteractionLike(item.id); await load(); }} type="button">
                  <Icon name={item.likedByMe ? "favorite" : "favorite_border"} /> {item.likeCount}
                </button>
                <button type="button"><Icon name="chat_bubble" /> {item.commentCount}</button>
                {item.isMine ? (
                  <button onClick={async () => { await updateInteraction(item.id, { status: item.status === "OPEN" ? "RESOLVED" : "OPEN" }); await load(); }} type="button">
                    <Icon name="task_alt" /> {item.status === "OPEN" ? t("interaction.markResolved") : t("interaction.reopen")}
                  </button>
                ) : (
                  <button onClick={() => void reportInteraction({ targetType: "DISCUSSION", targetId: item.id, reason: "Nội dung không phù hợp" })} type="button">
                    <Icon name="flag" /> {t("interaction.report")}
                  </button>
                )}
              </footer>
              <div className="interaction-comments">
                {item.comments.map((comment) => (
                  <div className={comment.isInstructorAnswer ? "instructor-answer" : ""} key={comment.id}>
                    <strong>{comment.author.name}</strong>
                    {comment.isInstructorAnswer ? <span>{t("interaction.instructorConfirmed")}</span> : null}
                    <p>{comment.content}</p>
                  </div>
                ))}
                <div className="interaction-reply-box">
                  <input value={reply[item.id] ?? ""} onChange={(event) =>
                    setReply((current) => ({ ...current, [item.id]: event.target.value }))}
                    placeholder={t("interaction.replyPlaceholder")} />
                  <button onClick={() => void submitReply(item.id)} type="button">{t("interaction.send")}</button>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>

      {showCreate ? (
        <div className="interaction-modal-backdrop" onClick={() => setShowCreate(false)}>
          <section className="interaction-modal" onClick={(event) => event.stopPropagation()}>
            <h2>{t("interaction.newTopic")}</h2>
            <select value={form.batchId} onChange={(event) => setForm({ ...form, batchId: event.target.value, lessonId: "" })}>
              <option value="">{t("interaction.selectClass")}</option>
              {data?.enrolledCourses.map((course) => (
                <option key={course.batchId} value={course.batchId}>
                  {course.name} · {course.batchName}
                </option>
              ))}
            </select>
            <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
              <option value="QUESTION">{t("interaction.question")}</option><option value="DISCUSSION">{t("interaction.discussion")}</option>
            </select>
            <select value={form.lessonId} onChange={(event) => setForm({ ...form, lessonId: event.target.value })}>
              <option value="">{t("interaction.noLesson")}</option>
              {selectedBatchLessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}
            </select>
            <input placeholder={t("interaction.titlePlaceholder")} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            <textarea rows={6} placeholder={t("interaction.contentPlaceholder")} value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} />
            <div><button className="secondary" onClick={() => setShowCreate(false)} type="button">{t("interaction.cancel")}</button>
              <button onClick={() => void submitDiscussion()} type="button">{t("interaction.postTopic")}</button></div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

export default InteractionPage;

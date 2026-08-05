import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { getIntlLocale } from "../../i18n/locale";
import type { StatusModalTone } from "../../shared/components/feedback/StatusModal";
import type {
  StudentAssignment,
  StudentAssignmentSubmission,
} from "../types/course.types";
import { submitAssignment } from "../services/studentAssignmentsApi";
import Icon from "./Icon";

type AssignmentSubmissionPanelProps = {
  assignment: StudentAssignment;
  onFeedback: (tone: StatusModalTone, title: string, message: string) => void;
  onSubmitted: (submission: StudentAssignmentSubmission) => void;
};

type SubmissionFormState = {
  note: string;
  githubUrl: string;
  driveUrl: string;
  file: File | null;
};

type FormErrors = Partial<Record<keyof SubmissionFormState | "general", string>>;

function isGithubUrl(url: string) {
  try {
    return new URL(url).hostname.toLowerCase().includes("github.com");
  } catch {
    return false;
  }
}

function isGoogleDriveUrl(url: string) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname.includes("drive.google.com") || hostname.includes("docs.google.com");
  } catch {
    return false;
  }
}

function formatSubmissionDate(value: string, language: string | undefined) {
  const parsedDate = Date.parse(value);

  if (Number.isNaN(parsedDate)) {
    return value;
  }

  return new Intl.DateTimeFormat(getIntlLocale(language), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
}

function buildInitialState(assignment: StudentAssignment): SubmissionFormState {
  return {
    note: assignment.submission?.note ?? "",
    githubUrl: assignment.submission?.githubUrl ?? "",
    driveUrl: assignment.submission?.driveUrl ?? "",
    file: null,
  };
}

function validateForm(state: SubmissionFormState, t: TFunction<"student">) {
  const errors: FormErrors = {};
  const note = state.note.trim();
  const githubUrl = state.githubUrl.trim();
  const driveUrl = state.driveUrl.trim();

  if (!state.file && !githubUrl && !driveUrl) {
    errors.general = t("assignment.fileOrLinkRequired");
  }

  if (githubUrl && !isGithubUrl(githubUrl)) {
    errors.githubUrl = t("assignment.githubInvalid");
  }

  if (driveUrl && !isGoogleDriveUrl(driveUrl)) {
    errors.driveUrl = t("assignment.driveInvalid");
  }

  if (note.length > 2000) {
    errors.note = t("assignment.noteTooLong");
  }

  return errors;
}

function AssignmentSubmissionPanel({
  assignment,
  onFeedback,
  onSubmitted,
}: AssignmentSubmissionPanelProps) {
  const { t, i18n } = useTranslation("student");
  const [formState, setFormState] = useState<SubmissionFormState>(() =>
    buildInitialState(assignment),
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFormState(buildInitialState(assignment));
  }, [assignment]);

  const submissionSummary = useMemo(() => {
    const submission = assignment.submission;

    if (!submission) {
      return null;
    }

    return {
      submittedAt: formatSubmissionDate(
        submission.submittedAt,
        i18n.resolvedLanguage,
      ),
      fileLabel:
        submission.originalFileName ??
        submission.fileUrl?.split("/").pop() ??
        t("assignment.uploadedFile"),
    };
  }, [assignment.submission, i18n.resolvedLanguage, t]);

  function handleChange(
    key: keyof SubmissionFormState,
    value: string | File | null,
  ) {
    setFormState((current) => ({
      ...current,
      [key]: value,
    }));
    setErrors((current) => ({
      ...current,
      [key]: undefined,
      general: undefined,
    }));
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    handleChange("file", event.target.files?.[0] ?? null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateForm(formState, t);

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      onFeedback(
        "warning",
        t("assignment.invalidTitle"),
        nextErrors.general ??
          nextErrors.githubUrl ??
          nextErrors.driveUrl ??
          nextErrors.note ??
          t("assignment.invalidMessage"),
      );
      return;
    }

    const formData = new FormData();
    formData.set("note", formState.note.trim());
    formData.set("githubUrl", formState.githubUrl.trim());
    formData.set("driveUrl", formState.driveUrl.trim());

    if (formState.file) {
      formData.set("attachment", formState.file);
    }

    setIsSubmitting(true);

    try {
      const submission = await submitAssignment(assignment.id, formData);

      onSubmitted(submission);
      setFormState(buildInitialState({ ...assignment, submission }));
      setErrors({});
      onFeedback(
        "success",
        t("assignment.successTitle"),
        t("assignment.successMessage"),
      );
    } catch (error) {
      onFeedback(
        "error",
        t("assignment.errorTitle"),
        error instanceof Error ? error.message : t("assignment.errorMessage"),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <article className="sp-assignment-card sp-assignment-submission-card">
      <div className="sp-assignment-card-head">
        <div>
          <h3>{assignment.title}</h3>
          <p>{assignment.description ?? t("assignment.noDescription")}</p>
        </div>
        <span>{t("assignment.maxScore", { score: assignment.maxScore })}</span>
      </div>

      {submissionSummary ? (
        <div className="sp-assignment-submission-summary">
          <div>
            <strong>{t("assignment.submitted")}</strong>
            <small>{submissionSummary.submittedAt}</small>
          </div>
          {assignment.submission?.fileUrl ? (
            <a href={assignment.submission.fileUrl} rel="noreferrer" target="_blank">
              <Icon name="attach_file" />
              <span>{submissionSummary.fileLabel}</span>
            </a>
          ) : null}
          {assignment.submission?.githubUrl ? (
            <a href={assignment.submission.githubUrl} rel="noreferrer" target="_blank">
              <Icon name="code" />
              <span>GitHub</span>
            </a>
          ) : null}
          {assignment.submission?.driveUrl ? (
            <a href={assignment.submission.driveUrl} rel="noreferrer" target="_blank">
              <Icon name="cloud" />
              <span>Google Drive</span>
            </a>
          ) : null}
          {assignment.submission?.feedback ? (
            <p className="sp-assignment-feedback">
              <strong>{t("assignment.feedback")}</strong>{" "}
              {assignment.submission.feedback}
            </p>
          ) : null}
        </div>
      ) : null}

      <form className="sp-assignment-form" onSubmit={handleSubmit}>
        <div className="sp-assignment-field">
          <label htmlFor={`assignment-file-${assignment.id}`}>
            {t("assignment.submissionFile")}
          </label>
          <input
            id={`assignment-file-${assignment.id}`}
            onChange={handleFileChange}
            type="file"
          />
          <small>{t("assignment.fileHelp")}</small>
        </div>

        <div className="sp-assignment-grid">
          <div className="sp-assignment-field">
            <label htmlFor={`assignment-github-${assignment.id}`}>Link GitHub</label>
            <input
              id={`assignment-github-${assignment.id}`}
              onChange={(event) => handleChange("githubUrl", event.target.value)}
              placeholder="https://github.com/..."
              type="url"
              value={formState.githubUrl}
            />
            {errors.githubUrl ? <small className="error">{errors.githubUrl}</small> : null}
          </div>

          <div className="sp-assignment-field">
            <label htmlFor={`assignment-drive-${assignment.id}`}>Link Google Drive</label>
            <input
              id={`assignment-drive-${assignment.id}`}
              onChange={(event) => handleChange("driveUrl", event.target.value)}
              placeholder="https://drive.google.com/..."
              type="url"
              value={formState.driveUrl}
            />
            {errors.driveUrl ? <small className="error">{errors.driveUrl}</small> : null}
          </div>
        </div>

        <div className="sp-assignment-field">
          <label htmlFor={`assignment-note-${assignment.id}`}>
            {t("assignment.note")}
          </label>
          <textarea
            id={`assignment-note-${assignment.id}`}
            onChange={(event) => handleChange("note", event.target.value)}
            placeholder={t("assignment.notePlaceholder")}
            rows={5}
            value={formState.note}
          />
          {errors.note ? <small className="error">{errors.note}</small> : null}
        </div>

        {errors.general ? <p className="sp-assignment-error">{errors.general}</p> : null}

        <div className="sp-assignment-form-actions">
          <button disabled={isSubmitting} type="submit">
            <Icon name="upload_file" />
            {isSubmitting
              ? t("assignment.submitting")
              : assignment.submission
                ? t("assignment.update")
                : t("assignment.submit")}
          </button>
        </div>
      </form>
    </article>
  );
}

export default AssignmentSubmissionPanel;

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ApiFieldErrors, AuthUser } from "../../auth/auth.types";
import StatusModal from "../../shared/components/feedback/StatusModal";
import Icon from "../components/Icon";
import {
  StudentAccountApiError,
  updateStudentAccountProfile,
} from "../services/studentAccountApi";
import type {
  StudentAccountProfileData,
  StudentProfileUpdatePayload,
} from "../types/account.types";
import {
  formatAccountDate,
  formatCurrency,
  toDateInputValue,
} from "../utils/accountFormatters";
import { validateStudentProfileForm } from "../utils/accountProfileValidation";
import { resolveMediaUrl } from "../utils/mediaUrl";
import "./AccountPages.css";

type AccountProfilePageProps = {
  profileData: StudentAccountProfileData | null;
  isLoading: boolean;
  error: string;
  onProfileSaved: (
    profile: StudentAccountProfileData["profile"],
    sessionUser: AuthUser | null,
  ) => void;
};

function buildFormValues(
  profileData: StudentAccountProfileData,
): StudentProfileUpdatePayload {
  return {
    fullName: profileData.profile.fullName,
    phone: profileData.profile.phone ?? "",
    dateOfBirth: toDateInputValue(profileData.profile.dateOfBirth),
    gender:
      (profileData.profile.gender as StudentProfileUpdatePayload["gender"]) ?? "",
    address: profileData.profile.address ?? "",
    avatarFile: null,
  };
}

function AccountProfilePage({
  profileData,
  isLoading,
  error,
  onProfileSaved,
}: AccountProfilePageProps) {
  const { t, i18n } = useTranslation("student");
  const { t: tValidation } = useTranslation("validation");
  const language = i18n.resolvedLanguage;
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ApiFieldErrors>({});
  const [formValues, setFormValues] =
    useState<StudentProfileUpdatePayload | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    message: string;
    title: string;
    tone: "success" | "error" | "warning";
  }>({
    isOpen: false,
    message: "",
    title: "",
    tone: "success",
  });

  useEffect(() => {
    if (!profileData) {
      return;
    }
    setFormValues(buildFormValues(profileData));
    setAvatarPreview(null);
    setFieldErrors({});
  }, [profileData]);

  useEffect(() => {
    if (!formValues?.avatarFile) {
      return undefined;
    }

    const objectUrl = URL.createObjectURL(formValues.avatarFile);
    setAvatarPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [formValues?.avatarFile]);

  const displayAvatar = useMemo(() => {
    if (avatarPreview) {
      return avatarPreview;
    }
    if (profileData?.profile.avatarUrl) {
      return (
        resolveMediaUrl(profileData.profile.avatarUrl) ??
        `https://api.dicebear.com/9.x/personas/svg?seed=${profileData.profile.email}`
      );
    }
    return profileData
      ? `https://api.dicebear.com/9.x/personas/svg?seed=${profileData.profile.email}`
      : "";
  }, [avatarPreview, profileData]);

  if (isLoading) {
    return (
      <main className="sp-account-page">
        <p className="sp-state-line">{t("profile.loading")}</p>
      </main>
    );
  }

  if (error || !profileData || !formValues) {
    return (
      <main className="sp-account-page">
        <div className="sp-empty-cart">
          <h2>{t("profile.loadErrorTitle")}</h2>
          <p>{error || t("profile.noData")}</p>
        </div>
      </main>
    );
  }

  const currentProfileData = profileData;
  const currentFormValues = formValues;
  const { profile, summary, recentActivities } = currentProfileData;
  const notUpdated = t("profile.notUpdated");

  function updateField<K extends keyof StudentProfileUpdatePayload>(
    key: K,
    value: StudentProfileUpdatePayload[K],
  ) {
    setFormValues((currentValues) =>
      currentValues ? { ...currentValues, [key]: value } : currentValues,
    );
    setFieldErrors((currentErrors) => {
      if (!currentErrors[key]) {
        return currentErrors;
      }
      const nextErrors = { ...currentErrors };
      delete nextErrors[key];
      return nextErrors;
    });
  }

  function resetEditingState() {
    setIsEditing(false);
    setFieldErrors({});
    setFormValues(buildFormValues(currentProfileData));
    setAvatarPreview(null);
  }

  async function handleSubmit() {
    const errors = validateStudentProfileForm(currentFormValues, tValidation);

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setModalState({
        isOpen: true,
        title: t("profile.validationModal.title"),
        message: t("profile.validationModal.message"),
        tone: "warning",
      });
      return;
    }

    setIsSaving(true);
    setFieldErrors({});

    try {
      const result = await updateStudentAccountProfile(currentFormValues);
      onProfileSaved(result.profile, result.sessionUser);
      setModalState({
        isOpen: true,
        title: t("profile.updateSuccess.title"),
        message: t("profile.updateSuccess.message"),
        tone: "success",
      });
      setIsEditing(false);
    } catch (apiError) {
      if (apiError instanceof StudentAccountApiError) {
        setFieldErrors(apiError.errors ?? {});
        setModalState({
          isOpen: true,
          title: t("profile.updateError.title"),
          message: apiError.message,
          tone: "error",
        });
      } else {
        setModalState({
          isOpen: true,
          title: t("profile.updateError.title"),
          message: t("profile.updateError.message"),
          tone: "error",
        });
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <main className="sp-account-page">
        <section className="sp-account-hero">
          <div className="sp-account-hero-card">
            <div className="sp-account-hero-main">
              <div className="sp-account-avatar-shell">
                <div className="sp-account-avatar-block">
                  <img alt={profile.fullName} src={displayAvatar} />
                </div>
                {isEditing ? (
                  <label className="sp-account-avatar-upload">
                    <input
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(event) =>
                        updateField("avatarFile", event.target.files?.[0] ?? null)
                      }
                      type="file"
                    />
                    <Icon name="photo_camera" />
                    <span>{t("profile.changeAvatar")}</span>
                  </label>
                ) : null}
              </div>

              <div className="sp-account-hero-copy">
                <p className="sp-eyebrow">{t("profile.eyebrow")}</p>
                <h1>{profile.fullName}</h1>
                <p>
                  {profile.email} • {profile.phone ?? t("profile.phoneMissing")}
                </p>
              </div>
            </div>

            <div className="sp-account-hero-stats">
              <article>
                <span>{t("profile.stats.completedCourses")}</span>
                <strong>{summary.completedCourses}</strong>
              </article>
              <article>
                <span>{t("profile.stats.certificates")}</span>
                <strong>{summary.certificatesCount}</strong>
              </article>
              <article>
                <span>{t("profile.stats.totalSpent")}</span>
                <strong>{formatCurrency(summary.totalSpent, language)}</strong>
              </article>
            </div>
          </div>
        </section>

        <section className="sp-account-grid">
          <div className="sp-account-panel sp-account-main-panel">
            <div className="sp-account-panel-head sp-account-panel-head-row">
              <div>
                <h2>{t("profile.personalInfo.title")}</h2>
                <p>{t("profile.personalInfo.description")}</p>
              </div>

              {isEditing ? (
                <div className="sp-account-panel-actions">
                  <button
                    className="secondary"
                    onClick={resetEditingState}
                    type="button"
                    disabled={isSaving}
                  >
                    {t("profile.actions.cancel")}
                  </button>
                  <button
                    onClick={() => void handleSubmit()}
                    type="button"
                    disabled={isSaving}
                  >
                    {isSaving
                      ? t("profile.actions.saving")
                      : t("profile.actions.save")}
                  </button>
                </div>
              ) : (
                <div className="sp-account-panel-actions">
                  <button onClick={() => setIsEditing(true)} type="button">
                    <Icon name="edit" />
                    <span>{t("profile.actions.edit")}</span>
                  </button>
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="sp-account-form-grid">
                <label className="sp-account-field">
                  <span>{t("profile.fields.fullName")}</span>
                  <input
                    value={formValues.fullName}
                    onChange={(event) => updateField("fullName", event.target.value)}
                    placeholder={t("profile.fields.fullNamePlaceholder")}
                  />
                  {fieldErrors.fullName ? <small>{fieldErrors.fullName}</small> : null}
                </label>

                <label className="sp-account-field readonly">
                  <span>{t("profile.fields.email")}</span>
                  <input value={profile.email} readOnly />
                </label>

                <label className="sp-account-field">
                  <span>{t("profile.fields.phone")}</span>
                  <input
                    value={formValues.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                    placeholder={t("profile.fields.phonePlaceholder")}
                  />
                  {fieldErrors.phone ? <small>{fieldErrors.phone}</small> : null}
                </label>

                <label className="sp-account-field">
                  <span>{t("profile.fields.dateOfBirth")}</span>
                  <input
                    type="date"
                    value={formValues.dateOfBirth}
                    onChange={(event) =>
                      updateField("dateOfBirth", event.target.value)
                    }
                  />
                  {fieldErrors.dateOfBirth ? (
                    <small>{fieldErrors.dateOfBirth}</small>
                  ) : null}
                </label>

                <label className="sp-account-field">
                  <span>{t("profile.fields.gender")}</span>
                  <select
                    value={formValues.gender}
                    onChange={(event) =>
                      updateField(
                        "gender",
                        event.target.value as StudentProfileUpdatePayload["gender"],
                      )
                    }
                  >
                    <option value="">{t("profile.fields.selectGender")}</option>
                    <option value="MALE">{t("profile.gender.MALE")}</option>
                    <option value="FEMALE">{t("profile.gender.FEMALE")}</option>
                    <option value="OTHER">{t("profile.gender.OTHER")}</option>
                  </select>
                  {fieldErrors.gender ? <small>{fieldErrors.gender}</small> : null}
                </label>

                <label className="sp-account-field span-2">
                  <span>{t("profile.fields.address")}</span>
                  <textarea
                    value={formValues.address}
                    onChange={(event) => updateField("address", event.target.value)}
                    placeholder={t("profile.fields.addressPlaceholder")}
                    rows={4}
                  />
                  {fieldErrors.address ? <small>{fieldErrors.address}</small> : null}
                </label>

                {fieldErrors.avatarFile ? (
                  <p className="sp-account-inline-error">{fieldErrors.avatarFile}</p>
                ) : null}
              </div>
            ) : (
              <div className="sp-account-info-grid">
                <div>
                  <label>{t("profile.fields.fullName")}</label>
                  <strong>{profile.fullName}</strong>
                </div>
                <div>
                  <label>{t("profile.fields.email")}</label>
                  <strong>{profile.email}</strong>
                </div>
                <div>
                  <label>{t("profile.fields.phone")}</label>
                  <strong>{profile.phone ?? notUpdated}</strong>
                </div>
                <div>
                  <label>{t("profile.fields.dateOfBirth")}</label>
                  <strong>
                    {formatAccountDate(profile.dateOfBirth, language, notUpdated)}
                  </strong>
                </div>
                <div>
                  <label>{t("profile.fields.gender")}</label>
                  <strong>
                    {profile.gender
                      ? t(`profile.gender.${profile.gender}`, {
                          defaultValue: profile.genderLabel,
                        })
                      : t("profile.gender.unknown")}
                  </strong>
                </div>
                <div>
                  <label>{t("profile.fields.address")}</label>
                  <strong>{profile.address ?? notUpdated}</strong>
                </div>
              </div>
            )}
          </div>

          <aside className="sp-account-side-stack">
            <section className="sp-account-panel accent">
              <div className="sp-account-panel-head">
                <h2>{t("profile.learningOverview")}</h2>
              </div>
              <ul className="sp-account-summary-list">
                <li>
                  <span>{t("profile.summary.activeCourses")}</span>
                  <strong>{summary.activeCourses}</strong>
                </li>
                <li>
                  <span>{t("profile.summary.totalCourses")}</span>
                  <strong>{summary.totalCourses}</strong>
                </li>
                <li>
                  <span>{t("profile.summary.averageProgress")}</span>
                  <strong>{summary.averageProgress}%</strong>
                </li>
                <li>
                  <span>{t("profile.summary.successfulPayments")}</span>
                  <strong>{summary.successfulPayments}</strong>
                </li>
              </ul>
            </section>

            <section className="sp-account-panel">
              <div className="sp-account-panel-head">
                <h2>{t("profile.recentActivity")}</h2>
              </div>
              {recentActivities.length ? (
                <div className="sp-account-activity-list">
                  {recentActivities.map((activity) => (
                    <article
                      className="sp-account-activity-item"
                      key={`${activity.type}-${activity.happenedAt}-${activity.title}`}
                    >
                      <span className="sp-account-activity-icon">
                        <Icon name={activity.icon} />
                      </span>
                      <div>
                        <strong>{activity.title}</strong>
                        <p>{activity.subtitle}</p>
                        <small>
                          {formatAccountDate(activity.happenedAt, language)}
                        </small>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="sp-account-empty-inline">
                  {t("profile.noRecentActivity")}
                </div>
              )}
            </section>
          </aside>
        </section>
      </main>

      <StatusModal
        isOpen={modalState.isOpen}
        message={modalState.message}
        onClose={() =>
          setModalState((currentState) => ({
            ...currentState,
            isOpen: false,
          }))
        }
        title={modalState.title}
        tone={modalState.tone}
      />
    </>
  );
}

export default AccountProfilePage;

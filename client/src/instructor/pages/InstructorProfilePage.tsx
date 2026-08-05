import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { instructorApiRequest } from "../api/instructorApi";
import { getInstructorAuthTeacherId } from "../auth/instructorAuth";
import InstructorLayout from "../components/InstructorLayout";

const DEFAULT_TEACHER_ID = getInstructorAuthTeacherId();

type InstructorProfileData = {
  id: number;
  name: string;
  email: string;
  phone: string;
  avatar: string | null;
  status: string;
  role: string;
  bio: string;
  specialization: string;
  experienceYears: number;
  qualification: string;
  workplace: string;
};

type InstructorProfileApiResponse = {
  success: boolean;
  data: InstructorProfileData;
};

type ProfileFormData = {
  name: string;
  phone: string;
  avatar: string;
  specialization: string;
  workplace: string;
  qualification: string;
  experienceYears: string;
  bio: string;
};

type ProfileToast = {
  message: string;
  type: "success" | "error";
} | null;

const EMPTY_FORM: ProfileFormData = {
  name: "",
  phone: "",
  avatar: "",
  specialization: "",
  workplace: "",
  qualification: "",
  experienceYears: "0",
  bio: "",
};

function toProfileForm(profile: InstructorProfileData): ProfileFormData {
  return {
    name: profile.name ?? "",
    phone: profile.phone ?? "",
    avatar: profile.avatar ?? "",
    specialization: profile.specialization ?? "",
    workplace: profile.workplace ?? "",
    qualification: profile.qualification ?? "",
    experienceYears: String(profile.experienceYears ?? 0),
    bio: profile.bio ?? "",
  };
}

function InstructorProfilePage() {
  const { t } = useTranslation("instructor");
  const [profile, setProfile] = useState<InstructorProfileData | null>(null);
  const [formData, setFormData] = useState<ProfileFormData>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ProfileToast>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProfile() {
      setIsLoading(true);
      setError(null);

      try {
        const payload = await instructorApiRequest<InstructorProfileApiResponse>(
          "/api/instructor/profile",
          {
            query: { teacherId: DEFAULT_TEACHER_ID },
            signal: controller.signal,
          },
        );
        if (!payload.success) throw new Error("Không thể tải hồ sơ giảng viên.");

        setProfile(payload.data);
        setFormData(toProfileForm(payload.data));
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name === "AbortError") return;
        const message = loadError instanceof Error ? loadError.message : "Không thể tải hồ sơ giảng viên.";
        setError(message);
        setToast({ message, type: "error" });
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function updateField(field: keyof ProfileFormData, value: string) {
    setFormData((current) => ({ ...current, [field]: value }));
  }

  async function handleSaveProfile() {
    if (!formData.name.trim()) {
      setError("Họ tên không được để trống.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const payload = await instructorApiRequest<InstructorProfileApiResponse>(
        "/api/instructor/profile",
        {
          method: "PUT",
          query: { teacherId: DEFAULT_TEACHER_ID },
          body: {
            name: formData.name.trim(),
            phone: formData.phone.trim(),
            avatar: formData.avatar.trim(),
            specialization: formData.specialization.trim(),
            workplace: formData.workplace.trim(),
            qualification: formData.qualification.trim(),
            experienceYears: Number(formData.experienceYears) || 0,
            bio: formData.bio.trim(),
          },
        },
      );
      if (!payload.success) throw new Error("Không thể lưu hồ sơ giảng viên.");

      setProfile(payload.data);
      setFormData(toProfileForm(payload.data));
      setToast({ message: "Đã cập nhật hồ sơ giảng viên.", type: "success" });
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Không thể lưu hồ sơ giảng viên.";
      setError(message);
      setToast({ message, type: "error" });
    } finally {
      setIsSaving(false);
    }
  }

  function handleResetForm() {
    if (!profile) return;
    setFormData(toProfileForm(profile));
    setError(null);
  }

  const previewAvatar = formData.avatar || profile?.avatar || "";

  return (
    <InstructorLayout activePage="profile" profile={profile ? {
      name: profile.name,
      role: profile.role,
      avatar: profile.avatar,
    } : undefined}>
      <section className="instructor-hero instructor-profile-hero">
        <div>
          <p className="instructor-eyebrow">{t("profilePage.eyebrow")}</p>
          <h2>{t("profilePage.title")}</h2>
          <p>{t("profilePage.description")}</p>
        </div>
        <button className="instructor-primary-button" disabled={isSaving || isLoading} onClick={handleSaveProfile} type="button">
          <span className="material-symbols-outlined">save</span>
          {isSaving ? t("profilePage.saving") : t("profilePage.saveProfile")}
        </button>
      </section>

      <section className="instructor-profile-grid">
        <aside className="instructor-panel instructor-profile-card">
          {isLoading ? (
            <p className="instructor-empty-state">{t("profilePage.loading")}</p>
          ) : (
            <>
              <img
                alt=""
                src={previewAvatar || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80"}
                onError={(event) => {
                  event.currentTarget.src =
                    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80";
                }}
              />
              <h3>{formData.name || t("profilePage.teacherFallback")}</h3>
              <p>{formData.specialization || "Chưa cập nhật chuyên môn"}</p>
              <div>
                <span>{profile?.email ?? "Chưa có email"}</span>
                <span>{formData.workplace || "Chưa cập nhật nơi làm việc"}</span>
              </div>
            </>
          )}
        </aside>

        <article className="instructor-panel instructor-profile-form-panel">
          <div className="instructor-panel-header">
            <div>
              <p className="instructor-eyebrow">{t("profilePage.detailEyebrow")}</p>
              <h3>{t("profilePage.displayInfo")}</h3>
            </div>
            <span className="material-symbols-outlined">badge</span>
          </div>

          {error && <p className="instructor-course-detail-error">{error}</p>}

          <div className="instructor-profile-form">
            <label>
              <span>Họ tên *</span>
              <input value={formData.name} onChange={(event) => updateField("name", event.target.value)} />
            </label>
            <label>
              <span>Email</span>
              <input disabled value={profile?.email ?? ""} />
            </label>
            <label>
              <span>Số điện thoại</span>
              <input value={formData.phone} onChange={(event) => updateField("phone", event.target.value)} />
            </label>
            <label>
              <span>Avatar URL</span>
              <input
                value={formData.avatar}
                onChange={(event) => updateField("avatar", event.target.value)}
                placeholder="https://..."
              />
            </label>
            <label>
              <span>Chuyên môn</span>
              <input
                value={formData.specialization}
                onChange={(event) => updateField("specialization", event.target.value)}
                placeholder="VD: Frontend, Digital Marketing"
              />
            </label>
            <label>
              <span>Nơi làm việc</span>
              <input
                value={formData.workplace}
                onChange={(event) => updateField("workplace", event.target.value)}
                placeholder="VD: E-learning Center"
              />
            </label>
            <label>
              <span>Kinh nghiệm (năm)</span>
              <input
                min="0"
                type="number"
                value={formData.experienceYears}
                onChange={(event) => updateField("experienceYears", event.target.value)}
              />
            </label>
            <label>
              <span>Bằng cấp</span>
              <input
                value={formData.qualification}
                onChange={(event) => updateField("qualification", event.target.value)}
                placeholder="VD: Thạc sĩ Công nghệ thông tin"
              />
            </label>
            <label className="instructor-profile-form-wide">
              <span>Giới thiệu</span>
              <textarea
                rows={5}
                value={formData.bio}
                onChange={(event) => updateField("bio", event.target.value)}
                placeholder="Giới thiệu ngắn về kinh nghiệm giảng dạy và chuyên môn."
              />
            </label>
          </div>

          <div className="instructor-profile-actions">
            <button disabled={isSaving || isLoading} onClick={handleResetForm} type="button">
              Hoàn tác
            </button>
            <button disabled={isSaving || isLoading} onClick={handleSaveProfile} type="button">
              {isSaving ? t("profilePage.saving") : t("profilePage.saveChanges")}
            </button>
          </div>
        </article>
      </section>

      {toast && (
        <div className={`instructor-toast ${toast.type}`} role="status">
          {toast.message}
        </div>
      )}
    </InstructorLayout>
  );
}

export default InstructorProfilePage;

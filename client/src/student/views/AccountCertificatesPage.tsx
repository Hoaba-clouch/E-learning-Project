import { useTranslation } from "react-i18next";
import type { StudentAccountCertificatesData } from "../types/account.types";
import { formatAccountDate } from "../utils/accountFormatters";
import Icon from "../components/Icon";
import "./AccountPages.css";

type AccountCertificatesPageProps = {
  certificatesData: StudentAccountCertificatesData | null;
  isLoading: boolean;
  error: string;
};

function AccountCertificatesPage({
  certificatesData,
  isLoading,
  error,
}: AccountCertificatesPageProps) {
  const { t, i18n } = useTranslation("student");
  const language = i18n.resolvedLanguage;

  if (isLoading) {
    return (
      <main className="sp-account-page">
        <p className="sp-state-line">{t("certificates.loading")}</p>
      </main>
    );
  }

  if (error || !certificatesData) {
    return (
      <main className="sp-account-page">
        <div className="sp-empty-cart">
          <h2>{t("certificates.loadErrorTitle")}</h2>
          <p>{error || t("certificates.noData")}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="sp-account-page">
      <section className="sp-account-page-head">
        <div>
          <p className="sp-eyebrow">{t("certificates.eyebrow")}</p>
          <h1>{t("certificates.title")}</h1>
          <p>{t("certificates.description")}</p>
        </div>

        <div className="sp-account-metric-card">
          <span>{t("certificates.total")}</span>
          <strong>{certificatesData.summary.certificatesCount}</strong>
        </div>
      </section>

      {certificatesData.certificates.length ? (
        <section className="sp-account-certificate-grid">
          {certificatesData.certificates.map((certificate) => (
            <article className="sp-account-certificate-card" key={certificate.id}>
              <div className="sp-account-certificate-top">
                <span className="sp-account-badge">{t("certificates.issued")}</span>
                <button type="button">
                  <Icon name="workspace_premium" />
                </button>
              </div>

              <div className="sp-account-certificate-copy">
                <h3>{certificate.course.name}</h3>
                <p>
                  {certificate.batch.name}
                  {certificate.teacher.fullName
                    ? ` • ${t("certificates.teacher")}: ${certificate.teacher.fullName}`
                    : ""}
                </p>
              </div>

              <div className="sp-account-certificate-meta">
                <span>{t("certificates.code")}</span>
                <strong>{certificate.code}</strong>
                <small>
                  {t("certificates.issuedDate", {
                    date: formatAccountDate(certificate.issuedAt, language),
                  })}
                </small>
              </div>

              <div className="sp-account-certificate-actions">
                <a href={certificate.url ?? "#"} target="_blank" rel="noreferrer">
                  {t("certificates.view")}
                </a>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="sp-account-panel">
          <div className="sp-account-empty-state">
            <span>
              <Icon name="workspace_premium" />
            </span>
            <h2>{t("certificates.emptyTitle")}</h2>
            <p>{t("certificates.emptyDescription")}</p>
          </div>
        </section>
      )}
    </main>
  );
}

export default AccountCertificatesPage;

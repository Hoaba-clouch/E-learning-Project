import { useTranslation } from "react-i18next";
import type { StudentAccountPaymentHistoryData } from "../types/account.types";
import {
  formatAccountDateTime,
  formatCurrency,
  getPaymentTone,
} from "../utils/accountFormatters";
import "./AccountPages.css";

type AccountPaymentHistoryPageProps = {
  paymentHistoryData: StudentAccountPaymentHistoryData | null;
  isLoading: boolean;
  error: string;
};

function AccountPaymentHistoryPage({
  paymentHistoryData,
  isLoading,
  error,
}: AccountPaymentHistoryPageProps) {
  const { t, i18n } = useTranslation("student");
  const language = i18n.resolvedLanguage;

  if (isLoading) {
    return (
      <main className="sp-account-page">
        <p className="sp-state-line">{t("payments.loading")}</p>
      </main>
    );
  }

  if (error || !paymentHistoryData) {
    return (
      <main className="sp-account-page">
        <div className="sp-empty-cart">
          <h2>{t("payments.loadErrorTitle")}</h2>
          <p>{error || t("payments.noData")}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="sp-account-page">
      <section className="sp-account-page-head">
        <div>
          <p className="sp-eyebrow">{t("payments.eyebrow")}</p>
          <h1>{t("payments.title")}</h1>
          <p>{t("payments.description")}</p>
        </div>

        <div className="sp-account-metric-card">
          <span>{t("payments.totalSpent")}</span>
          <strong>
            {formatCurrency(paymentHistoryData.summary.totalSpent, language)}
          </strong>
        </div>
      </section>

      <section className="sp-account-panel">
        {paymentHistoryData.payments.length ? (
          <div className="sp-account-payment-table-wrap">
            <table className="sp-account-payment-table">
              <thead>
                <tr>
                  <th>{t("payments.transaction")}</th>
                  <th>{t("payments.course")}</th>
                  <th>{t("payments.amount")}</th>
                  <th>{t("payments.date")}</th>
                  <th>{t("payments.status")}</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistoryData.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.transactionCode ?? `PAY-${payment.id}`}</td>
                    <td>
                      <strong>{payment.course.name ?? t("payments.unassigned")}</strong>
                      <small>{payment.methodLabel}</small>
                    </td>
                    <td>{formatCurrency(payment.amount, language)}</td>
                    <td>
                      {formatAccountDateTime(
                        payment.paidAt ?? payment.createdAt,
                        language,
                      )}
                    </td>
                    <td>
                      <span className={`sp-account-status-pill ${getPaymentTone(payment.status)}`}>
                        {payment.statusLabel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="sp-account-empty-state compact">
            <h2>{t("payments.emptyTitle")}</h2>
            <p>{t("payments.emptyDescription")}</p>
          </div>
        )}
      </section>
    </main>
  );
}

export default AccountPaymentHistoryPage;

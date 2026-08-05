import { useTranslation } from "react-i18next";
import Icon from "./Icon";

function StudentExamSidebar() {
  const { t } = useTranslation("student");
  const regulations = [1, 2, 3, 4].map((number) => t(`exam.sidebar.rule${number}`));
  return (
    <aside className="sp-exam-sidebar">
      <section className="sp-exam-sidebar-card">
        <h3>{t("exam.sidebar.rules")}</h3>
        <ul>
          {regulations.map((item, index) => (
            <li key={item}>
              <span>{index + 1}</span>
              <p>{item}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="sp-exam-support-card">
        <h3>{t("exam.sidebar.technicalSupport")}</h3>
        <p>{t("exam.sidebar.supportDescription")}</p>

        <a href="tel:19001234">
          <Icon name="call" />
          <div>
            <small>{t("exam.sidebar.hotline")}</small>
            <strong>1900 1234</strong>
          </div>
        </a>

        <a href="mailto:support@learnx.vn">
          <Icon name="mail" />
          <div>
            <small>{t("exam.sidebar.email")}</small>
            <strong>support@learnx.vn</strong>
          </div>
        </a>
      </section>
    </aside>
  );
}

export default StudentExamSidebar;

import { useTranslation } from "react-i18next";

function Footer() {
  const { t } = useTranslation("student");

  return (
    <footer className="sp-footer">
      <div>
        <strong>Academic Atelier</strong>
        <p>{t("footer.description")}</p>
      </div>
      <nav>
        <a href="#">{t("footer.privacy")}</a>
        <a href="#">{t("footer.terms")}</a>
        <a href="#">{t("footer.cookies")}</a>
        <a href="#">{t("footer.sitemap")}</a>
      </nav>
    </footer>
  );
}

export default Footer;

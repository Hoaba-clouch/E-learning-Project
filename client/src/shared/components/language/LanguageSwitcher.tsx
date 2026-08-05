import { useTranslation } from "react-i18next";
import { normalizeLanguage } from "../../../i18n/locale";
import "./LanguageSwitcher.css";

type LanguageSwitcherProps = {
  className?: string;
  compact?: boolean;
};

function LanguageSwitcher({ className = "", compact = false }: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation("common");
  const currentLanguage = normalizeLanguage(i18n.resolvedLanguage);

  return (
    <label className={`language-switcher ${compact ? "compact" : ""} ${className}`.trim()}>
      <span className="material-symbols-outlined">language</span>
      <select
        aria-label={t("language.label")}
        value={currentLanguage}
        onChange={(event) => void i18n.changeLanguage(event.target.value)}
      >
        <option value="vi">{t("language.vi")}</option>
        <option value="en">{t("language.en")}</option>
      </select>
    </label>
  );
}

export default LanguageSwitcher;

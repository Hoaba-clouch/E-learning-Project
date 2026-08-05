import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import commonEn from "./locales/en/common.json";
import adminEn from "./locales/en/admin.json";
import instructorEn from "./locales/en/instructor.json";
import studentEn from "./locales/en/student.json";
import validationEn from "./locales/en/validation.json";
import adminVi from "./locales/vi/admin.json";
import commonVi from "./locales/vi/common.json";
import instructorVi from "./locales/vi/instructor.json";
import studentVi from "./locales/vi/student.json";
import validationVi from "./locales/vi/validation.json";
import {
  defaultLanguage,
  languageStorageKey,
  normalizeLanguage,
} from "./locale";

function getInitialLanguage() {
  const savedLanguage = localStorage.getItem(languageStorageKey);

  if (savedLanguage) {
    return normalizeLanguage(savedLanguage);
  }

  return normalizeLanguage(navigator.language || defaultLanguage);
}

const initialLanguage = getInitialLanguage();

void i18n.use(initReactI18next).init({
  resources: {
    vi: {
      admin: adminVi,
      common: commonVi,
      instructor: instructorVi,
      student: studentVi,
      validation: validationVi,
    },
    en: {
      admin: adminEn,
      common: commonEn,
      instructor: instructorEn,
      student: studentEn,
      validation: validationEn,
    },
  },
  lng: initialLanguage,
  fallbackLng: defaultLanguage,
  defaultNS: "common",
  supportedLngs: ["vi", "en"],
  interpolation: {
    escapeValue: false,
  },
});

document.documentElement.lang = initialLanguage;

i18n.on("languageChanged", (language) => {
  const normalizedLanguage = normalizeLanguage(language);
  localStorage.setItem(languageStorageKey, normalizedLanguage);
  document.documentElement.lang = normalizedLanguage;
});

export default i18n;

export const supportedLanguages = ["vi", "en"] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number];

export const defaultLanguage: SupportedLanguage = "vi";
export const languageStorageKey = "learnx.language";

export function normalizeLanguage(language: string | undefined): SupportedLanguage {
  return language?.toLowerCase().startsWith("en") ? "en" : "vi";
}

export function getIntlLocale(language: string | undefined) {
  return normalizeLanguage(language) === "en" ? "en-US" : "vi-VN";
}

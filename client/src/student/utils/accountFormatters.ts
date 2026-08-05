import { getIntlLocale } from "../../i18n/locale";

export function formatAccountDate(
  value: string | null,
  language?: string,
  emptyValue = "Chưa cập nhật",
) {
  if (!value) {
    return emptyValue;
  }

  return new Intl.DateTimeFormat(getIntlLocale(language), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function formatAccountDateTime(
  value: string | null,
  language?: string,
  emptyValue = "Chưa cập nhật",
) {
  if (!value) {
    return emptyValue;
  }

  return new Intl.DateTimeFormat(getIntlLocale(language), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatCurrency(value: number, language?: string) {
  return new Intl.NumberFormat(getIntlLocale(language), {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export function toDateInputValue(value: string | null) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(0, 10);
}

export function getPaymentTone(status: string) {
  if (status === "SUCCESS") {
    return "success";
  }
  if (status === "REFUNDED") {
    return "muted";
  }
  if (status === "FAILED") {
    return "error";
  }
  return "warning";
}

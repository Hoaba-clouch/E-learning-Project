import type { TFunction } from "i18next";
import type { ApiFieldErrors } from "../../auth/auth.types";
import type { StudentProfileUpdatePayload } from "../types/account.types";

const phonePattern = /^(0|\+84)[0-9]{9,10}$/;

export function validateStudentProfileForm(
  values: StudentProfileUpdatePayload,
  t: TFunction<"validation">,
) {
  const errors: ApiFieldErrors = {};

  if (values.fullName.trim().length < 3) {
    errors.fullName = t("profile.fullNameMin");
  }
  if (!phonePattern.test(values.phone.trim())) {
    errors.phone = t("profile.phoneInvalid");
  }
  if (values.dateOfBirth && Number.isNaN(Date.parse(values.dateOfBirth))) {
    errors.dateOfBirth = t("profile.dateOfBirthInvalid");
  }
  if (values.gender && !["MALE", "FEMALE", "OTHER"].includes(values.gender)) {
    errors.gender = t("profile.genderInvalid");
  }
  if (values.address.trim().length > 255) {
    errors.address = t("profile.addressMax");
  }
  if (values.avatarFile && values.avatarFile.size > 5 * 1024 * 1024) {
    errors.avatarFile = t("profile.avatarMax");
  }

  return errors;
}

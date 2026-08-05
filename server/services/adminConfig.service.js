const systemConfigState = {
  general: {
    platformName: "Editorial Scholar Pro",
    defaultLanguage: "Tiếng Anh (Hoa Kỳ)",
    logo: {
      label: "Logo nền tảng",
      acceptedFormats: "SVG hoặc PNG, tối đa 2MB",
    },
    favicon: {
      label: "Favicon hệ thống",
      acceptedFormats: "ICO hoặc PNG, 32x32px",
    },
  },
  email: {
    smtpHost: "smtp.provider.com",
    port: "587",
    senderEmail: "notifications@editorialscholar.edu",
  },
  security: {
    twoFactorAuthentication: true,
    sessionTimeoutEnabled: true,
    passwordRules: [
      { key: "uppercase", label: "Chữ in hoa", enabled: true },
      { key: "symbols", label: "Ký hiệu đặc biệt", enabled: true },
      { key: "numbers", label: "Số", enabled: true },
      { key: "min_length", label: "Tối thiểu 12 ký tự", enabled: true },
    ],
  },
};

export async function getAdminSystemConfigData() {
  return {
    tabs: [
      { key: "general", label: "Cài đặt chung", icon: "language", active: true },
      { key: "email", label: "Cấu hình email", icon: "mail", active: false },
      { key: "payments", label: "Cổng thanh toán", icon: "payments", active: false },
      { key: "security", label: "Bảo mật", icon: "verified_user", active: false },
    ],
    ...systemConfigState,
  };
}

export async function updateAdminSystemConfigData(payload) {
  if (payload.general) {
    systemConfigState.general = {
      ...systemConfigState.general,
      ...payload.general,
    };
  }

  if (payload.email) {
    systemConfigState.email = {
      ...systemConfigState.email,
      ...payload.email,
    };
  }

  if (payload.security) {
    systemConfigState.security = {
      ...systemConfigState.security,
      ...payload.security,
    };
  }

  return getAdminSystemConfigData();
}

import fs from "fs";
import path from "path";
import multer from "multer";
import {
  findStudentByPhone,
  getStudentCertificateRows,
  getStudentEnrollmentStatsRow,
  getStudentPaymentRows,
  getStudentProfileRow,
  updateStudentProfileRow,
} from "./studentAccount.repository.js";
import { updateSessionUser } from "./auth.service.js";

const SERVER_BASE_URL =
  process.env.PUBLIC_SERVER_URL ??
  `http://localhost:${process.env.PORT || 3000}`;
const avatarDirectory = path.resolve(process.cwd(), "uploads", "avatars");
const phonePattern = /^(0|\+84)[0-9]{9,10}$/;

fs.mkdirSync(avatarDirectory, { recursive: true });

function sanitizeFileName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function toNumber(value) {
  return value === null || value === undefined ? 0 : Number(value);
}

function normalizeFileUrl(url) {
  if (!url) {
    return null;
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  if (url.startsWith("/")) {
    return `${SERVER_BASE_URL}${url}`;
  }

  return `${SERVER_BASE_URL}/${url}`;
}

function mapPaymentMethod(method) {
  switch (method) {
    case "BANK_TRANSFER":
      return "Chuyển khoản";
    case "MOMO":
      return "Ví MoMo";
    case "VNPAY":
      return "VNPay";
    case "CASH":
      return "Tiền mặt";
    default:
      return "Khác";
  }
}

function mapPaymentStatus(status) {
  switch (status) {
    case "SUCCESS":
      return "Thành công";
    case "FAILED":
      return "Thất bại";
    case "REFUNDED":
      return "Hoàn tiền";
    default:
      return "Chờ xử lý";
  }
}

function mapGender(gender) {
  switch (gender) {
    case "MALE":
      return "Nam";
    case "FEMALE":
      return "Nữ";
    case "OTHER":
      return "Khác";
    default:
      return "Chưa cập nhật";
  }
}

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, avatarDirectory);
  },
  filename: (_req, file, callback) => {
    const timestamp = Date.now();
    const extension = path.extname(file.originalname || "");
    const baseName = path.basename(file.originalname || "avatar", extension);

    callback(
      null,
      `${timestamp}-${sanitizeFileName(baseName)}${sanitizeFileName(extension || ".png")}`,
    );
  },
});

const allowedAvatarMimeTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

export const studentAvatarUploadMiddleware = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (allowedAvatarMimeTypes.has(file.mimetype)) {
      callback(null, true);
      return;
    }

    callback(new Error("Ảnh đại diện chỉ hỗ trợ PNG, JPG hoặc WEBP."));
  },
}).single("avatar");

function buildRecentActivities(certificateRows, paymentRows) {
  const activities = [
    ...certificateRows.map((row) => ({
      type: "CERTIFICATE",
      title: `Nhận chứng chỉ ${row.course_name}`,
      subtitle: row.batch_name,
      happenedAt: row.issued_at,
      icon: "workspace_premium",
    })),
    ...paymentRows.slice(0, 5).map((row) => ({
      type: "PAYMENT",
      title: `Thanh toán khóa học ${row.course_name ?? "đăng ký học"}`,
      subtitle: mapPaymentMethod(row.payment_method),
      happenedAt: row.paid_at ?? row.created_at,
      icon: "payments",
    })),
  ];

  return activities
    .sort(
      (left, right) =>
        Date.parse(right.happenedAt ?? right.happenedAt) -
        Date.parse(left.happenedAt ?? left.happenedAt),
    )
    .slice(0, 6);
}

function mapProfile(profileRow) {
  return {
    id: profileRow.user_id,
    fullName: profileRow.full_name,
    email: profileRow.email,
    phone: profileRow.phone,
    avatarUrl: profileRow.avatar_url,
    status: profileRow.status,
    dateOfBirth: profileRow.date_of_birth,
    gender: profileRow.gender,
    genderLabel: mapGender(profileRow.gender),
    address: profileRow.address,
  };
}

function mapSummary(enrollmentStatsRow, certificateRows, paymentRows) {
  const totalSpent = paymentRows
    .filter((row) => row.payment_status === "SUCCESS")
    .reduce((sum, row) => sum + toNumber(row.amount), 0);

  return {
    totalCourses: toNumber(enrollmentStatsRow?.total_courses),
    activeCourses: toNumber(enrollmentStatsRow?.active_courses),
    completedCourses: toNumber(enrollmentStatsRow?.completed_courses),
    averageProgress: Number(toNumber(enrollmentStatsRow?.average_progress).toFixed(1)),
    certificatesCount: certificateRows.length,
    totalSpent,
    successfulPayments: paymentRows.filter((row) => row.payment_status === "SUCCESS")
      .length,
  };
}

function mapCertificates(certificateRows) {
  return certificateRows.map((row) => ({
    id: row.certificate_id,
    code: row.certificate_code,
    url: normalizeFileUrl(row.certificate_url),
    issuedAt: row.issued_at,
    batch: {
      id: row.batch_id,
      name: row.batch_name,
      code: row.batch_code,
    },
    course: {
      id: row.course_id,
      name: row.course_name,
      level: row.level,
    },
    teacher: {
      id: row.teacher_id,
      fullName: row.teacher_name,
    },
  }));
}

function mapPayments(paymentRows) {
  return paymentRows.map((row) => ({
    id: row.payment_id,
    amount: toNumber(row.amount),
    method: row.payment_method,
    methodLabel: mapPaymentMethod(row.payment_method),
    status: row.payment_status,
    statusLabel: mapPaymentStatus(row.payment_status),
    transactionCode: row.transaction_code,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    batch: {
      id: row.batch_id,
      name: row.batch_name,
      code: row.batch_code,
    },
    course: {
      id: row.course_id,
      name: row.course_name,
    },
    teacher: {
      id: row.teacher_id,
      fullName: row.teacher_name,
    },
  }));
}

export async function getStudentAccountProfile(studentId) {
  const [profileRow, enrollmentStatsRow, certificateRows, paymentRows] = await Promise.all([
    getStudentProfileRow(studentId),
    getStudentEnrollmentStatsRow(studentId),
    getStudentCertificateRows(studentId),
    getStudentPaymentRows(studentId),
  ]);

  if (!profileRow) {
    return null;
  }

  return {
    profile: mapProfile(profileRow),
    summary: mapSummary(enrollmentStatsRow, certificateRows, paymentRows),
    recentActivities: buildRecentActivities(certificateRows, paymentRows),
  };
}

export async function getStudentAccountCertificates(studentId) {
  const [profileRow, certificateRows] = await Promise.all([
    getStudentProfileRow(studentId),
    getStudentCertificateRows(studentId),
  ]);

  if (!profileRow) {
    return null;
  }

  return {
    profile: mapProfile(profileRow),
    summary: {
      certificatesCount: certificateRows.length,
    },
    certificates: mapCertificates(certificateRows),
  };
}

export async function getStudentAccountPaymentHistory(studentId) {
  const [profileRow, paymentRows] = await Promise.all([
    getStudentProfileRow(studentId),
    getStudentPaymentRows(studentId),
  ]);

  if (!profileRow) {
    return null;
  }

  const totalSpent = paymentRows
    .filter((row) => row.payment_status === "SUCCESS")
    .reduce((sum, row) => sum + toNumber(row.amount), 0);

  return {
    profile: mapProfile(profileRow),
    summary: {
      totalSpent,
      successfulPayments: paymentRows.filter((row) => row.payment_status === "SUCCESS")
        .length,
    },
    payments: mapPayments(paymentRows),
  };
}

export async function getStudentAccountOverview(studentId) {
  const [profileData, certificatesData, paymentsData] = await Promise.all([
    getStudentAccountProfile(studentId),
    getStudentAccountCertificates(studentId),
    getStudentAccountPaymentHistory(studentId),
  ]);

  if (!profileData || !certificatesData || !paymentsData) {
    return null;
  }

  return {
    profile: profileData.profile,
    summary: {
      ...profileData.summary,
      totalSpent: paymentsData.summary.totalSpent,
      successfulPayments: paymentsData.summary.successfulPayments,
      certificatesCount: certificatesData.summary.certificatesCount,
    },
    certificates: certificatesData.certificates,
    payments: paymentsData.payments,
    recentActivities: profileData.recentActivities,
  };
}

export async function updateStudentAccountProfile(studentId, sessionToken, payload) {
  const fullName = String(payload.fullName ?? "").trim();
  const phone = String(payload.phone ?? "").trim();
  const dateOfBirth = payload.dateOfBirth ? String(payload.dateOfBirth).trim() : null;
  const gender = payload.gender ? String(payload.gender).trim().toUpperCase() : null;
  const address = payload.address ? String(payload.address).trim() : null;
  const avatarFile = payload.avatarFile ?? null;

  if (fullName.length < 3) {
    return {
      ok: false,
      status: 400,
      message: "Thông tin hồ sơ chưa hợp lệ.",
      errors: {
        fullName: "Họ và tên cần ít nhất 3 ký tự.",
      },
    };
  }

  if (!phonePattern.test(phone)) {
    return {
      ok: false,
      status: 400,
      message: "Thông tin hồ sơ chưa hợp lệ.",
      errors: {
        phone: "Số điện thoại không đúng định dạng.",
      },
    };
  }

  if (dateOfBirth && Number.isNaN(Date.parse(dateOfBirth))) {
    return {
      ok: false,
      status: 400,
      message: "Thông tin hồ sơ chưa hợp lệ.",
      errors: {
        dateOfBirth: "Ngày sinh không hợp lệ.",
      },
    };
  }

  if (gender && !["MALE", "FEMALE", "OTHER"].includes(gender)) {
    return {
      ok: false,
      status: 400,
      message: "Thông tin hồ sơ chưa hợp lệ.",
      errors: {
        gender: "Giới tính không hợp lệ.",
      },
    };
  }

  if (address && address.length > 255) {
    return {
      ok: false,
      status: 400,
      message: "Thông tin hồ sơ chưa hợp lệ.",
      errors: {
        address: "Địa chỉ không được vượt quá 255 ký tự.",
      },
    };
  }

  const existingStudent = await getStudentProfileRow(studentId);

  if (!existingStudent) {
    return {
      ok: false,
      status: 404,
      message: "Không tìm thấy hồ sơ học viên.",
    };
  }

  const duplicatedPhone = await findStudentByPhone(phone, studentId);

  if (duplicatedPhone) {
    return {
      ok: false,
      status: 409,
      message: "Số điện thoại đã được sử dụng.",
      errors: {
        phone: "Số điện thoại đã được sử dụng.",
      },
    };
  }

  const avatarUrl = avatarFile
    ? `/uploads/avatars/${avatarFile.filename}`
    : existingStudent.avatar_url;

  const updatedRow = await updateStudentProfileRow(studentId, {
    fullName,
    phone,
    avatarUrl,
    dateOfBirth,
    gender,
    address,
  });

  const nextSessionUser = updateSessionUser(sessionToken, updatedRow);

  return {
    ok: true,
    data: {
      profile: mapProfile(updatedRow),
      sessionUser: nextSessionUser,
    },
  };
}

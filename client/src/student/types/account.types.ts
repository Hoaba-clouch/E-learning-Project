export type StudentAccountActivity = {
  type: "CERTIFICATE" | "PAYMENT";
  title: string;
  subtitle: string | null;
  happenedAt: string | null;
  icon: string;
};

export type StudentAccountCertificate = {
  id: number;
  code: string;
  url: string | null;
  issuedAt: string;
  batch: {
    id: number;
    name: string;
    code: string | null;
  };
  course: {
    id: number;
    name: string;
    level: string;
  };
  teacher: {
    id: number | null;
    fullName: string | null;
  };
};

export type StudentAccountPayment = {
  id: number;
  amount: number;
  method: string;
  methodLabel: string;
  status: string;
  statusLabel: string;
  transactionCode: string | null;
  paidAt: string | null;
  createdAt: string | null;
  batch: {
    id: number | null;
    name: string | null;
    code: string | null;
  };
  course: {
    id: number | null;
    name: string | null;
  };
  teacher: {
    id: number | null;
    fullName: string | null;
  };
};

export type StudentAccountOverview = {
  profile: {
    id: number;
    fullName: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
    status: string;
    dateOfBirth: string | null;
    gender: string | null;
    genderLabel: string;
    address: string | null;
  };
  summary: {
    totalCourses: number;
    activeCourses: number;
    completedCourses: number;
    averageProgress: number;
    certificatesCount: number;
    totalSpent: number;
    successfulPayments: number;
  };
  certificates: StudentAccountCertificate[];
  payments: StudentAccountPayment[];
  recentActivities: StudentAccountActivity[];
};

export type StudentAccountProfileData = {
  profile: StudentAccountOverview["profile"];
  summary: StudentAccountOverview["summary"];
  recentActivities: StudentAccountActivity[];
};

export type StudentAccountCertificatesData = {
  profile: StudentAccountOverview["profile"];
  summary: Pick<StudentAccountOverview["summary"], "certificatesCount">;
  certificates: StudentAccountCertificate[];
};

export type StudentAccountPaymentHistoryData = {
  profile: StudentAccountOverview["profile"];
  summary: Pick<StudentAccountOverview["summary"], "totalSpent" | "successfulPayments">;
  payments: StudentAccountPayment[];
};

export type StudentProfileUpdatePayload = {
  address: string;
  avatarFile: File | null;
  dateOfBirth: string;
  fullName: string;
  gender: "" | "MALE" | "FEMALE" | "OTHER";
  phone: string;
};

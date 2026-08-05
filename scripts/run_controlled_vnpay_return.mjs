// Controlled integration harness for local QA only. It signs the same Return URL
// payload that VNPAY Sandbox would send after a successful test payment.
// Never enable this path in production or expose VNPAY_HASH_SECRET to the client.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import querystring from "node:querystring";

if (process.env.ALLOW_SIMULATED_VNPAY_RETURN !== "1") {
  throw new Error("Đặt ALLOW_SIMULATED_VNPAY_RETURN=1 để chạy harness local có kiểm soát.");
}

const account = process.env.LEARNX_STUDENT_ACCOUNT;
const password = process.env.LEARNX_STUDENT_PASSWORD;
if (!account || !password) {
  throw new Error("Thiếu tài khoản test LearnX.");
}

function readEnvFile(filePath) {
  const result = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([^#=]+)=(.*)$/);
    if (match) result[match[1].trim()] = match[2].trim();
  }
  return result;
}

function formatVnpayDate(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

function signVnpayParams(params, hashSecret) {
  const sorted = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== "")
    .map((key) => encodeURIComponent(key))
    .sort()
    .reduce((result, encodedKey) => {
      result[encodedKey] = encodeURIComponent(params[encodedKey]).replace(/%20/g, "+");
      return result;
    }, {});
  const signData = querystring.stringify(sorted, null, null, {
    encodeURIComponent: (value) => value,
  });
  return crypto.createHmac("sha512", hashSecret).update(Buffer.from(signData, "utf8")).digest("hex");
}

const serverEnv = readEnvFile(path.resolve("server/.env"));
if (!serverEnv.VNPAY_HASH_SECRET || !serverEnv.VNPAY_TMN_CODE) {
  throw new Error("Backend chưa có cấu hình VNPAY.");
}

const apiBaseUrl = process.env.LEARNX_API_URL ?? "http://localhost:3000";
const loginResponse = await fetch(`${apiBaseUrl}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ account, password, remember: true }),
});
const loginBody = await loginResponse.json();
if (!loginResponse.ok) throw new Error(loginBody.message ?? "Đăng nhập thất bại.");

const headers = {
  Authorization: `Bearer ${loginBody.data.token}`,
  "Content-Type": "application/json",
};
const createResponse = await fetch(`${apiBaseUrl}/api/student/payments/vnpay/create`, {
  method: "POST",
  headers,
});
const createBody = await createResponse.json();
if (!createResponse.ok) throw new Error(createBody.message ?? "Không tạo được giao dịch.");

const payment = createBody.data;
const returnParams = {
  vnp_Amount: Math.round(payment.amount) * 100,
  vnp_BankCode: "NCB",
  vnp_BankTranNo: `CONTROLLED${Date.now()}`,
  vnp_CardType: "ATM",
  vnp_OrderInfo: `Thanh toan gio hang ${payment.cartId}`,
  vnp_PayDate: formatVnpayDate(),
  vnp_ResponseCode: "00",
  vnp_TmnCode: serverEnv.VNPAY_TMN_CODE,
  vnp_TransactionNo: String(Date.now()).slice(-12),
  vnp_TransactionStatus: "00",
  vnp_TxnRef: payment.txnRef,
};
returnParams.vnp_SecureHash = signVnpayParams(returnParams, serverEnv.VNPAY_HASH_SECRET);

const returnQuery = new URLSearchParams(returnParams).toString();
const verifyResponse = await fetch(
  `${apiBaseUrl}/api/student/payments/vnpay/return?${returnQuery}`,
  { headers: { Authorization: `Bearer ${loginBody.data.token}` } },
);
const verifyBody = await verifyResponse.json();
if (!verifyResponse.ok) throw new Error(verifyBody.message ?? "Xác minh callback thất bại.");

const coursesResponse = await fetch(`${apiBaseUrl}/api/student/my-courses`, {
  headers: { Authorization: `Bearer ${loginBody.data.token}` },
});
const coursesBody = await coursesResponse.json();

console.log(
  JSON.stringify(
    {
      harness: "CONTROLLED_LOCAL_RETURN",
      paymentStatus: verifyBody.data.status,
      enrolledCount: verifyBody.data.enrolledCount,
      myCourseCount: Array.isArray(coursesBody.data) ? coursesBody.data.length : 0,
      activeCourse: Array.isArray(coursesBody.data)
        ? coursesBody.data.find((course) => course.enrollment?.status === "ACTIVE")?.course?.name ?? null
        : null,
    },
    null,
    2,
  ),
);

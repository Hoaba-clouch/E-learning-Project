import crypto from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getConnectionMock = vi.hoisted(() => vi.fn());

vi.mock("../../db.js", () => ({
  default: {
    getConnection: getConnectionMock,
  },
}));

import {
  createStudentVnpayPayment,
  handleStudentVnpayIpn,
  verifyStudentVnpayReturn,
} from "../../services/studentPayments.service.js";

function signVnpayParams(params, secret = "secret") {
  const signData = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== "")
    .sort((left, right) => encodeURIComponent(left).localeCompare(encodeURIComponent(right)))
    .map((key) => {
      const encodedKey = encodeURIComponent(key);
      const encodedValue = encodeURIComponent(String(params[key])).replace(/%20/g, "+");
      return `${encodedKey}=${encodedValue}`;
    })
    .join("&");

  return crypto
    .createHmac("sha512", secret)
    .update(Buffer.from(signData, "utf-8"))
    .digest("hex");
}

function createConnection({
  batchStatus = "OPEN",
  enrolledCount = 2,
  maxStudents = 50,
  cartExists = true,
} = {}) {
  const execute = vi.fn(async (sql) => {
    if (sql.includes("FROM carts cart")) {
      return [[{
        cart_id: 11,
        cart_item_id: 1,
        batch_id: 5,
        price_snapshot: 120000,
        batch_code: "B1",
        batch_name: "Lớp 1",
        course_name: "React",
      }]];
    }

    if (sql.includes("FROM carts") && sql.includes("status = 'ACTIVE'")) {
      return [cartExists ? [{ cart_id: 11 }] : []];
    }

    if (sql.includes("FROM cart_items")) {
      return [[{ cart_item_id: 1, batch_id: 5, price_snapshot: 120000 }]];
    }

    if (sql.includes("FROM course_batches") && sql.includes("FOR UPDATE")) {
      return [[{ batch_id: 5 }]];
    }

    if (sql.includes("FROM course_batches cb") && sql.includes("enrolled_count")) {
      return [[{
        batch_id: 5,
        course_id: 3,
        status: batchStatus,
        enrollment_start_date: null,
        enrollment_deadline: null,
        max_students: maxStudents,
        enrolled_count: enrolledCount,
      }]];
    }

    if (sql.includes("SELECT DISTINCT cb.course_id")) {
      return [[]];
    }

    if (sql.includes("INSERT INTO payments")) {
      return [{ insertId: 90 }];
    }

    if (sql.includes("INSERT INTO enrollments")) {
      return [{ insertId: 91 }];
    }

    if (sql.includes("UPDATE course_batches")) {
      return [{ affectedRows: enrolledCount + 1 >= maxStudents ? 1 : 0 }];
    }

    if (sql.includes("DELETE FROM cart_items")) {
      return [{ affectedRows: 1 }];
    }

    if (sql.includes("FROM payments")) {
      return [[{ paymentCount: 1 }]];
    }

    throw new Error(`Unexpected SQL in test: ${sql}`);
  });

  return {
    execute,
    beginTransaction: vi.fn().mockResolvedValue(undefined),
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
    release: vi.fn().mockResolvedValue(undefined),
  };
}

async function createPayment(connection) {
  getConnectionMock.mockResolvedValue(connection);

  return createStudentVnpayPayment(7, {
    headers: {},
    socket: { remoteAddress: "127.0.0.1" },
  });
}

async function verifySuccessfulPayment(connection) {
  getConnectionMock.mockResolvedValue(connection);

  const params = {
    vnp_TxnRef: "CART11U7T123",
    vnp_ResponseCode: "00",
    vnp_TransactionStatus: "00",
    vnp_Amount: "12000000",
  };

  return verifyStudentVnpayReturn(7, {
    vnp_SecureHash: signVnpayParams(params),
    ...params,
  });
}

async function processSuccessfulIpn(connection, overrides = {}) {
  getConnectionMock.mockResolvedValue(connection);

  const params = {
    vnp_TxnRef: "CART11U7T123",
    vnp_ResponseCode: "00",
    vnp_TransactionStatus: "00",
    vnp_Amount: "12000000",
    ...overrides,
  };

  return handleStudentVnpayIpn({
    vnp_SecureHash: signVnpayParams(params),
    ...params,
  });
}

describe("studentPayments.service", () => {
  beforeEach(() => {
    getConnectionMock.mockReset();
    process.env.VNPAY_HASH_SECRET = "secret";
    process.env.VNPAY_PAYMENT_URL = "https://pay.example.com";
    process.env.VNPAY_RETURN_URL = "https://app.example.com/return";
    process.env.VNPAY_TMN_CODE = "TMN123";
  });

  it("creates a payment URL when the cart has valid items", async () => {
    const result = await createPayment(createConnection({ enrolledCount: 2, maxStudents: 10 }));

    expect(result.ok).toBe(true);
    expect(result.data.amount).toBe(120000);
    expect(result.data.cartId).toBe(11);
    expect(result.data.paymentUrl).toContain("https://pay.example.com?");
    expect(result.data.txnRef).toContain("CART11U7T");
  });

  it("rejects an invalid VNPAY signature", async () => {
    const result = await verifyStudentVnpayReturn(7, {
      vnp_SecureHash: "bad-signature",
      vnp_TxnRef: "CART11U7T123",
      vnp_ResponseCode: "00",
      vnp_TransactionStatus: "00",
      vnp_Amount: "12000000",
    });

    expect(result).toEqual({
      ok: false,
      status: 400,
      errorCode: "INVALID_SIGNATURE",
      message: "Chữ ký VNPAY không hợp lệ.",
    });
  });

  it("rejects an invalid IPN checksum without querying the database", async () => {
    const result = await handleStudentVnpayIpn({
      vnp_SecureHash: "bad-signature",
      vnp_TxnRef: "CART11U7T123",
      vnp_ResponseCode: "00",
      vnp_TransactionStatus: "00",
      vnp_Amount: "12000000",
    });

    expect(result).toEqual({
      RspCode: "97",
      Message: "Invalid checksum",
    });
    expect(getConnectionMock).not.toHaveBeenCalled();
  });

  it("processes a signed successful IPN without an authenticated user", async () => {
    const connection = createConnection();
    const result = await processSuccessfulIpn(connection);

    expect(result).toEqual({
      RspCode: "00",
      Message: "Confirm Success",
    });
    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(
      connection.execute.mock.calls.some(([sql]) =>
        sql.includes("INSERT INTO enrollments"),
      ),
    ).toBe(true);
  });

  it("rejects an IPN amount that differs from the current cart total", async () => {
    const connection = createConnection();
    const result = await processSuccessfulIpn(connection, {
      vnp_Amount: "99900000",
    });

    expect(result).toEqual({
      RspCode: "04",
      Message: "Invalid amount",
    });
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(
      connection.execute.mock.calls.some(([sql]) =>
        sql.includes("INSERT INTO payments"),
      ),
    ).toBe(false);
  });

  it("acknowledges a signed failed IPN without creating an enrollment", async () => {
    const params = {
      vnp_TxnRef: "CART11U7T123",
      vnp_ResponseCode: "24",
      vnp_TransactionStatus: "02",
      vnp_Amount: "12000000",
    };
    const result = await handleStudentVnpayIpn({
      vnp_SecureHash: signVnpayParams(params),
      ...params,
    });

    expect(result).toEqual({
      RspCode: "00",
      Message: "Confirm Success",
    });
    expect(getConnectionMock).not.toHaveBeenCalled();
  });

  it("reports an already-confirmed order when VNPAY repeats the IPN", async () => {
    const connection = createConnection({ cartExists: false });
    const result = await processSuccessfulIpn(connection);

    expect(result).toEqual({
      RspCode: "02",
      Message: "Order already confirmed",
    });
    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(
      connection.execute.mock.calls.some(([sql]) =>
        sql.includes("INSERT INTO payments"),
      ),
    ).toBe(false);
  });

  describe("capacity boundaries with max_students = 50", () => {
    it("TC-BVA-00 rejects enrollment when a class with zero students is not open", async () => {
      const result = await createPayment(createConnection({
        batchStatus: "DRAFT",
        enrolledCount: 0,
      }));

      expect(result).toEqual({
        ok: false,
        status: 409,
        message: "Lớp học này không còn mở để ghi danh.",
      });
    });

    it.each([
      ["TC-BVA-01", 0, "first"],
      ["TC-BVA-25", 24, "25th"],
      ["TC-BVA-49", 48, "49th"],
    ])("%s accepts the %s enrolled count for the %s student", async (_id, enrolledCount) => {
      const result = await createPayment(createConnection({ enrolledCount }));

      expect(result.ok).toBe(true);
      expect(result.data.paymentUrl).toContain("https://pay.example.com?");
    });

    it("TC-BVA-50 enrolls the 50th student and changes the class to FULL", async () => {
      const connection = createConnection({ enrolledCount: 49 });
      const result = await verifySuccessfulPayment(connection);

      expect(result.ok).toBe(true);
      expect(result.data.status).toBe("SUCCESS");
      expect(result.data.enrolledCount).toBe(1);
      expect(connection.commit).toHaveBeenCalledTimes(1);

      const sqlCalls = connection.execute.mock.calls.map(([sql]) => sql);
      const cartLockIndex = sqlCalls.findIndex(
        (sql) => sql.includes("FROM carts") && sql.includes("FOR UPDATE"),
      );
      const lockIndex = sqlCalls.findIndex(
        (sql) => sql.includes("FROM course_batches") && sql.includes("FOR UPDATE"),
      );
      const enrollmentIndex = sqlCalls.findIndex((sql) => sql.includes("INSERT INTO enrollments"));
      const fullStatusIndex = sqlCalls.findIndex((sql) => sql.includes("UPDATE course_batches"));

      expect(cartLockIndex).toBeGreaterThanOrEqual(0);
      expect(lockIndex).toBeGreaterThanOrEqual(0);
      expect(lockIndex).toBeLessThan(enrollmentIndex);
      expect(fullStatusIndex).toBeGreaterThan(enrollmentIndex);
    });

    it("TC-BVA-51 blocks the 51st student when the class is already full", async () => {
      const connection = createConnection({
        batchStatus: "FULL",
        enrolledCount: 50,
      });
      const result = await verifySuccessfulPayment(connection);

      expect(result).toEqual({
        ok: false,
        status: 409,
        message: "Lớp học bạn chọn đã đủ số lượng học viên.",
      });
      expect(connection.rollback).toHaveBeenCalledTimes(1);
      expect(connection.execute.mock.calls.some(([sql]) => sql.includes("INSERT INTO enrollments"))).toBe(false);
    });
  });

  it("returns the previous successful result when a VNPAY callback is repeated", async () => {
    const connection = createConnection({ cartExists: false });
    const result = await verifySuccessfulPayment(connection);

    expect(result.ok).toBe(true);
    expect(result.data.status).toBe("SUCCESS");
    expect(result.data.enrolledCount).toBe(1);
    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(connection.execute.mock.calls.some(([sql]) => sql.includes("INSERT INTO payments"))).toBe(false);
    expect(connection.execute.mock.calls.some(([sql]) => sql.includes("INSERT INTO enrollments"))).toBe(false);
  });
});

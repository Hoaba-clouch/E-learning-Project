import { getAuthHeaders } from "../../auth/authHeaders";
import type { StudentCart } from "../types/cart.types";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

async function readApiData<T>(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    throw new Error("Backend không trả về dữ liệu JSON hợp lệ.");
  }

  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !payload.success || payload.data === undefined) {
    throw new Error(payload.message ?? "Không thể xử lý giỏ hàng.");
  }

  return payload.data;
}

export async function getCart() {
  const response = await fetch(`${API_BASE_URL}/api/student/cart`, {
    headers: getAuthHeaders(),
  });

  return readApiData<StudentCart>(response);
}

export async function addCartItem(batchId: number) {
  const response = await fetch(`${API_BASE_URL}/api/student/cart/items`, {
    body: JSON.stringify({ batchId }),
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  return readApiData<StudentCart>(response);
}

export async function removeCartItem(cartItemId: number) {
  const response = await fetch(
    `${API_BASE_URL}/api/student/cart/items/${cartItemId}`,
    {
      headers: getAuthHeaders(),
      method: "DELETE",
    },
  );

  return readApiData<{ deleted: boolean }>(response);
}

export type VnpayPaymentCreateResult = {
  amount: number;
  cartId: number;
  itemCount: number;
  paymentUrl: string;
  txnRef: string;
};

export type VnpayPaymentReturnResult = {
  amount: number;
  enrolledCount: number;
  message: string;
  responseCode?: string;
  status: "SUCCESS" | "FAILED";
  txnRef: string;
};

export async function createVnpayPayment() {
  const response = await fetch(`${API_BASE_URL}/api/student/payments/vnpay/create`, {
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  return readApiData<VnpayPaymentCreateResult>(response);
}

export async function verifyVnpayPaymentReturn(search: string) {
  const query = search.startsWith("?") ? search : `?${search}`;
  const response = await fetch(`${API_BASE_URL}/api/student/payments/vnpay/return${query}`, {
    headers: getAuthHeaders(),
  });

  return readApiData<VnpayPaymentReturnResult>(response);
}

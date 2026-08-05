import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Icon from "../components/Icon";
import {
  verifyVnpayPaymentReturn,
  type VnpayPaymentReturnResult,
} from "../services/studentCartApi";
import "../pages/StudentPortalPage.css";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    currency: "VND",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function PaymentReturnPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [result, setResult] = useState<VnpayPaymentReturnResult | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    verifyVnpayPaymentReturn(`?${searchParams.toString()}`)
      .then((paymentResult) => {
        if (isMounted) {
          setResult(paymentResult);
        }
      })
      .catch((paymentError) => {
        if (isMounted) {
          setError(
            paymentError instanceof Error
              ? paymentError.message
              : "Không thể xác thực kết quả thanh toán.",
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  const isSuccess = result?.status === "SUCCESS";

  return (
    <main className="sp-payment-return-page">
      <section className={`sp-payment-result-card ${isSuccess ? "success" : "failed"}`}>
        <div className="sp-payment-result-icon">
          <Icon name={isSuccess ? "check_circle" : "error"} />
        </div>

        {isLoading ? (
          <>
            <p className="sp-eyebrow">VNPAY</p>
            <h1>Đang kiểm tra thanh toán</h1>
            <p>Hệ thống đang xác thực chữ ký và trạng thái giao dịch.</p>
          </>
        ) : error ? (
          <>
            <p className="sp-eyebrow">VNPAY</p>
            <h1>Không thể xác thực thanh toán</h1>
            <p>{error}</p>
          </>
        ) : (
          <>
            <p className="sp-eyebrow">VNPAY</p>
            <h1>{isSuccess ? "Thanh toán thành công" : "Thanh toán chưa hoàn tất"}</h1>
            <p>{result?.message}</p>

            <div className="sp-payment-result-summary">
              <span>Mã giao dịch</span>
              <strong>{result?.txnRef}</strong>
              <span>Số tiền</span>
              <strong>{formatCurrency(result?.amount ?? 0)}</strong>
              <span>Khóa đã ghi danh</span>
              <strong>{result?.enrolledCount ?? 0}</strong>
            </div>
          </>
        )}

        <div className="sp-payment-result-actions">
          <button onClick={() => navigate("/student")} type="button">
            Về trang học viên
          </button>
          <button onClick={() => navigate("/student?view=myCourses")} type="button">
            Xem khóa học của tôi
          </button>
        </div>
      </section>
    </main>
  );
}

export default PaymentReturnPage;

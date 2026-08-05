import { Router } from "express";
import { getBearerToken, requireAuth } from "../middleware/auth.middleware.js";
import {
  loginUser,
  registerStudent,
  revokeSession,
} from "../services/auth.service.js";

const router = Router();

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const phonePattern = /^(0|\+84)[0-9]{9,10}$/;

function validatePassword(password) {
  if (typeof password !== "string" || password.length < 8) {
    return "Mật khẩu cần ít nhất 8 ký tự.";
  }

  if (!/[A-Z]/.test(password)) {
    return "Mật khẩu cần có ít nhất 1 chữ hoa.";
  }

  if (!/[a-z]/.test(password)) {
    return "Mật khẩu cần có ít nhất 1 chữ thường.";
  }

  if (!/\d/.test(password)) {
    return "Mật khẩu cần có ít nhất 1 chữ số.";
  }

  if (!/[^\w\s]/.test(password)) {
    return "Mật khẩu cần có ít nhất 1 ký tự đặc biệt.";
  }

  return "";
}

function handleRouteError(res, error, message) {
  console.error(message, error);

  res.status(500).json({
    success: false,
    message,
  });
}

router.post("/register", async (req, res) => {
  try {
    const { fullName, email, phone, password, confirmPassword } = req.body ?? {};
    const errors = {};
    const cleanFullName = String(fullName ?? "").trim();
    const cleanEmail = String(email ?? "").trim().toLowerCase();
    const cleanPhone = String(phone ?? "").trim();
    const passwordError = validatePassword(password);

    if (!cleanFullName || cleanFullName.length < 3) {
      errors.fullName = "Họ và tên cần ít nhất 3 ký tự.";
    }

    if (!emailPattern.test(cleanEmail)) {
      errors.email = "Email không đúng định dạng.";
    }

    if (!phonePattern.test(cleanPhone)) {
      errors.phone = "Số điện thoại không đúng định dạng.";
    }

    if (passwordError) {
      errors.password = passwordError;
    }

    if (!confirmPassword || confirmPassword !== password) {
      errors.confirmPassword = "Mật khẩu xác nhận không khớp.";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Thông tin đăng ký chưa hợp lệ.",
        errors,
      });
    }

    const result = await registerStudent({
      fullName: cleanFullName,
      email: cleanEmail,
      phone: cleanPhone,
      password,
    });

    if (result.conflict) {
      return res.status(409).json({
        success: false,
        message: result.message,
        errors: {
          [result.field]: result.message,
        },
      });
    }

    res.status(201).json({
      success: true,
      message: "Đăng ký tài khoản học viên thành công.",
      data: {
        user: result.user,
      },
    });
  } catch (error) {
    handleRouteError(res, error, "Không thể đăng ký tài khoản.");
  }
});

router.post("/login", async (req, res) => {
  try {
    const { account, password, remember } = req.body ?? {};
    const errors = {};

    if (!String(account ?? "").trim()) {
      errors.account = "Vui lòng nhập email hoặc số điện thoại.";
    }

    if (!password) {
      errors.password = "Vui lòng nhập mật khẩu.";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Thông tin đăng nhập chưa hợp lệ.",
        errors,
      });
    }

    const result = await loginUser({
      account,
      password,
      remember: Boolean(remember),
    });

    if (!result.authenticated) {
      return res.status(401).json({
        success: false,
        message: result.message,
      });
    }

    res.json({
      success: true,
      message: "Đăng nhập thành công.",
      data: {
        token: result.session.token,
        expiresAt: result.session.expiresAt,
        user: result.user,
      },
    });
  } catch (error) {
    handleRouteError(res, error, "Không thể đăng nhập.");
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.auth.user,
    },
  });
});

router.post("/logout", requireAuth, (req, res) => {
  revokeSession(getBearerToken(req));

  res.json({
    success: true,
    message: "Đăng xuất thành công.",
  });
});

export default router;

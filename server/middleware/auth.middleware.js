import { getSessionUser } from "../services/auth.service.js";

export function getBearerToken(req) {
  const authHeader = req.headers.authorization ?? "";

  if (!authHeader.startsWith("Bearer ")) {
    return "";
  }

  return authHeader.slice("Bearer ".length).trim();
}

export function requireAuth(req, res, next) {
  const token = getBearerToken(req);
  const user = token ? getSessionUser(token) : null;

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
    });
  }

  req.auth = {
    token,
    user,
  };

  next();
}

export function attachAuthIfPresent(req, res, next) {
  const token = getBearerToken(req);
  const user = token ? getSessionUser(token) : null;

  req.auth = user
    ? {
        token,
        user,
      }
    : null;

  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth?.user || !roles.includes(req.auth.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền truy cập chức năng này.",
      });
    }

    next();
  };
}

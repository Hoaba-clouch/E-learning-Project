import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetSessionUser } = vi.hoisted(() => ({
  mockGetSessionUser: vi.fn(),
}));

vi.mock("../../services/auth.service.js", () => ({
  getSessionUser: mockGetSessionUser,
}));

import {
  getBearerToken,
  requireAuth,
  attachAuthIfPresent,
  requireRole,
} from "../../middleware/auth.middleware.js";

describe("auth middleware", () => {
  beforeEach(() => {
    mockGetSessionUser.mockReset();
  });

  describe("getBearerToken", () => {
    it("should return empty string when authorization header is missing", () => {
      const req = { headers: {} };
      expect(getBearerToken(req)).toBe("");
    });

    it("should return empty string when authorization header does not start with Bearer ", () => {
      const req = { headers: { authorization: "Basic credential" } };
      expect(getBearerToken(req)).toBe("");
    });

    it("should return token when authorization header is valid", () => {
      const req = { headers: { authorization: "Bearer valid-token" } };
      expect(getBearerToken(req)).toBe("valid-token");
    });
  });

  describe("requireAuth", () => {
    it("should call next() and attach auth when token is valid", () => {
      const req = { headers: { authorization: "Bearer token-123" } };
      const res = {};
      const next = vi.fn();
      const mockUser = { id: 1, email: "user@example.com", role: "STUDENT" };

      mockGetSessionUser.mockReturnValue(mockUser);

      requireAuth(req, res, next);

      expect(mockGetSessionUser).toHaveBeenCalledWith("token-123");
      expect(req.auth).toEqual({ token: "token-123", user: mockUser });
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("should return 401 when token is invalid or user is not found", () => {
      const req = { headers: { authorization: "Bearer invalid-token" } };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      mockGetSessionUser.mockReturnValue(null);

      requireAuth(req, res, next);

      expect(mockGetSessionUser).toHaveBeenCalledWith("invalid-token");
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("attachAuthIfPresent", () => {
    it("should attach user if valid token is present", () => {
      const req = { headers: { authorization: "Bearer token-123" } };
      const res = {};
      const next = vi.fn();
      const mockUser = { id: 1, role: "STUDENT" };
      mockGetSessionUser.mockReturnValue(mockUser);

      attachAuthIfPresent(req, res, next);

      expect(req.auth).toEqual({ token: "token-123", user: mockUser });
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("should attach null if token is missing or invalid", () => {
      const req = { headers: {} };
      const res = {};
      const next = vi.fn();
      mockGetSessionUser.mockReturnValue(null);

      attachAuthIfPresent(req, res, next);

      expect(req.auth).toBeNull();
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe("requireRole", () => {
    it("should call next() if user role matches one of required roles", () => {
      const req = {
        auth: {
          user: { role: "ADMIN" },
        },
      };
      const res = {};
      const next = vi.fn();

      const middleware = requireRole("ADMIN", "INSTRUCTOR");
      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it("should return 403 if user role does not match required roles", () => {
      const req = {
        auth: {
          user: { role: "STUDENT" },
        },
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      const middleware = requireRole("ADMIN", "INSTRUCTOR");
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Bạn không có quyền truy cập chức năng này.",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return 403 if req.auth is not present", () => {
      const req = {};
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      const middleware = requireRole("ADMIN");
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });
});

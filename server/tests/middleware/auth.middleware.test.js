import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetSessionUser } = vi.hoisted(() => ({
  mockGetSessionUser: vi.fn(),
}));

vi.mock("../../services/auth.service.js", () => ({
  getSessionUser: mockGetSessionUser,
}));

import {
  attachAuthIfPresent,
  getBearerToken,
  requireAuth,
  requireRole,
} from "../../middleware/auth.middleware.js";

describe("auth middleware", () => {
  beforeEach(() => {
    mockGetSessionUser.mockReset();
  });

  describe("getBearerToken", () => {
    it("returns an empty string when the authorization header is missing", () => {
      expect(getBearerToken({ headers: {} })).toBe("");
    });

    it("returns an empty string for a non-Bearer authorization header", () => {
      const req = { headers: { authorization: "Basic credential" } };
      expect(getBearerToken(req)).toBe("");
    });

    it("returns the token from a valid Bearer authorization header", () => {
      const req = { headers: { authorization: "Bearer valid-token" } };
      expect(getBearerToken(req)).toBe("valid-token");
    });
  });

  describe("requireAuth", () => {
    it("attaches authentication data and calls next for a valid token", () => {
      const req = { headers: { authorization: "Bearer token-123" } };
      const res = {};
      const next = vi.fn();
      const user = { id: 1, email: "user@example.com", role: "STUDENT" };
      mockGetSessionUser.mockReturnValue(user);

      requireAuth(req, res, next);

      expect(mockGetSessionUser).toHaveBeenCalledWith("token-123");
      expect(req.auth).toEqual({ token: "token-123", user });
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("returns 401 for an invalid or expired token", () => {
      const req = { headers: { authorization: "Bearer invalid-token" } };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();
      mockGetSessionUser.mockReturnValue(null);

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("attachAuthIfPresent", () => {
    it("attaches the user when a valid token is present", () => {
      const req = { headers: { authorization: "Bearer token-123" } };
      const next = vi.fn();
      const user = { id: 1, role: "STUDENT" };
      mockGetSessionUser.mockReturnValue(user);

      attachAuthIfPresent(req, {}, next);

      expect(req.auth).toEqual({ token: "token-123", user });
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("attaches null when the token is absent or invalid", () => {
      const req = { headers: {} };
      const next = vi.fn();

      attachAuthIfPresent(req, {}, next);

      expect(req.auth).toBeNull();
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe("requireRole", () => {
    it("calls next when the authenticated user's role is allowed", () => {
      const req = { auth: { user: { role: "ADMIN" } } };
      const next = vi.fn();

      requireRole("ADMIN", "INSTRUCTOR")(req, {}, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it("returns 403 when the authenticated user's role is not allowed", () => {
      const req = { auth: { user: { role: "STUDENT" } } };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      requireRole("ADMIN", "INSTRUCTOR")(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Bạn không có quyền truy cập chức năng này.",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("returns 403 when authentication data is absent", () => {
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      requireRole("ADMIN")({}, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });
});

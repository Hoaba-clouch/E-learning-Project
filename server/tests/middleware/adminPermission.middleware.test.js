import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockDbQuery } = vi.hoisted(() => ({
  mockDbQuery: vi.fn(),
}));

vi.mock("../../db.js", () => ({
  default: {
    query: mockDbQuery,
  },
}));

import db from "../../db.js";
import { requireAdminPermission } from "../../middleware/adminPermission.middleware.js";

describe("adminPermission middleware", () => {
  beforeEach(() => {
    mockDbQuery.mockReset();
  });

  it("should return 500 if permission group is invalid", async () => {
    const req = {};
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    const middleware = requireAdminPermission("invalid_group");
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid permission group.",
    });
    expect(next).not.toHaveBeenCalled();
    expect(mockDbQuery).not.toHaveBeenCalled();
  });

  it("should call next() if permission table check passes and user has permission", async () => {
    const req = {
      auth: {
        user: { id: 1 },
      },
    };
    const res = {};
    const next = vi.fn();

    // Mock first db.query for ensurePermissionTable
    mockDbQuery.mockResolvedValueOnce([]); // CREATE TABLE query
    // Mock second db.query for permission query
    mockDbQuery.mockResolvedValueOnce([[{ allowed: 1 }]]);

    const middleware = requireAdminPermission("users");
    await middleware(req, res, next);

    expect(mockDbQuery).toHaveBeenCalledTimes(2);
    expect(next).toHaveBeenCalledWith();
  });

  it("should call next() if user is super admin (no row in admin_user_permissions)", async () => {
    const req = {
      auth: {
        user: { id: 1 },
      },
    };
    const res = {};
    const next = vi.fn();

    mockDbQuery.mockResolvedValueOnce([]); // ensurePermissionTable
    mockDbQuery.mockResolvedValueOnce([[]]); // empty rows (means super admin)

    const middleware = requireAdminPermission("courses");
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it("should return 403 if user does not have permission", async () => {
    const req = {
      auth: {
        user: { id: 2 },
      },
    };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    mockDbQuery.mockResolvedValueOnce([]); // ensurePermissionTable
    mockDbQuery.mockResolvedValueOnce([[{ allowed: 0 }]]); // not allowed

    const middleware = requireAdminPermission("finance");
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Tài khoản admin không có quyền sử dụng nhóm chức năng này.",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should call next(error) if db query throws an error", async () => {
    const req = {
      auth: {
        user: { id: 1 },
      },
    };
    const res = {};
    const next = vi.fn();
    const dbError = new Error("Database connection error");

    mockDbQuery.mockRejectedValueOnce(dbError);

    const middleware = requireAdminPermission("system");
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(dbError);
  });
});

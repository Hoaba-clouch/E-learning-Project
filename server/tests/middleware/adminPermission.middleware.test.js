import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockDbQuery } = vi.hoisted(() => ({
  mockDbQuery: vi.fn(),
}));

vi.mock("../../db.js", () => ({
  default: {
    query: mockDbQuery,
  },
}));

import { requireAdminPermission } from "../../middleware/adminPermission.middleware.js";

describe("admin permission middleware", () => {
  beforeEach(() => {
    mockDbQuery.mockReset();
  });

  it("returns 500 for an invalid permission group", async () => {
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    await requireAdminPermission("invalid_group")({}, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid permission group.",
    });
    expect(mockDbQuery).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next when the permission row allows access", async () => {
    const req = { auth: { user: { id: 1 } } };
    const next = vi.fn();
    mockDbQuery.mockResolvedValueOnce([]);
    mockDbQuery.mockResolvedValueOnce([[{ allowed: 1 }]]);

    await requireAdminPermission("users")(req, {}, next);

    expect(mockDbQuery).toHaveBeenCalledTimes(2);
    expect(next).toHaveBeenCalledWith();
  });

  it("treats an admin without a permission row as a super admin", async () => {
    const req = { auth: { user: { id: 1 } } };
    const next = vi.fn();
    mockDbQuery.mockResolvedValueOnce([]);
    mockDbQuery.mockResolvedValueOnce([[]]);

    await requireAdminPermission("courses")(req, {}, next);

    expect(next).toHaveBeenCalledWith();
  });

  it("returns 403 when the admin does not have the requested permission", async () => {
    const req = { auth: { user: { id: 2 } } };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();
    mockDbQuery.mockResolvedValueOnce([]);
    mockDbQuery.mockResolvedValueOnce([[{ allowed: 0 }]]);

    await requireAdminPermission("finance")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Tài khoản admin không có quyền sử dụng nhóm chức năng này.",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("forwards database errors to the Express error handler", async () => {
    const req = { auth: { user: { id: 1 } } };
    const next = vi.fn();
    const databaseError = new Error("Database connection error");
    mockDbQuery.mockRejectedValueOnce(databaseError);

    await requireAdminPermission("system")(req, {}, next);

    expect(next).toHaveBeenCalledWith(databaseError);
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ProtectedRoute from "../ProtectedRoute";
import type { UserRole } from "../auth.types";

const mockUseAuth = vi.fn();
vi.mock("../AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<any>("react-router-dom");
  return {
    ...actual,
    Navigate: vi.fn(({ to, replace, state }) => (
      <div data-testid="navigate" data-to={to} data-replace={replace ? "true" : "false"} />
    )),
  };
});

describe("ProtectedRoute", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it("should show loading when status is checking", () => {
    mockUseAuth.mockReturnValue({
      status: "checking",
      user: null,
    });

    render(
      <MemoryRouter>
        <ProtectedRoute allowedRoles={["STUDENT"]}>
          <div data-testid="protected-content">Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText("Đang kiểm tra phiên đăng nhập...")).toBeInTheDocument();
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
  });

  it("should navigate to login if user is not authenticated", () => {
    mockUseAuth.mockReturnValue({
      status: "idle",
      user: null,
    });

    render(
      <MemoryRouter>
        <ProtectedRoute allowedRoles={["STUDENT"]} loginPath="/test/login">
          <div data-testid="protected-content">Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    const navigateEl = screen.getByTestId("navigate");
    expect(navigateEl).toBeInTheDocument();
    expect(navigateEl.getAttribute("data-to")).toBe("/test/login");
  });

  it("should navigate to role specific home if user does not have allowed role", () => {
    mockUseAuth.mockReturnValue({
      status: "authenticated",
      user: { role: "TEACHER" as UserRole },
    });

    render(
      <MemoryRouter>
        <ProtectedRoute allowedRoles={["ADMIN"]}>
          <div data-testid="protected-content">Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    const navigateEl = screen.getByTestId("navigate");
    expect(navigateEl).toBeInTheDocument();
    expect(navigateEl.getAttribute("data-to")).toBe("/student"); // roleHomePaths["TEACHER"] is "/student"
  });

  it("should render children if user has allowed role", () => {
    mockUseAuth.mockReturnValue({
      status: "authenticated",
      user: { role: "STUDENT" as UserRole },
    });

    render(
      <MemoryRouter>
        <ProtectedRoute allowedRoles={["STUDENT"]}>
          <div data-testid="protected-content">Secret content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    expect(screen.getByText("Secret content")).toBeInTheDocument();
    expect(screen.queryByTestId("navigate")).not.toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ProtectedRoute from "../ProtectedRoute";
import type { UserRole } from "../auth.types";

const mockUseAuth = vi.fn();

vi.mock("../AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );

  return {
    ...actual,
    Navigate: vi.fn(({ to, replace }) => (
      <div
        data-replace={replace ? "true" : "false"}
        data-testid="navigate"
        data-to={to}
      />
    )),
  };
});

describe("ProtectedRoute", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it("shows a loading state while the session is being checked", () => {
    mockUseAuth.mockReturnValue({ status: "checking", user: null });

    render(
      <MemoryRouter>
        <ProtectedRoute allowedRoles={["STUDENT"]}>
          <div data-testid="protected-content">Content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText("Đang kiểm tra phiên đăng nhập...")).toBeInTheDocument();
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
  });

  it("redirects an unauthenticated user to the requested login page", () => {
    mockUseAuth.mockReturnValue({ status: "idle", user: null });

    render(
      <MemoryRouter>
        <ProtectedRoute allowedRoles={["STUDENT"]} loginPath="/test/login">
          <div data-testid="protected-content">Content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    expect(screen.getByTestId("navigate")).toHaveAttribute("data-to", "/test/login");
  });

  it("redirects a user whose role is not allowed", () => {
    mockUseAuth.mockReturnValue({
      status: "authenticated",
      user: { role: "TEACHER" as UserRole },
    });

    render(
      <MemoryRouter>
        <ProtectedRoute allowedRoles={["ADMIN"]}>
          <div data-testid="protected-content">Content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    expect(screen.getByTestId("navigate")).toHaveAttribute("data-to", "/student");
  });

  it("renders protected content for an allowed role", () => {
    mockUseAuth.mockReturnValue({
      status: "authenticated",
      user: { role: "STUDENT" as UserRole },
    });

    render(
      <MemoryRouter>
        <ProtectedRoute allowedRoles={["STUDENT"]}>
          <div data-testid="protected-content">Secret content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    expect(screen.queryByTestId("navigate")).not.toBeInTheDocument();
  });
});

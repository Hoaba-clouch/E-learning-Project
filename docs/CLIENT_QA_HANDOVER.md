# TÀI LIỆU BÀN GIAO KIỂM THỬ PHÍA CLIENT (REACT + VITE + TYPESCRIPT)

Tài liệu này hướng dẫn chi tiết cách thiết lập môi trường, khởi chạy dự án và thực hiện kiểm thử tự động (Unit Test) cho phần Frontend (Client) của hệ thống LearnX E-learning.

---

## 1. Yêu cầu môi trường

Trước khi bắt đầu, hãy đảm bảo máy tính của bạn đã cài đặt các công cụ sau:
- **Node.js**: Phiên bản 20 trở lên.
- **npm**: Trình quản lý package đi kèm với Node.js.
- **Trình duyệt**: Chrome, Edge hoặc Firefox mới nhất để kiểm tra giao diện.

Kiểm tra phiên bản bằng lệnh:
```powershell
node -v
npm -v
```

---

## 2. Cài đặt và khởi chạy dự án

### 2.1 Cài đặt thư viện (Dependencies)
Từ thư mục gốc của dự án, di chuyển vào thư mục `client` và tiến hành cài đặt:
```powershell
cd client
npm install
```

### 2.2 Cấu hình biến môi trường
Tạo tệp `client/.env` (nếu chưa có) để kết nối client tới đúng địa chỉ API của server backend:
```env
VITE_API_URL=http://localhost:3000
```

### 2.3 Khởi chạy ứng dụng trong môi trường phát triển (Development)
Để chạy dự án ở chế độ phát triển:
```powershell
npm run dev
```
Ứng dụng sẽ chạy mặc định tại địa chỉ: [http://localhost:5173](http://localhost:5173)

### 2.4 Kiểm tra build dự án trước khi deploy
Để chạy build kiểm tra lỗi biên dịch TypeScript và đóng gói ứng dụng:
```powershell
npm run build
```

---

## 3. Kiến trúc và công cụ kiểm thử Client

Kiểm thử phía Client được xây dựng trên bộ công cụ hiện đại, tối ưu cho dự án chạy Vite:
- **Vitest**: Khung kiểm thử chính (tốc độ cao, tích hợp mượt mà với cấu hình Vite).
- **jsdom**: Môi trường giả lập trình duyệt trên Node.js để chạy React components mà không cần mở trình duyệt thật.
- **React Testing Library**: Thư viện giúp render các component và tương tác với DOM tương tự như người dùng thật.
- **Jest DOM (@testing-library/jest-dom)**: Cung cấp các bộ so khớp (matchers) trực quan như `.toBeInTheDocument()`, `.toHaveAttribute()`,...

---

## 4. Hướng dẫn chạy kiểm thử tự động (Client Tests)

Trong thư mục `client`, bạn có thể chạy các lệnh sau để thực hiện kiểm thử:

### 4.1 Chạy toàn bộ test một lần
Thực hiện chạy toàn bộ các tệp test trong dự án và in kết quả ra terminal:
```powershell
npm run test
```

### 4.2 Chạy test ở chế độ Watch (theo dõi thay đổi)
Vitest sẽ theo dõi các tệp mã nguồn và tự động chạy lại các test liên quan mỗi khi bạn lưu thay đổi:
```powershell
npm run test:watch
```

### 4.3 Chạy và xuất báo cáo độ bao phủ mã nguồn (Code Coverage)
Đo lường tỉ lệ phần trăm dòng code, hàm, và nhánh rẽ được kiểm thử bao phủ:
```powershell
npm run test:coverage
```
Báo cáo chi tiết sẽ hiển thị trực tiếp trên terminal và sinh ra thư mục `client/coverage/` chứa giao diện HTML trực quan. 

> [!TIP]
> **Tự động lưu trữ báo cáo**: Sau khi chạy xong lệnh `test:coverage`, hệ thống đã được cấu hình tự động sao chép toàn bộ báo cáo HTML này vào thư mục `docs/<ngày>-<tháng>/client/` dựa trên ngày hiện tại (ví dụ: `docs/05-08/client/`). Bạn không cần sao chép thủ công.

---

## 5. Cấu trúc và quy tắc viết Test ở Client

### 5.1 Vị trí đặt tệp test
Các tệp test nên được đặt gần với component mà nó kiểm thử, trong thư mục `__tests__` và có đuôi `.test.tsx` hoặc `.spec.tsx`.
Ví dụ:
```text
client/src/auth/
├── ProtectedRoute.tsx
├── AuthContext.tsx
└── __tests__/
    └── ProtectedRoute.test.tsx
```

### 5.2 Tệp cấu hình kiểm thử quan trọng
- **[vite.config.ts](file:///f:/CNTT/HK%20I/PTIT/%C4%90%E1%BA%A3m%20b%E1%BA%A3o%20ch%E1%BA%A5t%20l%C6%B0%E1%BB%A3ng%20ph%E1%BA%A7n%20m%E1%BB%81m/E-learning-Project/client/vite.config.ts)**: Chứa cấu hình `test` cho Vitest.
- **[setup.ts](file:///f:/CNTT/HK%20I/PTIT/%C4%90%E1%BA%A3m%20b%E1%BA%A3o%20ch%E1%BA%A5t%20l%C6%B0%E1%BB%A3ng%20ph%E1%BA%A7n%20m%E1%BB%81m/E-learning-Project/client/src/test/setup.ts)**: Nơi import các thư viện cài đặt chung như `@testing-library/jest-dom`.

### 5.3 Mẫu viết unit test (ProtectedRoute.test.tsx)
Dưới đây là một ví dụ mẫu hoàn chỉnh để bạn tham khảo khi viết các bộ test mới:

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ProtectedRoute from "../ProtectedRoute";
import type { UserRole } from "../auth.types";

// 1. Mock context hoặc các custom hook liên quan đến dữ liệu/api
const mockUseAuth = vi.fn();
vi.mock("../AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

// 2. Mock các component điều hướng định vị của react-router-dom
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<any>("react-router-dom");
  return {
    ...actual,
    Navigate: vi.fn(({ to, replace }) => (
      <div data-testid="navigate" data-to={to} data-replace={replace ? "true" : "false"} />
    )),
  };
});

describe("ProtectedRoute", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  // Tình huống 1: Đang trong quá trình kiểm tra phiên đăng nhập
  it("should show loading when status is checking", () => {
    mockUseAuth.mockReturnValue({ status: "checking", user: null });

    render(
      <MemoryRouter>
        <ProtectedRoute allowedRoles={["STUDENT"]}>
          <div data-testid="protected-content">Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText("Đang kiểm tra phiên đăng nhập...")).toBeInTheDocument();
  });

  // Tình huống 2: Người dùng chưa đăng nhập -> chuyển hướng về trang login
  it("should navigate to login if user is not authenticated", () => {
    mockUseAuth.mockReturnValue({ status: "idle", user: null });

    render(
      <MemoryRouter>
        <ProtectedRoute allowedRoles={["STUDENT"]} loginPath="/test/login">
          <div data-testid="protected-content">Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    const navigateEl = screen.getByTestId("navigate");
    expect(navigateEl).toBeInTheDocument();
    expect(navigateEl.getAttribute("data-to")).toBe("/test/login");
  });

  // Tình huống 3: Người dùng đã đăng nhập hợp lệ -> hiển thị nội dung bên trong
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
  });
});
```

---

## 6. Lưu ý quan trọng khi chạy trên Windows

> [!WARNING]
> Trên hệ điều hành Windows, nếu đường dẫn thư mục tuyệt đối của dự án chứa **khoảng trắng** hoặc **kí tự tiếng Việt có dấu** (ví dụ: `F:\CNTT\HK I\PTIT\Đảm bảo chất lượng phần mềm\...`), công cụ Worker Pool mặc định của Vitest sẽ bị lỗi timeout.
>
> **Giải pháp khắc phục đã được cấu hình sẵn trong dự án:**
> Chúng tôi đã cài đặt tùy chọn `--pool=threads` trong các câu lệnh kiểm thử của [package.json](file:///f:/CNTT/HK%20I/PTIT/%C4%90%E1%BA%A3m%20b%E1%BA%A3o%20ch%E1%BA%A5t%20l%C6%B0%E1%BB%A3ng%20ph%E1%BA%A7n%20m%E1%BB%81m/E-learning-Project/client/package.json) và thuộc tính `pool: 'threads'` trong [vite.config.ts](file:///f:/CNTT/HK%20I/PTIT/%C4%90%E1%BA%A3m%20b%E1%BA%A3o%20ch%E1%BA%A5t%20l%C6%B0%E1%BB%A3ng%20ph%E1%BA%A7n%20m%E1%BB%81m/E-learning-Project/client/vite.config.ts) để buộc Vitest chạy qua luồng phụ thay vì fork tiến trình. Hãy luôn sử dụng `npm test` thay vì gọi lệnh `vitest` chay để đảm bảo độ ổn định cao nhất trên máy Windows của bạn.

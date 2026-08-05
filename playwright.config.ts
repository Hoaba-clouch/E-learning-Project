import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: [
    ["list"],
    [
      "html",
      {
        open: "never",
        outputFolder: "docs/test-evidence/playwright-report",
      },
    ],
  ],
  outputDir: "docs/test-evidence/playwright-artifacts",
  use: {
    baseURL: "http://127.0.0.1:5173",
    locale: "vi-VN",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "desktop-chrome",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
      },
    },
  ],
  webServer: [
    {
      command: "npm run start:server",
      cwd: ".",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: "npm run start:client",
      cwd: ".",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});

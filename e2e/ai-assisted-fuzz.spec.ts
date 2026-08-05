import fc from "fast-check";
import { expect, request, test } from "@playwright/test";

const API_URL = "http://localhost:3000";
const student = { account: "hv03@elearning.vn", password: "Password123" };

test("AI-assisted fuzz: auth và review validation không trả 5xx", async () => {
  const api = await request.newContext({ baseURL: API_URL });

  await fc.assert(
    fc.asyncProperty(
      fc.string({ maxLength: 180 }),
      fc.string({ maxLength: 80 }),
      async (account, password) => {
        const response = await api.post("/api/auth/login", {
          data: { account, password, remember: false },
        });
        expect(response.status()).toBeLessThan(500);
      },
    ),
    { numRuns: 25, endOnFailure: true },
  );

  const loginResponse = await api.post("/api/auth/login", {
    data: { ...student, remember: true },
  });
  expect(loginResponse.ok()).toBeTruthy();
  const loginBody = await loginResponse.json();
  const headers = { Authorization: `Bearer ${loginBody.data.token}` };
  const catalogResponse = await api.get("/api/student/courses", { headers });
  const catalogBody = await catalogResponse.json();
  const myCoursesResponse = await api.get("/api/student/my-courses", { headers });
  const myCoursesBody = await myCoursesResponse.json();
  const enrolled = new Set(
    myCoursesBody.data.map((item: { course: { id: number } }) => item.course.id),
  );
  const unpaidCourse = catalogBody.data.find(
    (course: { id: number }) => !enrolled.has(course.id),
  );
  expect(unpaidCourse).toBeTruthy();

  await fc.assert(
    fc.asyncProperty(
      fc.integer({ min: -10, max: 15 }),
      fc.integer({ min: -10, max: 15 }),
      fc.string({ maxLength: 2_500 }),
      async (rating, teacherRating, comment) => {
        const response = await api.post(
          `/api/student/courses/${unpaidCourse.id}/reviews`,
          {
            headers,
            data: { rating, teacherRating, comment },
          },
        );
        expect(response.status()).toBeLessThan(500);
      },
    ),
    { numRuns: 25, endOnFailure: true },
  );

  await api.dispose();
});

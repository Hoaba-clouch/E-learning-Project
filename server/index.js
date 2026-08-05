import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeDatabase } from "./initDb.js";
import adminRoutes from "./routes/admin.routes.js";
import authRoutes from "./routes/auth.routes.js";
import instructorRoutes from "./routes/instructor.routes.js";
import studentRoutes from "./routes/student.routes.js";
import notificationRoutes from "./routes/notification.routes.js";

// Auto initialize database if missing tables
await initializeDatabase();

const app = express();
const port = process.env.PORT || 3000;
const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json());

app.use((req, res, next) => {
  const allowedOrigins = new Set([
    "http://localhost:5173",
    "https://demetrice-atomistical-georgene.ngrok-free.dev",
  ]);
  const requestOrigin = req.headers.origin;

  if (allowedOrigins.has(requestOrigin)) {
    res.header("Access-Control-Allow-Origin", requestOrigin);
  }

  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Server is running.",
  });
});

app.use("/uploads", express.static(path.resolve(currentDirectory, "..", "uploads")));
app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/instructor", instructorRoutes);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

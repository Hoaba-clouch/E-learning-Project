import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { requireAdminPermission } from "../middleware/adminPermission.middleware.js";
import {
  getAdminGeneralContentData,
  deleteAdminFaq,
  updateAdminBanner,
  updateAdminFaq,
} from "../services/adminContent.service.js";
import {
  getAdminCoursesPageData,
  getAdminCourseDetail,
  reviewAdminCourse,
} from "../services/adminCourses.service.js";
import {
  getAdminSystemConfigData,
  updateAdminSystemConfigData,
} from "../services/adminConfig.service.js";
import { getAdminDashboardData } from "../services/adminDashboard.service.js";
import {
  getAdminStudentDetail,
  getAdminStudentsPageData,
  updateAdminStudentStatus,
} from "../services/adminStudents.service.js";
import {
  getAdminTeacherDetail,
  getAdminTeachersPageData,
  updateAdminTeacherStatus,
} from "../services/adminTeachers.service.js";

const router = Router();
router.use(requireAuth, requireRole("ADMIN"));

function handleRouteError(res, error, message) {
  console.error(message, error);

  res.status(500).json({
    success: false,
    message,
  });
}

router.get("/dashboard", async (req, res) => {
  try {
    const data = await getAdminDashboardData();

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    handleRouteError(res, error, "Failed to load admin dashboard data.");
  }
});

router.get("/students", requireAdminPermission("users"), async (req, res) => {
  try {
    const data = await getAdminStudentsPageData();

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    handleRouteError(res, error, "Failed to load admin students data.");
  }
});

router.get("/teachers", requireAdminPermission("users"), async (req, res) => {
  try {
    const data = await getAdminTeachersPageData();
    res.json({ success: true, data });
  } catch (error) {
    handleRouteError(res, error, "Failed to load admin teachers data.");
  }
});

router.get("/teachers/:id", requireAdminPermission("users"), async (req, res) => {
  try {
    const data = await getAdminTeacherDetail(req.params.id);
    if (!data) {
      return res.status(404).json({ success: false, message: "Teacher not found." });
    }
    res.json({ success: true, data });
  } catch (error) {
    handleRouteError(res, error, "Failed to load admin teacher detail.");
  }
});

router.patch("/teachers/:id/status", requireAdminPermission("users"), async (req, res) => {
  try {
    const { status } = req.body ?? {};
    if (!["active", "suspended", "inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid teacher status.",
      });
    }
    const data = await updateAdminTeacherStatus(req.params.id, status);
    if (!data) {
      return res.status(404).json({ success: false, message: "Teacher not found." });
    }
    res.json({ success: true, data });
  } catch (error) {
    handleRouteError(res, error, "Failed to update admin teacher status.");
  }
});

router.get("/students/:id", requireAdminPermission("users"), async (req, res) => {
  try {
    const data = await getAdminStudentDetail(req.params.id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    handleRouteError(res, error, "Failed to load student detail.");
  }
});

router.patch("/students/:id/status", requireAdminPermission("users"), async (req, res) => {
  try {
    const { status } = req.body;

    if (!["active", "suspended", "inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student status.",
      });
    }

    const data = await updateAdminStudentStatus(req.params.id, status);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    handleRouteError(res, error, "Failed to update student status.");
  }
});

router.get("/courses", requireAdminPermission("courses"), async (req, res) => {
  try {
    const data = await getAdminCoursesPageData();

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    handleRouteError(res, error, "Failed to load admin courses data.");
  }
});

router.get("/courses/:id", requireAdminPermission("courses"), async (req, res) => {
  try {
    const data = await getAdminCourseDetail(req.params.id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    handleRouteError(res, error, "Failed to load course detail.");
  }
});

router.patch("/courses/:id/review", requireAdminPermission("courses"), async (req, res) => {
  try {
    const { status } = req.body;

    if (!["pending", "approved", "rejected", "hidden"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course review status.",
      });
    }

    const data = await reviewAdminCourse(req.params.id, status);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    handleRouteError(res, error, "Failed to update course review status.");
  }
});

router.get("/system-config", requireAdminPermission("system"), async (req, res) => {
  try {
    const data = await getAdminSystemConfigData();

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    handleRouteError(res, error, "Failed to load system configuration.");
  }
});

router.put("/system-config", requireAdminPermission("system"), async (req, res) => {
  try {
    const data = await updateAdminSystemConfigData(req.body ?? {});

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    handleRouteError(res, error, "Failed to update system configuration.");
  }
});

router.get("/general-content", requireAdminPermission("system"), async (req, res) => {
  try {
    const data = await getAdminGeneralContentData();

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    handleRouteError(res, error, "Failed to load general content data.");
  }
});

router.patch("/general-content/faqs/:id", requireAdminPermission("system"), async (req, res) => {
  try {
    const data = await updateAdminFaq(req.params.id, req.body ?? {});

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found.",
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    handleRouteError(res, error, "Failed to update FAQ.");
  }
});

router.delete("/general-content/faqs/:id", requireAdminPermission("system"), async (req, res) => {
  try {
    const deleted = await deleteAdminFaq(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found.",
      });
    }

    res.json({
      success: true,
      data: {
        deleted: true,
      },
    });
  } catch (error) {
    handleRouteError(res, error, "Failed to delete FAQ.");
  }
});

router.patch("/general-content/banners/:id", requireAdminPermission("system"), async (req, res) => {
  try {
    const data = await updateAdminBanner(req.params.id, req.body ?? {});

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Banner not found.",
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    handleRouteError(res, error, "Failed to update banner.");
  }
});

export default router;

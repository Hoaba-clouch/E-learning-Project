import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  getNotifications,
  getVapidPublicKey,
  markAllNotificationsRead,
  markNotificationRead,
  savePushSubscription,
} from "../services/notification.service.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const data = await getNotifications(req.auth.user.id, req.query.limit);
    res.json({ success: true, data });
  } catch (error) {
    console.error("Failed to load notifications.", error);
    res.status(500).json({ success: false, message: "Không thể tải thông báo." });
  }
});

router.get("/push/public-key", (req, res) => {
  res.json({
    success: true,
    data: { publicKey: getVapidPublicKey() },
  });
});

router.post("/push/subscribe", async (req, res) => {
  try {
    const data = await savePushSubscription(
      req.auth.user.id,
      req.body?.subscription,
      req.headers["user-agent"] ?? null,
    );
    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error("Failed to save push subscription.", error);
    res.status(400).json({ success: false, message: "Đăng ký thông báo đẩy thất bại." });
  }
});

router.patch("/read-all", async (req, res) => {
  try {
    const data = await markAllNotificationsRead(req.auth.user.id);
    res.json({ success: true, data });
  } catch (error) {
    console.error("Failed to mark all notifications read.", error);
    res.status(500).json({ success: false, message: "Không thể cập nhật thông báo." });
  }
});

router.patch("/:id/read", async (req, res) => {
  try {
    const updated = await markNotificationRead(
      req.auth.user.id,
      Number(req.params.id),
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Không tìm thấy thông báo." });
    }

    res.json({ success: true, data: { updated: true } });
  } catch (error) {
    console.error("Failed to mark notification read.", error);
    res.status(500).json({ success: false, message: "Không thể cập nhật thông báo." });
  }
});

export default router;

import db from "../db.js";
import webpush from "web-push";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY ?? "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY ?? "";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:admin@learnx.local",
    vapidPublicKey,
    vapidPrivateKey,
  );
}

function mapNotification(row) {
  return {
    id: Number(row.notification_id),
    type: row.notification_type,
    title: row.title,
    content: row.content,
    referenceType: row.reference_type,
    referenceId: row.reference_id === null ? null : Number(row.reference_id),
    targetUrl: row.target_url,
    priority: row.priority,
    isRead: Boolean(row.is_read),
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export async function getNotifications(userId, limit = 20) {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const [rows] = await db.query(
    `SELECT notification_id, notification_type, title, content,
            reference_type, reference_id, target_url, priority,
            is_read, read_at, created_at
     FROM notifications
     WHERE user_id = ?
     ORDER BY created_at DESC, notification_id DESC
     LIMIT ?`,
    [userId, safeLimit],
  );

  const [countRows] = await db.query(
    `SELECT COUNT(*) AS unread_count
     FROM notifications
     WHERE user_id = ? AND is_read = FALSE`,
    [userId],
  );

  return {
    notifications: rows.map(mapNotification),
    unreadCount: Number(countRows[0]?.unread_count ?? 0),
  };
}

export async function markNotificationRead(userId, notificationId) {
  const [result] = await db.query(
    `UPDATE notifications
     SET is_read = TRUE, read_at = COALESCE(read_at, NOW())
     WHERE notification_id = ? AND user_id = ?`,
    [notificationId, userId],
  );

  return result.affectedRows > 0;
}

export async function markAllNotificationsRead(userId) {
  const [result] = await db.query(
    `UPDATE notifications
     SET is_read = TRUE, read_at = COALESCE(read_at, NOW())
     WHERE user_id = ? AND is_read = FALSE`,
    [userId],
  );

  return { updated: Number(result.affectedRows ?? 0) };
}

export async function createNotification({
  userId,
  type = "SYSTEM",
  title,
  content,
  referenceType = null,
  referenceId = null,
  targetUrl = null,
  priority = "NORMAL",
}) {
  const [result] = await db.query(
    `INSERT INTO notifications
      (user_id, notification_type, title, content, reference_type,
       reference_id, target_url, priority, is_read)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, FALSE)`,
    [
      userId,
      type,
      title,
      content,
      referenceType,
      referenceId,
      targetUrl,
      priority,
    ],
  );

  await sendPushToUser(userId, {
    title,
    content,
    targetUrl,
    type,
  });

  return Number(result.insertId);
}

export async function createNotificationsForRole(role, notification) {
  const [users] = await db.query(
    "SELECT user_id FROM users WHERE role = ? AND status = 'ACTIVE'",
    [role],
  );

  await Promise.all(
    users.map((user) =>
      createNotification({ ...notification, userId: user.user_id }),
    ),
  );

  return users.length;
}

export async function createNotificationForAssignmentTeacher(
  assignmentId,
  notification,
) {
  const [rows] = await db.query(
    `SELECT DISTINCT c.teacher_id AS teacher_id
     FROM assignments a
     INNER JOIN lessons l ON l.lesson_id = a.lesson_id
     INNER JOIN course_modules m ON m.module_id = l.module_id
     INNER JOIN courses c ON c.course_id = m.course_id
     WHERE a.assignment_id = ?
     LIMIT 1`,
    [assignmentId],
  );

  if (!rows[0]) return null;
  return createNotification({ ...notification, userId: rows[0].teacher_id });
}

export async function createNotificationForExamTeacher(examId, notification) {
  const [rows] = await db.query(
    `SELECT DISTINCT c.teacher_id AS teacher_id
     FROM course_exams ce
     INNER JOIN courses c ON c.course_id = ce.course_id
     WHERE ce.exam_id = ?
     LIMIT 1`,
    [examId],
  );

  if (!rows[0]?.teacher_id) return null;
  return createNotification({ ...notification, userId: rows[0].teacher_id });
}

export function getVapidPublicKey() {
  return vapidPublicKey;
}

export async function savePushSubscription(userId, subscription, userAgent = null) {
  const endpoint = String(subscription?.endpoint ?? "");
  const p256dh = String(subscription?.keys?.p256dh ?? "");
  const authToken = String(subscription?.keys?.auth ?? "");

  if (!endpoint || !p256dh || !authToken) {
    throw new Error("Invalid push subscription.");
  }

  await db.query(
    `INSERT INTO push_subscriptions
      (user_id, endpoint, p256dh, auth_token, user_agent, is_active, last_used_at)
     VALUES (?, ?, ?, ?, ?, TRUE, NOW())
     ON DUPLICATE KEY UPDATE
       user_id = VALUES(user_id),
       p256dh = VALUES(p256dh),
       auth_token = VALUES(auth_token),
       user_agent = VALUES(user_agent),
       is_active = TRUE,
       last_used_at = NOW()`,
    [userId, endpoint, p256dh, authToken, userAgent],
  );

  await db.query(
    `INSERT INTO notification_preferences (user_id, web_push_enabled)
     VALUES (?, TRUE)
     ON DUPLICATE KEY UPDATE web_push_enabled = TRUE`,
    [userId],
  );

  return { subscribed: true };
}

async function sendPushToUser(userId, notification) {
  if (!vapidPublicKey || !vapidPrivateKey) return;

  try {
    const [preferenceRows] = await db.query(
      `SELECT web_push_enabled
       FROM notification_preferences
       WHERE user_id = ?`,
      [userId],
    );

    if (!Boolean(preferenceRows[0]?.web_push_enabled)) return;

    const [subscriptions] = await db.query(
      `SELECT subscription_id, endpoint, p256dh, auth_token
       FROM push_subscriptions
       WHERE user_id = ? AND is_active = TRUE`,
      [userId],
    );

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.content,
      url: notification.targetUrl ?? "/",
      type: notification.type,
    });

    await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth_token,
              },
            },
            payload,
          );
        } catch (error) {
          if (error?.statusCode === 404 || error?.statusCode === 410) {
            await db.query(
              "UPDATE push_subscriptions SET is_active = FALSE WHERE subscription_id = ?",
              [subscription.subscription_id],
            );
          } else {
            console.error("Failed to send web push.", error);
          }
        }
      }),
    );
  } catch (error) {
    console.error("Failed to prepare web push.", error);
  }
}

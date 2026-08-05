import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  getNotifications,
  getPushPublicKey,
  markAllNotificationsRead,
  markNotificationRead,
  savePushSubscription,
  type AppNotification,
} from "../../services/notificationApi";
import "./NotificationBell.css";

type Props = {
  className?: string;
  icon?: ReactNode;
  onOpenNotification?: (notification: AppNotification) => void;
};

function formatTime(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));

  if (minutes < 60) return `${minutes} phút trước`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} giờ trước`;
  return date.toLocaleDateString("vi-VN");
}

function NotificationBell({ className = "", icon, onOpenNotification }: Props) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState("");
  const [pushState, setPushState] = useState<
    "unsupported" | "default" | "granted" | "denied" | "subscribed"
  >(() => {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      !("serviceWorker" in navigator)
    ) {
      return "unsupported";
    }
    return Notification.permission;
  });
  const rootRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await getNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải thông báo.");
    }
  }, []);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => void refresh(), 30000);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(interval);
    };
  }, [refresh]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (pushState === "unsupported") return;

    void navigator.serviceWorker
      .getRegistration("/push-sw.js")
      .then(async (registration) => {
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) setPushState("subscribed");
      });
  }, [pushState]);

  async function openNotification(notification: AppNotification) {
    if (!notification.isRead) {
      await markNotificationRead(notification.id);
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, isRead: true } : item,
        ),
      );
      setUnreadCount((current) => Math.max(0, current - 1));
    }

    setIsOpen(false);
    onOpenNotification?.(notification);
  }

  async function readAll() {
    await markAllNotificationsRead();
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, isRead: true })),
    );
    setUnreadCount(0);
  }

  async function enablePush() {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushState(permission);
        return;
      }

      const registration = await navigator.serviceWorker.register("/push-sw.js");
      const { publicKey } = await getPushPublicKey();
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      await savePushSubscription(subscription.toJSON());
      setPushState("subscribed");
      setError("");
    } catch (pushError) {
      setError(
        pushError instanceof Error
          ? pushError.message
          : "Không thể bật thông báo đẩy.",
      );
    }
  }

  return (
    <div className={`notification-bell ${className}`.trim()} ref={rootRef}>
      <button
        aria-label="Thông báo"
        className="notification-bell-trigger"
        onClick={() => {
          setIsOpen((current) => !current);
          if (!isOpen) void refresh();
        }}
        type="button"
      >
        {icon ?? <span className="material-symbols-outlined">notifications</span>}
        {unreadCount > 0 ? (
          <span className="notification-bell-count">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="notification-popover">
          <div className="notification-popover-header">
            <div>
              <h3>Thông báo</h3>
              <p>{unreadCount} thông báo chưa đọc</p>
            </div>
            {unreadCount > 0 ? (
              <button onClick={() => void readAll()} type="button">
                Đọc tất cả
              </button>
            ) : null}
          </div>

          {pushState === "default" || pushState === "granted" ? (
            <button
              className="notification-enable-push"
              onClick={() => void enablePush()}
              type="button"
            >
              <span className="material-symbols-outlined">notifications_active</span>
              Bật thông báo đẩy trên thiết bị này
            </button>
          ) : null}

          {pushState === "denied" ? (
            <p className="notification-push-denied">
              Trình duyệt đang chặn thông báo. Hãy bật lại trong cài đặt trang.
            </p>
          ) : null}

          <div className="notification-list">
            {error ? <p className="notification-state error">{error}</p> : null}
            {!error && notifications.length === 0 ? (
              <p className="notification-state">Chưa có thông báo.</p>
            ) : null}
            {notifications.map((notification) => (
              <button
                className={`notification-item${notification.isRead ? "" : " unread"} ${notification.priority.toLowerCase()}`}
                key={notification.id}
                onClick={() => void openNotification(notification)}
                type="button"
              >
                <span className="notification-item-icon material-symbols-outlined">
                  {notification.type.includes("PAYMENT")
                    ? "payments"
                    : notification.type.includes("EXAM")
                      ? "quiz"
                      : notification.type.includes("ASSIGNMENT")
                        ? "assignment"
                        : notification.type.includes("ACCOUNT")
                          ? "manage_accounts"
                          : "notifications"}
                </span>
                <span className="notification-item-copy">
                  <strong>{notification.title}</strong>
                  <span>{notification.content}</span>
                  <small>{formatTime(notification.createdAt)}</small>
                </span>
                {!notification.isRead ? <span className="notification-unread-dot" /> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((character) => character.charCodeAt(0)));
}

export default NotificationBell;

import { useTranslation } from "react-i18next";
import Icon from "../../../student/components/Icon";
import "./StatusModal.css";

export type StatusModalTone = "success" | "error" | "warning";

type StatusModalProps = {
  isOpen: boolean;
  message: string;
  onClose: () => void;
  title: string;
  tone: StatusModalTone;
};

const toneConfig: Record<StatusModalTone, { actionKey: string; icon: string }> = {
  success: { actionKey: "actions.continue", icon: "check_circle" },
  error: { actionKey: "actions.close", icon: "cancel" },
  warning: { actionKey: "actions.understood", icon: "warning" },
};

function StatusModal({
  isOpen,
  message,
  onClose,
  title,
  tone,
}: StatusModalProps) {
  const { t } = useTranslation("common");

  if (!isOpen) {
    return null;
  }

  const config = toneConfig[tone];

  return (
    <div
      aria-modal="true"
      className="status-modal-overlay"
      onClick={onClose}
      role="dialog"
    >
      <section
        className={`status-modal ${tone}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="status-modal-header">
          <div className="status-modal-icon">
            <Icon name={config.icon} />
          </div>
          <div className="status-modal-copy">
            <h2>{title}</h2>
            <p>{message}</p>
          </div>
          <button
            aria-label={t("statusModal.closeLabel")}
            className="status-modal-close"
            onClick={onClose}
            type="button"
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="status-modal-actions">
          <button onClick={onClose} type="button">
            {t(config.actionKey)}
          </button>
        </div>
      </section>
    </div>
  );
}

export default StatusModal;

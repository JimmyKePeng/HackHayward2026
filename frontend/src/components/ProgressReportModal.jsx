import { useEffect } from "react";
import { createPortal } from "react-dom";

const API_BASE_URL = "http://localhost:3001";

export function ProgressReportModal({
  open,
  onClose,
  reportText,
  loading,
  error,
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="report-modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="report-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
      >
        <div className="report-modal__header">
          <h2 id="report-modal-title">Progress report</h2>
          <button
            type="button"
            className="report-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p className="report-modal__intro">
          Full quest history is stored in{" "}
          <code>backend/quest-report-archive.json</code> (removed quests stay in
          the report). Text export: <code>backend/progress-report.txt</code>.
          Backend: {API_BASE_URL}
        </p>

        <div className="report-modal__body-wrap">
          {loading && <p className="report-modal__status">Loading report…</p>}
          {error && !loading && (
            <p className="report-modal__error">{error}</p>
          )}
          {!loading && !error && (
            <pre className="report-modal__body">{reportText || ""}</pre>
          )}
        </div>

        <div className="report-modal__footer">
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

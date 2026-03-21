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
        <div className="report-modal__accent" aria-hidden />
        <div className="report-modal__header">
          <div className="report-modal__title-block">
            <span className="report-modal__badge">Archive</span>
            <h2 id="report-modal-title">Progress report</h2>
            <p className="report-modal__subtitle">
              Full quest history · server export
            </p>
          </div>
          <button
            type="button"
            className="report-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="report-modal__intro-wrap">
          <p className="report-modal__intro">
            <strong className="report-modal__intro-strong">Stored files</strong> —{" "}
            <code>quest-report-archive.json</code> keeps every run (even deleted
            from the app). <code>progress-report.txt</code> is the latest text
            snapshot. API: <span className="report-modal__api-pill">{API_BASE_URL}</span>
          </p>
        </div>

        <div className="report-modal__body-wrap">
          {loading && (
            <div className="report-modal__loading" role="status">
              <span className="report-modal__spinner" aria-hidden />
              <span>Generating your report…</span>
            </div>
          )}
          {error && !loading && (
            <p className="report-modal__error">{error}</p>
          )}
          {!loading && !error && (
            <pre className="report-modal__body">{reportText || ""}</pre>
          )}
        </div>

        <div className="report-modal__footer">
          <button type="button" className="report-modal__footer-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

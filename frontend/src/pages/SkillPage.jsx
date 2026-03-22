import { useEffect, useState } from "react";
import SkillReportView from "../components/SkillReportView";
import { migrateAppState } from "../hooks/useQuestState";
import "./SkillPage.css";

const API_BASE_URL = "http://localhost:3001";

export default function SkillPage({ appState }) {
  const [reportText, setReportText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE_URL}/progress-report`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appState: migrateAppState(appState) }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || "Failed to load your skills.");
        }
        if (!cancelled) {
          setReportText(data.report ?? "");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Something went wrong.");
          setReportText("");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadReport();
    return () => {
      cancelled = true;
    };
  }, [appState]);

  return (
    <div className="skill-page">
      <header className="hero hero--page hero--compact skill-page__hero">
        <div className="skill-page__hero-inner">
          <span className="skill-page__hero-icon" aria-hidden>
            ✦
          </span>
          <div>
            <h1>Skill</h1>
            <p>
              Your achievements from every quest run — pulled from your archive
              and current progress. Updates when you revisit this page after
              changes elsewhere.
            </p>
          </div>
        </div>
      </header>

      <section className="panel skill-report" aria-busy={loading}>
        <div className="skill-report__accent" aria-hidden />
        <div className="skill-report__head">
          <span className="skill-report__badge">Archive snapshot</span>
          <h2 className="skill-report__title">What you&apos;ve achieved</h2>
          <p className="skill-report__sub">
            Saved to <code>progress-report.txt</code> on the server when this
            loads. Quests you removed from the app still show from the archive.
          </p>
        </div>

        <div className="skill-report__body-wrap">
          {loading && (
            <div className="report-modal__loading skill-report__loading" role="status">
              <span className="report-modal__spinner" aria-hidden />
              <span>Loading your skills…</span>
            </div>
          )}
          {error && !loading && (
            <p className="report-modal__error skill-report__error">{error}</p>
          )}
          {!loading && !error && (
            <div className="skill-report__content" tabIndex={0}>
              <SkillReportView reportText={reportText} />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

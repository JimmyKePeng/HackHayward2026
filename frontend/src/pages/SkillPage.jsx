import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SkillReportView from "../components/SkillReportView";
import { migrateAppState } from "../hooks/useQuestState";
import "./SkillPage.css";

const API_BASE_URL = "http://localhost:3001";

export default function SkillPage({ appState }) {
  const navigate = useNavigate();
  const [reportText, setReportText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState("");
  const [suggestions, setSuggestions] = useState([]);

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

  async function handleSuggestNextTopics() {
    setSuggestLoading(true);
    setSuggestError("");
    setSuggestions([]);
    try {
      const res = await fetch(`${API_BASE_URL}/suggest-next-topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appState: migrateAppState(appState) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Could not get suggestions.");
      }
      const list = Array.isArray(data.suggestions) ? data.suggestions : [];
      if (list.length < 3) {
        throw new Error("The server returned fewer than 3 suggestions.");
      }
      setSuggestions(list.slice(0, 3));
    } catch (err) {
      setSuggestError(err.message || "Something went wrong.");
    } finally {
      setSuggestLoading(false);
    }
  }

  function handlePickSuggestedTopic(topic) {
    const trimmed = (topic || "").trim();
    if (!trimmed) return;
    setSuggestions([]);
    setSuggestError("");
    navigate("/quests", {
      state: {
        autoGenerateGoal: trimmed,
        autoGenId: crypto.randomUUID(),
      },
    });
  }

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
              <strong>One skill per quest topic</strong> — only when you finish
              the <em>entire</em> questline (every quest, every subtask). Two
              completed topics → two skills. Updates when you reload; the server
              merges your archive when you open this page.
            </p>
          </div>
        </div>
      </header>

      <section className="panel skill-report" aria-busy={loading}>
        <div className="skill-report__accent" aria-hidden />
        <div className="skill-report__head skill-report__head--split">
          <div className="skill-report__head-main">
            <span className="skill-report__badge">Archive snapshot</span>
            <h2 className="skill-report__title">What you&apos;ve achieved</h2>
            <p className="skill-report__sub">
              Saved to <code>progress-report.txt</code> when this loads. Partial
              progress on a topic does not appear until the whole run is done.
            </p>
          </div>
          <div className="skill-report__head-actions">
            <button
              type="button"
              className="btn-primary-gradient"
              onClick={handleSuggestNextTopics}
              disabled={loading || suggestLoading}
            >
              {suggestLoading ? "Asking AI…" : "Suggest what to learn next"}
            </button>
            <p className="skill-report__suggest-hint muted">
              Uses your quest goals &amp; titles → Perplexity suggests 3 next
              topics. Pick one to open Quests and auto-generate a questline.
            </p>
          </div>
        </div>

        {suggestError ? (
          <p className="skill-report__suggest-error" role="alert">
            {suggestError}
          </p>
        ) : null}

        {suggestions.length > 0 ? (
          <div className="skill-next-topics" aria-label="Suggested next topics">
            <p className="skill-next-topics__title">Pick a topic to start</p>
            <p className="skill-next-topics__lead muted">
              You&apos;ll go to Quests — we&apos;ll fill your goal and run{" "}
              <strong>Generate Quest</strong> for you.
            </p>
            <ul className="skill-next-topics__list">
              {suggestions.map((s, i) => (
                <li key={i}>
                  <button
                    type="button"
                    className="skill-next-topics__pick"
                    onClick={() => handlePickSuggestedTopic(s)}
                  >
                    <span className="skill-next-topics__pick-index">{i + 1}</span>
                    <span className="skill-next-topics__pick-text">{s}</span>
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="skill-next-topics__dismiss"
              onClick={() => setSuggestions([])}
            >
              Dismiss suggestions
            </button>
          </div>
        ) : null}

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

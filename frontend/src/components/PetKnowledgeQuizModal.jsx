import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { migrateAppState } from "../hooks/useQuestState";
import "./PetKnowledgeQuizModal.css";

const API_BASE_URL = "http://localhost:3001";

/** Need at least this many correct (out of 10) to earn 1 mineral. */
export const QUIZ_MINERALS_PASS_THRESHOLD = 6;

/**
 * Full-screen portal: fetch MCQ from backend, user answers, React grades; 6+/10 → +1 mineral.
 */
export default function PetKnowledgeQuizModal({
  open,
  onClose,
  appState,
  onAwardMineral,
}) {
  const [phase, setPhase] = useState("loading");
  const [error, setError] = useState("");
  const [topicsUsed, setTopicsUsed] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(null);
  const mineralAwardedRef = useRef(false);
  const appStateRef = useRef(appState);
  appStateRef.current = appState;

  const reset = useCallback(() => {
    setPhase("loading");
    setError("");
    setTopicsUsed([]);
    setQuestions([]);
    setAnswers({});
    setScore(null);
    mineralAwardedRef.current = false;
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }

    let cancelled = false;

    async function load() {
      setPhase("loading");
      setError("");
      try {
        const payload = migrateAppState(appStateRef.current);
        const res = await fetch(`${API_BASE_URL}/pet-knowledge-quiz`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appState: payload }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || "Could not load quiz.");
        }
        if (cancelled) return;
        const qs = Array.isArray(data.questions) ? data.questions : [];
        if (qs.length !== 10) {
          throw new Error("Invalid quiz from server.");
        }
        setQuestions(qs);
        setTopicsUsed(Array.isArray(data.topicsUsed) ? data.topicsUsed : []);
        setAnswers({});
        setScore(null);
        mineralAwardedRef.current = false;
        setPhase("quiz");
      } catch (e) {
        if (!cancelled) {
          setError(e.message || "Something went wrong.");
          setPhase("error");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [open, reset]);

  const pickAnswer = useCallback((qIndex, optionIndex) => {
    setAnswers((prev) => ({ ...prev, [qIndex]: optionIndex }));
  }, []);

  const submitQuiz = useCallback(() => {
    if (questions.length !== 10) return;
    let correct = 0;
    for (let i = 0; i < 10; i += 1) {
      if (answers[i] === questions[i].correctIndex) correct += 1;
    }
    setScore(correct);
    setPhase("results");
    if (correct >= QUIZ_MINERALS_PASS_THRESHOLD && !mineralAwardedRef.current) {
      mineralAwardedRef.current = true;
      onAwardMineral?.();
    }
  }, [questions, answers, onAwardMineral]);

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  if (!open) return null;

  const letters = ["A", "B", "C", "D"];
  const allAnswered = questions.length === 10 && [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].every((i) => answers[i] != null);

  return createPortal(
    <div className="pet-quiz-overlay" role="dialog" aria-modal="true" aria-labelledby="pet-quiz-title">
      <div className="pet-quiz-panel">
        <header className="pet-quiz-header">
          <h2 id="pet-quiz-title">Knowledge check</h2>
          <button
            type="button"
            className="pet-quiz-close"
            onClick={handleClose}
            aria-label="Close quiz"
          >
            ×
          </button>
        </header>

        {phase === "loading" ? (
          <p className="pet-quiz-status">Building your quiz from topics you&apos;ve learned…</p>
        ) : null}

        {phase === "error" ? (
          <div className="pet-quiz-error">
            <p>{error}</p>
            <button type="button" className="pet-quiz-retry" onClick={handleClose}>
              Close
            </button>
          </div>
        ) : null}

        {phase === "quiz" ? (
          <>
            <p className="pet-quiz-lead">
              10 questions from your saved quest goals &amp; titles.{" "}
              <strong>
                {QUIZ_MINERALS_PASS_THRESHOLD} or more correct
              </strong>{" "}
              earns <strong>1 mineral</strong>.
            </p>
            {topicsUsed.length > 0 ? (
              <p className="pet-quiz-topics muted">
                Topics: {topicsUsed.slice(0, 8).join(" · ")}
                {topicsUsed.length > 8 ? "…" : ""}
              </p>
            ) : null}
            <ol className="pet-quiz-list">
              {questions.map((q, qi) => (
                <li key={qi} className="pet-quiz-q">
                  <p className="pet-quiz-qtext">
                    <span className="pet-quiz-qnum">{qi + 1}.</span> {q.question}
                  </p>
                  <div className="pet-quiz-options" role="group" aria-label={`Question ${qi + 1}`}>
                    {q.options.map((opt, oi) => (
                      <label
                        key={oi}
                        className={`pet-quiz-option${answers[qi] === oi ? " pet-quiz-option--picked" : ""}`}
                      >
                        <input
                          type="radio"
                          name={`pet-q-${qi}`}
                          checked={answers[qi] === oi}
                          onChange={() => pickAnswer(qi, oi)}
                        />
                        <span className="pet-quiz-option-letter">{letters[oi]}</span>
                        <span className="pet-quiz-option-text">{opt}</span>
                      </label>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
            <div className="pet-quiz-footer">
              <button
                type="button"
                className="pet-quiz-submit"
                onClick={submitQuiz}
                disabled={!allAnswered}
              >
                Grade my answers
              </button>
              {!allAnswered ? (
                <span className="pet-quiz-footer-hint muted">Answer all 10 to submit.</span>
              ) : null}
            </div>
          </>
        ) : null}

        {phase === "results" && score != null ? (
          <div className="pet-quiz-results">
            <p className="pet-quiz-scoreline">
              You got <strong>{score}</strong> / 10 correct.
            </p>
            {score >= QUIZ_MINERALS_PASS_THRESHOLD ? (
              <p className="pet-quiz-win">
                Nice! You earned <strong>1 mineral</strong> — spend it on feeds or color moods below.
              </p>
            ) : (
              <p className="pet-quiz-lose muted">
                Need {QUIZ_MINERALS_PASS_THRESHOLD}+ correct for a mineral. Close and try again anytime.
              </p>
            )}
            <ol className="pet-quiz-review">
              {questions.map((q, qi) => {
                const picked = answers[qi];
                const ok = picked === q.correctIndex;
                return (
                  <li key={qi} className={`pet-quiz-review-item${ok ? " pet-quiz-review-item--ok" : " pet-quiz-review-item--bad"}`}>
                    <span className="pet-quiz-review-mark" aria-hidden>
                      {ok ? "✓" : "✗"}
                    </span>
                    <div>
                      <strong>{qi + 1}.</strong> {q.question}
                      <div className="pet-quiz-review-detail muted">
                        Your answer: {picked != null ? `${letters[picked]}. ${q.options[picked]}` : "—"}
                        {!ok ? (
                          <>
                            {" "}
                            · Correct: {letters[q.correctIndex]}. {q.options[q.correctIndex]}
                          </>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
            <button type="button" className="pet-quiz-done" onClick={handleClose}>
              Done
            </button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

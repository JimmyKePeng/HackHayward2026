import { useMemo } from "react";
import { formatDatePST } from "../utils/formatReportDatePST";
import { parseProgressReport } from "../utils/parseProgressReport";

/**
 * Renders progress-report text as headings, bullet lists, and quest cards.
 */
export default function SkillReportView({ reportText }) {
  const parsed = useMemo(
    () => parseProgressReport(reportText ?? ""),
    [reportText],
  );

  if (parsed.kind === "lines") {
    if (!parsed.lines.length) {
      return (
        <p className="skill-report__empty">
          No report content yet. Open this page after saving progress to generate
          your report.
        </p>
      );
    }
    return (
      <ul className="skill-report__bullet-list skill-report__bullet-list--plain">
        {parsed.lines.map((line, idx) => (
          <li key={idx}>{line}</li>
        ))}
      </ul>
    );
  }

  const {
    title,
    generated,
    intro,
    summary,
    runs,
    runsEmpty,
    runsSectionTitle,
  } = parsed.data;

  return (
    <article className="skill-report__article">
      {title ? <h3 className="skill-report__doc-title">{title}</h3> : null}

      {generated ? (
        <p className="skill-report__generated">
          <span className="skill-report__generated-label">Generated (Pacific)</span>
          <time dateTime={generated}>{formatDatePST(generated)}</time>
        </p>
      ) : null}

      {intro.map((p, idx) => (
        <p key={idx} className="skill-report__intro">
          {p}
        </p>
      ))}

      {summary.length > 0 ? (
        <section
          className="skill-report__section"
          aria-labelledby="skill-summary-heading"
        >
          <h3 id="skill-summary-heading" className="skill-report__section-heading">
            Summary
          </h3>
          <ul className="skill-report__bullet-list">
            {summary.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section
        className="skill-report__section"
        aria-labelledby="skill-runs-heading"
      >
        <h3 id="skill-runs-heading" className="skill-report__section-heading">
          {runsSectionTitle}
        </h3>
        {runsEmpty ? (
          <p className="skill-report__runs-empty">{runsEmpty}</p>
        ) : (
          <ul className="skill-report__run-cards">
            {runs.map((run) => (
              <li key={`${run.index}-${run.title}`} className="skill-report__run-cards-item">
                <details className="skill-report__run-card">
                  <summary className="skill-report__run-summary">
                    <span className="skill-report__run-index" aria-hidden>
                      {run.index}.
                    </span>
                    <span className="skill-report__run-topic">{run.title}</span>
                  </summary>
                  <div className="skill-report__run-body">
                    <ul className="skill-report__run-meta">
                      {run.fields.map((f) => (
                        <li key={f.label}>
                          <span className="skill-report__meta-label">{f.label}</span>
                          <span className="skill-report__meta-value">
                            {f.label === "Created"
                              ? formatDatePST(f.value)
                              : f.value}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {run.notes.length > 0 ? (
                      <ul
                        className="skill-report__run-notes"
                        aria-label="Status notes"
                      >
                        {run.notes.map((n, idx) => (
                          <li key={idx}>{n}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}

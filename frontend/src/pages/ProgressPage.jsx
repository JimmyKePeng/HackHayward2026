import ProgressPanel from "../components/ProgressPanel";

export default function ProgressPage({
  rockAnchorRef,
  totalXP,
  rockScale,
  onGetReport,
  reportLoading,
}) {
  return (
    <>
      <header className="hero hero--page hero--compact">
        <h1>Progress</h1>
        <p>XP, rarity tier, and where your blob pet parks before you drag it.</p>
      </header>

      <section className="dashboard-grid dashboard-grid--single">
        <ProgressPanel
          totalXP={totalXP}
          rockScale={rockScale}
          rockAnchorRef={rockAnchorRef}
        />
      </section>

      <section className="panel panel--report-cta">
        <h2>Progress report</h2>
        <p className="muted quest-panel-sub">
          Saves a text file on the server and opens a full-screen reader (quest
          history, including removed quests).
        </p>
        <button
          type="button"
          className="report-cta"
          onClick={onGetReport}
          disabled={reportLoading}
          title="Save progress-report.txt and view it"
        >
          <span className="report-cta__glow" aria-hidden />
          <span className="report-cta__icon" aria-hidden>
            📜
          </span>
          <span className="report-cta__label">
            {reportLoading ? "Opening report…" : "Get Report"}
          </span>
          <span className="report-cta__hint">
            {reportLoading ? "Please wait" : "View archive · .txt export"}
          </span>
        </button>
      </section>
    </>
  );
}

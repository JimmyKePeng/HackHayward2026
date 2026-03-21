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

      <section className="panel">
        <h2>Progress report</h2>
        <p className="muted quest-panel-sub">
          Saves a text file on the server and shows it in a modal (full quest
          history, including removed quests).
        </p>
        <button
          type="button"
          onClick={onGetReport}
          disabled={reportLoading}
          title="Save progress-report.txt and view it"
        >
          {reportLoading ? "Loading…" : "Get Report"}
        </button>
      </section>
    </>
  );
}

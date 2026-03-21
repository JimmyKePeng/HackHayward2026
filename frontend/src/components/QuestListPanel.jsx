function formatWhen(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function QuestListPanel({ questHistory, activeQuestRunId, onSelectQuestRun }) {
  const sorted = [...questHistory].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  return (
    <div className="panel">
      <h2>Quest</h2>
      <p className="muted quest-panel-sub">
        Each time you generate, a new quest is added here. Click one to open it below.
      </p>
      {sorted.length === 0 ? (
        <p className="muted">No quests yet. Generate one to get started.</p>
      ) : (
        <ul className="quest-history-list">
          {sorted.map((run) => {
            const title = run.questline?.quest_title || "Untitled quest";
            const selected = run.id === activeQuestRunId;
            return (
              <li key={run.id}>
                <button
                  type="button"
                  className={`quest-history-item${selected ? " selected" : ""}`}
                  onClick={() => onSelectQuestRun(run.id)}
                >
                  <span className="quest-history-title">{title}</span>
                  <span className="quest-history-meta">
                    {run.userGoal ? `${run.userGoal.slice(0, 48)}${run.userGoal.length > 48 ? "…" : ""}` : "—"}
                    {run.createdAt ? ` · ${formatWhen(run.createdAt)}` : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default QuestListPanel;

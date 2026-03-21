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

function QuestListPanel({
  questHistory,
  activeQuestRunId,
  onSelectQuestRun,
  onDeleteQuestRun,
  onRegenerateQuestRun,
  regeneratingRunId,
}) {
  const sorted = [...questHistory].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  return (
    <div className="panel">
      <h2>Quest</h2>
      <p className="muted quest-panel-sub">
        Each time you generate, a new quest is added here. Click one to open it below.
        Use <strong>↻</strong> to regenerate with the <strong>same goal &amp; theme</strong> (new
        AI questline).
      </p>
      {sorted.length === 0 ? (
        <p className="muted">No quests yet. Generate one to get started.</p>
      ) : (
        <ul className="quest-history-list">
          {sorted.map((run) => {
            const title = run.questline?.quest_title || "Untitled quest";
            const selected = run.id === activeQuestRunId;
            return (
              <li key={run.id} className="quest-history-row">
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
                <button
                  type="button"
                  className="quest-history-regenerate"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRegenerateQuestRun(run.id);
                  }}
                  disabled={regeneratingRunId === run.id}
                  aria-label={`Regenerate quest with same goal and theme: ${title}`}
                  title="Regenerate questline (same goal & theme) via AI"
                >
                  {regeneratingRunId === run.id ? "…" : "↻"}
                </button>
                <button
                  type="button"
                  className="quest-history-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteQuestRun(run.id);
                  }}
                  aria-label={`Delete quest: ${title}`}
                  title="Remove this quest from the list"
                >
                  ×
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

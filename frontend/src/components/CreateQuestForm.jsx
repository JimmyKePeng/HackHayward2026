function CreateQuestForm({
  goal,
  theme,
  loading,
  reportLoading,
  onGoalChange,
  onThemeChange,
  onGenerate,
  onReset,
  onGetReport,
  onUncheckAll,
  onCheckAll,
  canBulkToggleQuests,
}) {
  return (
    <form onSubmit={onGenerate} className="form">
      <label>
        Goal
        <textarea
          value={goal}
          onChange={(e) => onGoalChange(e.target.value)}
          placeholder="Example: I want to stop procrastinating on homework"
          rows={4}
          required
        />
      </label>

      <label>
        Theme
        <select value={theme} onChange={(e) => onThemeChange(e.target.value)}>
          <option value="fantasy">Fantasy</option>
          <option value="sci-fi">Sci-Fi</option>
          <option value="adventure">Adventure</option>
        </select>
      </label>

      <div className="button-row button-row--wrap">
        <button type="submit" disabled={loading}>
          {loading ? "Generating..." : "Generate Quest"}
        </button>

        <button type="button" className="secondary" onClick={onReset}>
          Reset Everything
        </button>

        <button
          type="button"
          className="secondary"
          onClick={onGetReport}
          disabled={reportLoading}
          title="Save a text report on the server and view it here"
        >
          {reportLoading ? "Loading…" : "Get Report"}
        </button>

        <button
          type="button"
          className="secondary"
          onClick={onUncheckAll}
          disabled={!canBulkToggleQuests}
          title="Uncheck all tasks in the active quest"
        >
          Uncheck all
        </button>

        <button
          type="button"
          className="secondary"
          onClick={onCheckAll}
          disabled={!canBulkToggleQuests}
          title="Check all tasks in the active quest"
        >
          Check all
        </button>
      </div>
    </form>
  );
}

export default CreateQuestForm;

function CreateQuestForm({
  goal,
  theme,
  loading,
  onGoalChange,
  onThemeChange,
  onGenerate,
  onReset,
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

      <div className="button-row">
        <button type="submit" disabled={loading}>
          {loading ? "Generating..." : "Generate Quest"}
        </button>

        <button type="button" className="secondary" onClick={onReset}>
          Reset Everything
        </button>
      </div>
    </form>
  );
}

export default CreateQuestForm;

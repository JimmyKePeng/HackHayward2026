import CreateQuestForm from "../components/CreateQuestForm";
import QuestListPanel from "../components/QuestListPanel";
import QuestlinePanel from "../components/QuestlinePanel";

export default function QuestsPage({
  goal,
  theme,
  loading,
  error,
  onGoalChange,
  onThemeChange,
  onGenerate,
  onReset,
  onUncheckAll,
  onCheckAll,
  canBulkToggleQuests,
  questHistory,
  activeQuestRunId,
  activeQuestRun,
  onSelectQuestRun,
  onDeleteQuestRun,
  onRegenerateQuestRun,
  regeneratingRunId,
  onToggleSubquest,
  onDeleteQuestInActiveRun,
}) {
  function handleResetClick() {
    const ok = window.confirm(
      "Reset everything? This clears all quests, XP, pet progress, and saved data on this device and the server. This cannot be undone.",
    );
    if (!ok) return;
    void onReset();
  }

  return (
    <>
      <header className="hero hero--page hero--compact">
        <h1>Quests</h1>
        <p>Generate a questline, pick a run, and check off tasks for XP.</p>
      </header>

      <section className="panel">
        <h2>Create your quest</h2>
        <CreateQuestForm
          goal={goal}
          theme={theme}
          loading={loading}
          onGoalChange={onGoalChange}
          onThemeChange={onThemeChange}
          onGenerate={onGenerate}
          onUncheckAll={onUncheckAll}
          onCheckAll={onCheckAll}
          canBulkToggleQuests={canBulkToggleQuests}
        />
        {error && <p className="error">{error}</p>}
      </section>

      <section className="dashboard-grid dashboard-grid--single">
        <QuestListPanel
          questHistory={questHistory}
          activeQuestRunId={activeQuestRunId}
          onSelectQuestRun={onSelectQuestRun}
          onDeleteQuestRun={onDeleteQuestRun}
          onRegenerateQuestRun={onRegenerateQuestRun}
          regeneratingRunId={regeneratingRunId}
        />
      </section>

      <QuestlinePanel
        key={activeQuestRunId ?? "none"}
        activeQuestRun={activeQuestRun}
        onToggleSubquest={onToggleSubquest}
        onDeleteQuest={onDeleteQuestInActiveRun}
      />

      <section
        className="quest-page__reset-section panel"
        aria-labelledby="quests-reset-heading"
      >
        <h2 id="quests-reset-heading" className="sr-only">
          Reset progress
        </h2>
        <p className="quest-page__reset-lead">
          Start over from scratch — removes all quest runs, XP, and pet data
          saved here and on the server.
        </p>
        <button
          type="button"
          className="secondary quest-page__reset-btn"
          onClick={handleResetClick}
        >
          Reset Everything
        </button>
      </section>
    </>
  );
}

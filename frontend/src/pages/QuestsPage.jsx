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
  onToggleSubquest,
  onDeleteQuestInActiveRun,
}) {
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
          onReset={onReset}
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
        />
      </section>

      <QuestlinePanel
        key={activeQuestRunId ?? "none"}
        activeQuestRun={activeQuestRun}
        onToggleSubquest={onToggleSubquest}
        onDeleteQuest={onDeleteQuestInActiveRun}
      />
    </>
  );
}

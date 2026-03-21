import { useRef, useState } from "react";
import CreateQuestForm from "./components/CreateQuestForm";
import QuestListPanel from "./components/QuestListPanel";
import ProgressPanel from "./components/ProgressPanel";
import QuestlinePanel from "./components/QuestlinePanel";
import PetRockFixed from "./components/PetRockFixed";
import { migrateAppState, useQuestState } from "./hooks/useQuestState";

function App() {
  const rockAnchorRef = useRef(null);
  const [goal, setGoal] = useState("");
  const [theme, setTheme] = useState("fantasy");
  const {
    loading,
    error,
    setError,
    setAppState,
    setLoading,
    handleToggleSubquest,
    handleUncheckAllInActiveRun,
    handleCheckAllInActiveRun,
    handleDeleteQuestRun,
    handleDeleteQuestInActiveRun,
    clearStoredState,
    questHistory,
    activeQuestRunId,
    activeQuestRun,
    setActiveQuestRunId,
    totalXP,
    rockScale,
  } = useQuestState();

  async function handleGenerate(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:3001/generate-quest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ goal, theme }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate quest.");
      }

      const newRun = {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        userGoal: goal,
        theme,
        questline: data.questline,
      };

      setAppState((prev) => {
        const migrated = prev
          ? migrateAppState(prev)
          : { totalXP: 0, questHistory: [], activeQuestRunId: null };
        const previousXP = migrated.totalXP ?? 0;
        return {
          totalXP: previousXP,
          questHistory: [...(migrated.questHistory ?? []), newRun],
          activeQuestRunId: newRun.id,
        };
      });
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    await clearStoredState();
    setAppState(null);
    setGoal("");
    setTheme("fantasy");
    setError("");
  }

  return (
    <div className="app-shell">
      <PetRockFixed
        totalXP={totalXP}
        rockScale={rockScale}
        anchorRef={rockAnchorRef}
      />
      <div className="container">
        <header className="hero">
          <h1>Gamified Self-Help Quest App</h1>
          <p>Turn one real goal into quests, XP, and a growing pet rock.</p>
        </header>

        <section className="panel">
          <h2>Create Your Quest</h2>
          <CreateQuestForm
            goal={goal}
            theme={theme}
            loading={loading}
            onGoalChange={setGoal}
            onThemeChange={setTheme}
            onGenerate={handleGenerate}
            onReset={handleReset}
            onUncheckAll={handleUncheckAllInActiveRun}
            onCheckAll={handleCheckAllInActiveRun}
            canBulkToggleQuests={Boolean(
              activeQuestRun?.questline?.quests?.some((q) => q.subquests?.length)
            )}
          />
          {error && <p className="error">{error}</p>}
        </section>

        <section className="dashboard-grid">
          <ProgressPanel
            totalXP={totalXP}
            rockScale={rockScale}
            rockAnchorRef={rockAnchorRef}
          />
          <QuestListPanel
            questHistory={questHistory}
            activeQuestRunId={activeQuestRunId}
            onSelectQuestRun={setActiveQuestRunId}
            onDeleteQuestRun={handleDeleteQuestRun}
          />
        </section>

        <QuestlinePanel
          key={activeQuestRunId ?? "none"}
          activeQuestRun={activeQuestRun}
          onToggleSubquest={handleToggleSubquest}
          onDeleteQuest={handleDeleteQuestInActiveRun}
        />
      </div>
    </div>
  );
}

export default App;

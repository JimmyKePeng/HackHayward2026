import { useRef, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import PetRockFixed from "./components/PetRockFixed";
import { ProgressReportModal } from "./components/ProgressReportModal";
import HomePage from "./pages/HomePage";
import QuestsPage from "./pages/QuestsPage";
import ProgressPage from "./pages/ProgressPage";
import { migrateAppState, useQuestState } from "./hooks/useQuestState";

const API_BASE_URL = "http://localhost:3001";

function AppRoutes() {
  const rockAnchorRef = useRef(null);
  const location = useLocation();
  const [goal, setGoal] = useState("");
  const [theme, setTheme] = useState("fantasy");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");
  const [regeneratingRunId, setRegeneratingRunId] = useState(null);
  const {
    appState,
    loading,
    error,
    setError,
    setAppState,
    setLoading,
    handleToggleSubquest,
    handleUncheckAllInActiveRun,
    handleCheckAllInActiveRun,
    handleDeleteQuestRun,
    replaceQuestRunQuestline,
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
      const res = await fetch(`${API_BASE_URL}/generate-quest`, {
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

  async function handleRegenerateQuest(runId) {
    const run = questHistory.find((r) => r.id === runId);
    if (!run) return;
    const goal = (run.userGoal || "").trim();
    const theme = run.theme || "fantasy";
    if (!goal) {
      setError("This quest has no saved goal — add one or create a new quest.");
      return;
    }
    setRegeneratingRunId(runId);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/regenerate-quest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, theme }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to regenerate quest.");
      }
      if (!data.questline) {
        throw new Error("Invalid response from server.");
      }
      replaceQuestRunQuestline(runId, data.questline);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setRegeneratingRunId(null);
    }
  }

  async function handleGetReport() {
    setReportError("");
    setReportText("");
    setReportOpen(true);
    setReportLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/progress-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appState: migrateAppState(appState) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate progress report.");
      }
      setReportText(data.report ?? "");
    } catch (err) {
      setReportError(err.message || "Something went wrong.");
    } finally {
      setReportLoading(false);
    }
  }

  const showOffscreenAnchor = location.pathname !== "/progress";

  return (
    <div className="app-shell">
      <PetRockFixed
        key={location.pathname}
        totalXP={totalXP}
        rockScale={rockScale}
        anchorRef={rockAnchorRef}
      />

      <nav className="app-nav" aria-label="Main">
        <span className="app-nav__brand">Quest App</span>
        <div className="app-nav__links">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `app-nav__link${isActive ? " app-nav__link--active" : ""}`
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/quests"
            className={({ isActive }) =>
              `app-nav__link${isActive ? " app-nav__link--active" : ""}`
            }
          >
            Quests
          </NavLink>
          <NavLink
            to="/progress"
            className={({ isActive }) =>
              `app-nav__link${isActive ? " app-nav__link--active" : ""}`
            }
          >
            Progress
          </NavLink>
        </div>
      </nav>

      {showOffscreenAnchor ? (
        <div
          ref={rockAnchorRef}
          className="pet-rock-anchor pet-rock-anchor--offscreen"
          aria-hidden
        />
      ) : null}

      <div className="container">
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                totalXP={totalXP}
                rockScale={rockScale}
                questCount={questHistory.length}
                activeQuestRun={activeQuestRun}
                onToggleSubquest={handleToggleSubquest}
              />
            }
          />
          <Route
            path="/quests"
            element={
              <QuestsPage
                goal={goal}
                theme={theme}
                loading={loading}
                error={error}
                onGoalChange={setGoal}
                onThemeChange={setTheme}
                onGenerate={handleGenerate}
                onReset={handleReset}
                onUncheckAll={handleUncheckAllInActiveRun}
                onCheckAll={handleCheckAllInActiveRun}
                canBulkToggleQuests={Boolean(
                  activeQuestRun?.questline?.quests?.some((q) =>
                    q.subquests?.length,
                  ),
                )}
                questHistory={questHistory}
                activeQuestRunId={activeQuestRunId}
                activeQuestRun={activeQuestRun}
                onSelectQuestRun={setActiveQuestRunId}
                onDeleteQuestRun={handleDeleteQuestRun}
                onRegenerateQuestRun={handleRegenerateQuest}
                regeneratingRunId={regeneratingRunId}
                onToggleSubquest={handleToggleSubquest}
                onDeleteQuestInActiveRun={handleDeleteQuestInActiveRun}
              />
            }
          />
          <Route
            path="/progress"
            element={
              <ProgressPage
                rockAnchorRef={rockAnchorRef}
                totalXP={totalXP}
                rockScale={rockScale}
                onGetReport={handleGetReport}
                reportLoading={reportLoading}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      <ProgressReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        reportText={reportText}
        loading={reportLoading}
        error={reportError}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

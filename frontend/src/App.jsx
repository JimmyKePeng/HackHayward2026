import { useEffect, useRef, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import PetRockFixed from "./components/PetRockFixed";
import HomePage from "./pages/HomePage";
import PetPage from "./pages/PetPage";
import QuestsPage from "./pages/QuestsPage";
import SkillPage from "./pages/SkillPage";
import {
  migrateAppState,
  normalizePetName,
  useQuestState,
} from "./hooks/useQuestState";

const API_BASE_URL = "http://localhost:3001";

function AppRoutes() {
  const rockAnchorRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const processedAutoGenIds = useRef(new Set());
  const [goal, setGoal] = useState("");
  const [theme, setTheme] = useState("fantasy");
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
    petName,
    setPetName,
    petTintIndex,
    petUnlockedTints,
    petFeedCount,
    petMineralBalance,
    feedPetMineral,
    unlockPetTint,
    setPetTintIndex,
    awardQuizMineral,
  } = useQuestState();

  async function generateQuestForGoal(goalText, themeVal) {
    const g = (goalText || "").trim();
    const tTheme = themeVal || "fantasy";
    if (!g) return;

    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/generate-quest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ goal: g, theme: tTheme }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate quest.");
      }

      const newRun = {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        userGoal: g,
        theme: tTheme,
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
          petName: normalizePetName(migrated?.petName),
          petMineralBalance: migrated.petMineralBalance ?? 0,
          petTintIndex: migrated.petTintIndex ?? 0,
          petUnlockedTints: migrated.petUnlockedTints ?? [0],
          petFeedCount: migrated.petFeedCount ?? 0,
        };
      });
      setGoal("");
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleGenerate(e) {
    e.preventDefault();
    void generateQuestForGoal(goal, theme);
  }

  /** Skill page: pick AI topic → land on Quests with goal filled + quest generated */
  useEffect(() => {
    const topic = location.state?.autoGenerateGoal;
    const id = location.state?.autoGenId;
    if (typeof topic !== "string" || !topic.trim()) return;
    if (typeof id !== "string" || !id) return;
    if (processedAutoGenIds.current.has(id)) return;
    processedAutoGenIds.current.add(id);

    const trimmed = topic.trim();
    navigate("/quests", { replace: true, state: {} });
    setGoal(trimmed);
    void generateQuestForGoal(trimmed, theme);
    // generateQuestForGoal is stable enough for this flow; listing it would retrigger needlessly.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot navigation payload only
  }, [location.state, navigate, theme]);

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

  return (
    <div className="app-shell">
      <PetRockFixed
        key={location.pathname}
        totalXP={totalXP}
        rockScale={rockScale}
        petName={petName}
        petTintIndex={petTintIndex}
        anchorRef={rockAnchorRef}
      />

      <nav className="app-nav" aria-label="Main">
        <span className="app-nav__brand" title="Questify">
          <span className="app-nav__brand-mark" aria-hidden>
            ✦
          </span>
          <span className="app-nav__brand-word">
            <span className="app-nav__brand-quest">Quest</span>
            <span className="app-nav__brand-ify">ify</span>
          </span>
        </span>
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
            to="/pet"
            className={({ isActive }) =>
              `app-nav__link${isActive ? " app-nav__link--active" : ""}`
            }
          >
            Pet
          </NavLink>
          <NavLink
            to="/skill"
            className={({ isActive }) =>
              `app-nav__link${isActive ? " app-nav__link--active" : ""}`
            }
          >
            Skill
          </NavLink>
        </div>
      </nav>

      <div
        ref={rockAnchorRef}
        className="pet-rock-anchor pet-rock-anchor--offscreen"
        aria-hidden
      />

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
                petName={petName}
                onPetNameChange={setPetName}
                petTintIndex={petTintIndex}
              />
            }
          />
          <Route
            path="/pet"
            element={
              <PetPage
                totalXP={totalXP}
                rockScale={rockScale}
                petName={petName}
                petTintIndex={petTintIndex}
                petMineralBalance={petMineralBalance}
                petUnlockedTints={petUnlockedTints}
                petFeedCount={petFeedCount}
                appState={appState}
                onFeedPetMineral={feedPetMineral}
                onUnlockPetTint={unlockPetTint}
                onSelectPetTint={setPetTintIndex}
                onAwardQuizMineral={awardQuizMineral}
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
          <Route path="/progress" element={<Navigate to="/" replace />} />
          <Route
            path="/skill"
            element={<SkillPage appState={appState} />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
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

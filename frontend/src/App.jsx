import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "quest-app-state";

function App() {
  const [goal, setGoal] = useState("");
  const [theme, setTheme] = useState("fantasy");
  const [appState, setAppState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setAppState(JSON.parse(saved));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    if (appState) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    }
  }, [appState]);

  const totalXP = appState?.totalXP || 0;
  const rockScale = 1 + totalXP / 100;

  const todaysObjectives = useMemo(() => {
    if (!appState?.questline?.quests) return [];
    return appState.questline.quests
      .flatMap((quest) =>
        quest.subquests
          .filter((subquest) => !subquest.completed)
          .map((subquest) => ({
            ...subquest,
            questTitle: quest.title,
          }))
      )
      .slice(0, 5);
  }, [appState]);

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

      setAppState(data);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleToggleSubquest(questId, subquestId) {
    setAppState((prev) => {
      if (!prev) return prev;

      const next = structuredClone(prev);

      for (const quest of next.questline.quests) {
        if (quest.id !== questId) continue;

        for (const subquest of quest.subquests) {
          if (subquest.id !== subquestId) continue;

          if (!subquest.completed) {
            subquest.completed = true;
            next.totalXP += subquest.xp;
          } else {
            subquest.completed = false;
            next.totalXP -= subquest.xp;
          }
        }

        quest.completed = quest.subquests.every((sq) => sq.completed);
      }

      return next;
    });
  }

  function handleReset() {
    localStorage.removeItem(STORAGE_KEY);
    setAppState(null);
    setGoal("");
    setTheme("fantasy");
    setError("");
  }

  return (
    <div className="app-shell">
      <div className="container">
        <header className="hero">
          <h1>Gamified Self-Help Quest App</h1>
          <p>Turn one real goal into quests, XP, and a growing pet rock.</p>
        </header>

        <section className="panel">
          <h2>Create Your Quest</h2>
          <form onSubmit={handleGenerate} className="form">
            <label>
              Goal
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Example: I want to stop procrastinating on homework"
                rows={4}
                required
              />
            </label>

            <label>
              Theme
              <select value={theme} onChange={(e) => setTheme(e.target.value)}>
                <option value="fantasy">Fantasy</option>
                <option value="sci-fi">Sci-Fi</option>
                <option value="adventure">Adventure</option>
              </select>
            </label>

            <div className="button-row">
              <button type="submit" disabled={loading}>
                {loading ? "Generating..." : "Generate Quest"}
              </button>

              <button type="button" className="secondary" onClick={handleReset}>
                Reset
              </button>
            </div>
          </form>

          {error && <p className="error">{error}</p>}
        </section>

        <section className="dashboard-grid">
          <div className="panel">
            <h2>Progress</h2>
            <p><strong>Total XP:</strong> {totalXP}</p>
            <div className="rock-area">
              <div
                className="rock"
                style={{ transform: `scale(${rockScale})` }}
                title="Pet Rock"
              />
            </div>
            <p className="muted">Your rock grows as XP increases.</p>
          </div>

          <div className="panel">
            <h2>Today's Objectives</h2>
            {todaysObjectives.length === 0 ? (
              <p className="muted">No active tasks yet.</p>
            ) : (
              <ul className="objective-list">
                {todaysObjectives.map((task) => (
                  <li key={task.id}>
                    <strong>{task.title}</strong>
                    <span>{task.questTitle}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="panel">
          <h2>Questline</h2>

          {!appState?.questline ? (
            <p className="muted">Generate a quest to begin.</p>
          ) : (
            <>
              <p className="quest-title">{appState.questline.quest_title}</p>

              <div className="quest-list">
                {appState.questline.quests.map((quest) => (
                  <div key={quest.id} className="quest-card">
                    <div className="quest-header">
                      <h3>{quest.title}</h3>
                      <span className="badge">{quest.difficulty}</span>
                    </div>

                    <ul className="subquest-list">
                      {quest.subquests.map((subquest) => (
                        <li key={subquest.id} className="subquest-item">
                          <label>
                            <input
                              type="checkbox"
                              checked={subquest.completed}
                              onChange={() =>
                                handleToggleSubquest(quest.id, subquest.id)
                              }
                            />
                            <span>
                              {subquest.title} (+{subquest.xp} XP)
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;
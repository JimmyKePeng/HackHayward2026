import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "quest-app-state";
const API_BASE_URL = "http://localhost:3001";

export function useQuestState() {
  const [appState, setAppState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;

    try {
      return JSON.parse(saved);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadFromBackend() {
      try {
        const res = await fetch(`${API_BASE_URL}/progress`);
        if (!res.ok) return;

        const data = await res.json();
        if (isMounted && data?.appState) {
          setAppState(data.appState);
        }
      } catch {
        // Backend persistence is best-effort; local storage still works.
      } finally {
        if (isMounted) setHydrated(true);
      }
    }

    loadFromBackend();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const persist = async () => {
      if (!appState) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));

      try {
        await fetch(`${API_BASE_URL}/progress`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ appState }),
        });
      } catch {
        // Ignore backend save failures during local-only usage.
      }
    };

    persist();
  }, [appState, hydrated]);

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

  async function clearStoredState() {
    localStorage.removeItem(STORAGE_KEY);
    try {
      await fetch(`${API_BASE_URL}/progress`, { method: "DELETE" });
    } catch {
      // Ignore backend reset failures.
    }
  }

  return {
    appState,
    loading,
    error,
    setError,
    setAppState,
    setLoading,
    handleToggleSubquest,
    clearStoredState,
    todaysObjectives,
    totalXP,
    rockScale,
  };
}

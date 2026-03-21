import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "quest-app-state";
const API_BASE_URL = "http://localhost:3001";
const EMPTY_QUEST_HISTORY = [];

export function migrateAppState(raw) {
  if (!raw || typeof raw !== "object") return null;

  if (Array.isArray(raw.questHistory) && raw.questHistory.length > 0) {
    return {
      totalXP: raw.totalXP ?? 0,
      questHistory: raw.questHistory,
      activeQuestRunId:
        raw.activeQuestRunId ??
        raw.questHistory[raw.questHistory.length - 1]?.id ??
        null,
    };
  }

  if (raw.questline?.quests?.length) {
    const id = `migrated-${Date.now()}`;
    return {
      totalXP: raw.totalXP ?? 0,
      questHistory: [
        {
          id,
          createdAt: Date.now(),
          userGoal: raw.userGoal ?? "",
          theme: raw.theme ?? "fantasy",
          questline: raw.questline,
        },
      ],
      activeQuestRunId: id,
    };
  }

  return {
    totalXP: raw.totalXP ?? 0,
    questHistory: [],
    activeQuestRunId: null,
  };
}

export function useQuestState() {
  const [appState, setAppState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    try {
      return migrateAppState(JSON.parse(saved));
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
          setAppState(migrateAppState(data.appState));
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

  const questHistory = appState?.questHistory ?? EMPTY_QUEST_HISTORY;
  const activeQuestRunId = appState?.activeQuestRunId ?? null;

  const activeQuestRun = useMemo(() => {
    if (!activeQuestRunId || !questHistory.length) return null;
    return questHistory.find((r) => r.id === activeQuestRunId) ?? null;
  }, [questHistory, activeQuestRunId]);

  const setActiveQuestRunId = useCallback((id) => {
    setAppState((prev) => {
      if (!prev) return prev;
      return { ...prev, activeQuestRunId: id };
    });
  }, []);

  function handleToggleSubquest(questId, subquestId) {
    setAppState((prev) => {
      if (!prev?.activeQuestRunId) return prev;

      const next = structuredClone(prev);
      const run = next.questHistory.find((r) => r.id === next.activeQuestRunId);
      if (!run?.questline?.quests) return prev;

      for (const quest of run.questline.quests) {
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

  function handleUncheckAllInActiveRun() {
    setAppState((prev) => {
      if (!prev?.activeQuestRunId) return prev;

      const next = structuredClone(prev);
      const run = next.questHistory.find((r) => r.id === next.activeQuestRunId);
      if (!run?.questline?.quests) return prev;

      for (const quest of run.questline.quests) {
        for (const subquest of quest.subquests) {
          if (subquest.completed) {
            subquest.completed = false;
            next.totalXP -= subquest.xp;
          }
        }
        quest.completed = false;
      }

      return next;
    });
  }

  function handleCheckAllInActiveRun() {
    setAppState((prev) => {
      if (!prev?.activeQuestRunId) return prev;

      const next = structuredClone(prev);
      const run = next.questHistory.find((r) => r.id === next.activeQuestRunId);
      if (!run?.questline?.quests) return prev;

      for (const quest of run.questline.quests) {
        for (const subquest of quest.subquests) {
          if (!subquest.completed) {
            subquest.completed = true;
            next.totalXP += subquest.xp;
          }
        }
        quest.completed = quest.subquests.every((sq) => sq.completed);
      }

      return next;
    });
  }

  /** Remove a saved quest run from history; subtract XP earned from its completed tasks. */
  function handleDeleteQuestRun(runId) {
    setAppState((prev) => {
      if (!prev) return prev;

      const run = prev.questHistory.find((r) => r.id === runId);
      if (!run) return prev;

      const next = structuredClone(prev);

      for (const quest of run.questline.quests ?? []) {
        for (const subquest of quest.subquests ?? []) {
          if (subquest.completed) {
            next.totalXP -= subquest.xp;
          }
        }
      }
      next.totalXP = Math.max(0, next.totalXP);

      next.questHistory = next.questHistory.filter((r) => r.id !== runId);

      if (next.activeQuestRunId === runId) {
        next.activeQuestRunId =
          next.questHistory[next.questHistory.length - 1]?.id ?? null;
      }

      return next;
    });
  }

  /** Remove one quest from the active questline; subtract XP from its completed subquests. */
  function handleDeleteQuestInActiveRun(questId) {
    setAppState((prev) => {
      if (!prev?.activeQuestRunId) return prev;

      const next = structuredClone(prev);
      const run = next.questHistory.find((r) => r.id === next.activeQuestRunId);
      if (!run?.questline?.quests) return prev;

      const quest = run.questline.quests.find((q) => q.id === questId);
      if (!quest) return prev;

      for (const subquest of quest.subquests) {
        if (subquest.completed) {
          next.totalXP -= subquest.xp;
        }
      }
      next.totalXP = Math.max(0, next.totalXP);

      run.questline.quests = run.questline.quests.filter((q) => q.id !== questId);

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
  };
}

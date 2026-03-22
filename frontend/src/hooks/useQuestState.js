import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "quest-app-state";
const API_BASE_URL = "http://localhost:3001";
const EMPTY_QUEST_HISTORY = [];

/** XP value for a subquest (avoids NaN when `xp` is missing). */
export function subquestXpValue(sub) {
  const n = Number(sub?.xp);
  return Number.isFinite(n) && n >= 0 ? n : 5;
}

export const PET_CELEBRATE_TASK_EVENT = "pet-celebrate-task";

/** Default label for the draggable pet (caption, accessibility, quip fallback). */
export const DEFAULT_PET_NAME = "Blob pet";

/** Trim, cap length, fall back to default if empty. */
export function normalizePetName(raw) {
  if (typeof raw !== "string") return DEFAULT_PET_NAME;
  const t = raw.trim().slice(0, 32);
  return t.length > 0 ? t : DEFAULT_PET_NAME;
}

export function migrateAppState(raw) {
  if (!raw || typeof raw !== "object") return null;

  const petName = normalizePetName(raw.petName);

  if (Array.isArray(raw.questHistory) && raw.questHistory.length > 0) {
    return {
      totalXP: raw.totalXP ?? 0,
      questHistory: raw.questHistory,
      activeQuestRunId:
        raw.activeQuestRunId ??
        raw.questHistory[raw.questHistory.length - 1]?.id ??
        null,
      petName,
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
      petName,
    };
  }

  return {
    totalXP: raw.totalXP ?? 0,
    questHistory: [],
    activeQuestRunId: null,
    petName,
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

  const petName = useMemo(
    () => normalizePetName(appState?.petName),
    [appState?.petName],
  );

  const setPetName = useCallback((name) => {
    setAppState((prev) => {
      const normalized = normalizePetName(
        typeof name === "string" ? name : DEFAULT_PET_NAME,
      );
      if (!prev) {
        return {
          totalXP: 0,
          questHistory: [],
          activeQuestRunId: null,
          petName: normalized,
        };
      }
      return { ...prev, petName: normalized };
    });
  }, []);

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
    let xpGained = 0;
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
            const add = subquestXpValue(subquest);
            next.totalXP += add;
            xpGained = add;
          } else {
            subquest.completed = false;
            next.totalXP -= subquestXpValue(subquest);
          }
        }

        quest.completed = quest.subquests.every((sq) => sq.completed);
      }

      return next;
    });
    if (xpGained > 0) {
      queueMicrotask(() => {
        window.dispatchEvent(
          new CustomEvent(PET_CELEBRATE_TASK_EVENT, {
            detail: { xp: xpGained },
          }),
        );
      });
    }
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
            next.totalXP -= subquestXpValue(subquest);
          }
        }
        quest.completed = false;
      }

      return next;
    });
  }

  function handleCheckAllInActiveRun() {
    let bulkXp = 0;
    setAppState((prev) => {
      if (!prev?.activeQuestRunId) return prev;

      const next = structuredClone(prev);
      const run = next.questHistory.find((r) => r.id === next.activeQuestRunId);
      if (!run?.questline?.quests) return prev;

      for (const quest of run.questline.quests) {
        for (const subquest of quest.subquests) {
          if (!subquest.completed) {
            subquest.completed = true;
            const add = subquestXpValue(subquest);
            next.totalXP += add;
            bulkXp += add;
          }
        }
        quest.completed = quest.subquests.every((sq) => sq.completed);
      }

      return next;
    });
    if (bulkXp > 0) {
      queueMicrotask(() => {
        window.dispatchEvent(
          new CustomEvent(PET_CELEBRATE_TASK_EVENT, {
            detail: { xp: bulkXp },
          }),
        );
      });
    }
  }

  /**
   * Remove a saved quest run from history.
   * Total XP is not reduced — it stays as your lifetime total (also in localStorage + backend file).
   */
  function handleDeleteQuestRun(runId) {
    setAppState((prev) => {
      if (!prev) return prev;

      const run = prev.questHistory.find((r) => r.id === runId);
      if (!run) return prev;

      const next = structuredClone(prev);

      next.questHistory = next.questHistory.filter((r) => r.id !== runId);

      if (next.activeQuestRunId === runId) {
        next.activeQuestRunId =
          next.questHistory[next.questHistory.length - 1]?.id ?? null;
      }

      return next;
    });
  }

  /**
   * Replace a run's questline (e.g. after AI regenerate). Subtracts XP earned from
   * completed tasks in the old line so lifetime total stays consistent.
   */
  const replaceQuestRunQuestline = useCallback((runId, newQuestline) => {
    setAppState((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      const run = next.questHistory.find((r) => r.id === runId);
      if (!run) return prev;

      let earnedFromRun = 0;
      for (const q of run.questline?.quests ?? []) {
        for (const sq of q.subquests ?? []) {
          if (sq.completed) earnedFromRun += sq.xp ?? 0;
        }
      }
      next.totalXP = Math.max(0, (next.totalXP ?? 0) - earnedFromRun);
      run.questline = newQuestline;
      return next;
    });
  }, []);

  /**
   * Remove one quest from the active questline.
   * Total XP is unchanged — deleting quests does not take away earned XP.
   */
  function handleDeleteQuestInActiveRun(questId) {
    setAppState((prev) => {
      if (!prev?.activeQuestRunId) return prev;

      const next = structuredClone(prev);
      const run = next.questHistory.find((r) => r.id === next.activeQuestRunId);
      if (!run?.questline?.quests) return prev;

      const quest = run.questline.quests.find((q) => q.id === questId);
      if (!quest) return prev;

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
  };
}

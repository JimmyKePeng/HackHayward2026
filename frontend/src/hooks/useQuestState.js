import { useCallback, useEffect, useMemo, useState } from "react";
import { PET_TINT_COUNT } from "../utils/rockAppearance";

const STORAGE_KEY = "quest-app-state";
const API_BASE_URL = "http://localhost:3001";
const EMPTY_QUEST_HISTORY = [];

/** Dispatched when the player spends a mineral to feed the pet (Pet page). */
export const PET_FEED_MINERAL_EVENT = "pet-feed-mineral";

export const MINERAL_FEED_COST = 1;
export const MINERAL_UNLOCK_TINT_COST = 5;

function petCareFromRaw(raw) {
  const defaults = {
    petMineralBalance: 0,
    petTintIndex: 0,
    petUnlockedTints: [0],
    petFeedCount: 0,
  };
  if (!raw || typeof raw !== "object") return defaults;

  let balance;
  if (raw.petMineralBalance != null && Number.isFinite(Number(raw.petMineralBalance))) {
    balance = Math.max(0, Math.floor(Number(raw.petMineralBalance)));
  } else {
    // Minerals are quiz-only; do not derive balance from completed subquests.
    balance = 0;
  }

  const feedCount = Math.max(0, Math.floor(Number(raw.petFeedCount) || 0));
  let unlocked = [0];
  if (Array.isArray(raw.petUnlockedTints)) {
    const u = raw.petUnlockedTints
      .map((x) => Math.floor(Number(x)))
      .filter((x) => Number.isFinite(x) && x >= 0 && x < PET_TINT_COUNT);
    unlocked = u.length ? [...new Set([0, ...u])].sort((a, b) => a - b) : [0];
  }
  let tint = Math.min(
    PET_TINT_COUNT - 1,
    Math.max(0, Math.floor(Number(raw.petTintIndex) || 0)),
  );
  if (!unlocked.includes(tint)) tint = 0;
  return {
    petMineralBalance: balance,
    petTintIndex: tint,
    petUnlockedTints: unlocked,
    petFeedCount: feedCount,
  };
}

/** XP value for a subquest (avoids NaN when `xp` is missing). */
export function subquestXpValue(sub) {
  const n = Number(sub?.xp);
  return Number.isFinite(n) && n >= 0 ? n : 5;
}

export const PET_CELEBRATE_TASK_EVENT = "pet-celebrate-task";

/** Default label for the draggable pet rock (caption, accessibility, quip fallback). */
export const DEFAULT_PET_NAME = "Rock pet";

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
      ...petCareFromRaw(raw),
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
      ...petCareFromRaw(raw),
    };
  }

  return {
    totalXP: raw.totalXP ?? 0,
    questHistory: [],
    activeQuestRunId: null,
    petName,
    ...petCareFromRaw(raw),
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
  /** Visual size curve: gentler than 1 + XP/100 so early XP doesn’t balloon the rock. */
  const rockScale = 1 + totalXP / 400;

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
          ...petCareFromRaw({}),
        };
      }
      return { ...prev, petName: normalized };
    });
  }, []);

  const questHistory = appState?.questHistory ?? EMPTY_QUEST_HISTORY;
  const activeQuestRunId = appState?.activeQuestRunId ?? null;

  const petMineralBalance = appState?.petMineralBalance ?? 0;

  const petTintIndex = appState?.petTintIndex ?? 0;
  const petUnlockedTints = appState?.petUnlockedTints ?? [0];
  const petFeedCount = appState?.petFeedCount ?? 0;

  const feedPetMineral = useCallback(() => {
    let dispatched = false;
    setAppState((prev) => {
      if (!prev) return prev;
      const bal = prev.petMineralBalance ?? 0;
      if (bal < MINERAL_FEED_COST) return prev;
      dispatched = true;
      return {
        ...prev,
        petMineralBalance: bal - MINERAL_FEED_COST,
        petFeedCount: (prev.petFeedCount ?? 0) + 1,
      };
    });
    if (dispatched) {
      queueMicrotask(() => {
        window.dispatchEvent(new CustomEvent(PET_FEED_MINERAL_EVENT));
      });
    }
    return dispatched;
  }, []);

  const unlockPetTint = useCallback((index) => {
    if (index < 1 || index >= PET_TINT_COUNT) return false;
    let ok = false;
    setAppState((prev) => {
      if (!prev) return prev;
      const unlocked = new Set(prev.petUnlockedTints ?? [0]);
      if (unlocked.has(index)) return prev;
      const bal = prev.petMineralBalance ?? 0;
      if (bal < MINERAL_UNLOCK_TINT_COST) return prev;
      ok = true;
      unlocked.add(index);
      return {
        ...prev,
        petMineralBalance: bal - MINERAL_UNLOCK_TINT_COST,
        petUnlockedTints: [...unlocked].sort((a, b) => a - b),
        petTintIndex: index,
      };
    });
    return ok;
  }, []);

  const awardQuizMineral = useCallback(() => {
    setAppState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        petMineralBalance: (prev.petMineralBalance ?? 0) + 1,
      };
    });
  }, []);

  const setPetTintIndex = useCallback((index) => {
    setAppState((prev) => {
      if (!prev) return prev;
      if (index < 0 || index >= PET_TINT_COUNT) return prev;
      const unlocked = new Set(prev.petUnlockedTints ?? [0]);
      if (!unlocked.has(index)) return prev;
      return { ...prev, petTintIndex: index };
    });
  }, []);

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
    petTintIndex,
    petUnlockedTints,
    petFeedCount,
    petMineralBalance,
    feedPetMineral,
    unlockPetTint,
    setPetTintIndex,
    awardQuizMineral,
  };
}

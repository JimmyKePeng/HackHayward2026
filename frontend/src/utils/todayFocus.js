/**
 * Derive "today's focus" copy from the active quest run (first unchecked task, progress counts).
 */
export function getTodayFocusInfo(run) {
  if (!run?.questline?.quests?.length) {
    return {
      hasRun: false,
      userGoal: "",
      questTitle: "",
      nextTask: null,
      completed: 0,
      total: 0,
      allComplete: false,
    };
  }

  let completed = 0;
  let total = 0;
  let nextTask = null;

  for (const q of run.questline.quests) {
    for (const sq of q.subquests || []) {
      total += 1;
      if (sq.completed) completed += 1;
      else if (!nextTask) {
        nextTask = {
          questTitle: q.title,
          taskTitle: sq.title,
        };
      }
    }
  }

  const allComplete = total > 0 && completed === total;

  return {
    hasRun: true,
    userGoal: run.userGoal || "",
    questTitle: run.questline.quest_title || "",
    nextTask,
    completed,
    total,
    allComplete,
  };
}

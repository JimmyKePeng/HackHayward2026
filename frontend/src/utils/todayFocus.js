/**
 * Whether a subquest counts as done (only explicit true).
 */
function isSubquestCompleted(sq) {
  return sq?.completed === true;
}

/**
 * "Today's focus": first unfinished subquest in quest order, plus progress counts.
 * After you check off a task, the next render should show the following unchecked task.
 * "All complete" only when every subquest is explicitly completed.
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
      if (isSubquestCompleted(sq)) {
        completed += 1;
      } else if (!nextTask) {
        nextTask = {
          questId: q.id,
          subquestId: sq.id,
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

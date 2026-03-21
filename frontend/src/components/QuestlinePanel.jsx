import { useState } from "react";

function QuestlinePanel({ activeQuestRun, onToggleSubquest }) {
  const questline = activeQuestRun?.questline;
  const firstQuestId = questline?.quests?.[0]?.id;
  const [expandedQuestIds, setExpandedQuestIds] = useState(
    () => new Set(firstQuestId ? [firstQuestId] : [])
  );

  function toggleQuest(questId) {
    setExpandedQuestIds((prev) => {
      const next = new Set(prev);
      if (next.has(questId)) next.delete(questId);
      else next.add(questId);
      return next;
    });
  }

  return (
    <section className="panel">
      <h2>Questline</h2>

      {!questline?.quests?.length ? (
        <p className="muted">Generate a quest to begin, or pick one from Quest above.</p>
      ) : (
        <>
          {activeQuestRun?.userGoal ? (
            <p className="muted questline-goal">
              <strong>Goal:</strong> {activeQuestRun.userGoal}
            </p>
          ) : null}
          <p className="quest-title">{questline.quest_title}</p>
          <p className="muted questline-hint">Click a quest to expand or collapse its tasks.</p>

          <div className="quest-list">
            {questline.quests.map((quest) => {
              const expanded = expandedQuestIds.has(quest.id);
              return (
                <div key={quest.id} className={`quest-card${expanded ? " quest-card--open" : ""}`}>
                  <button
                    type="button"
                    className="quest-header quest-header--toggle"
                    onClick={() => toggleQuest(quest.id)}
                    aria-expanded={expanded}
                  >
                    <span className="quest-chevron" aria-hidden>
                      {expanded ? "▼" : "▶"}
                    </span>
                    <h3>{quest.title}</h3>
                    <span className="badge">{quest.difficulty}</span>
                  </button>

                  {expanded ? (
                    <ul className="subquest-list">
                      {quest.subquests.map((subquest) => (
                        <li key={subquest.id} className="subquest-item">
                          <label onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={subquest.completed}
                              onChange={() => onToggleSubquest(quest.id, subquest.id)}
                            />
                            <span>
                              {subquest.title} (+{subquest.xp} XP)
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

export default QuestlinePanel;

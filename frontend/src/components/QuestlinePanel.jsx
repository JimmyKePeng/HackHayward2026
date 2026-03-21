function QuestlinePanel({ appState, onToggleSubquest }) {
  return (
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
                          onChange={() => onToggleSubquest(quest.id, subquest.id)}
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
  );
}

export default QuestlinePanel;

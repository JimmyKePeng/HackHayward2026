function ObjectivesPanel({ todaysObjectives }) {
  return (
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
  );
}

export default ObjectivesPanel;

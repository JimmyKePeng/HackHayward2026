import { Link } from "react-router-dom";

export default function HomePage({ totalXP, questCount, activeQuestTitle }) {
  return (
    <>
      <header className="hero hero--page">
        <h1>Gamified Self-Help Quest</h1>
        <p>
          Turn one real goal into quests, XP, and a blob pet that cheers you on.
        </p>
      </header>

      <section className="panel panel--home">
        <h2>At a glance</h2>
        <ul className="home-stats">
          <li>
            <strong>Total XP:</strong> {totalXP}
          </li>
          <li>
            <strong>Quests saved:</strong> {questCount}
          </li>
          <li>
            <strong>Active quest:</strong>{" "}
            {activeQuestTitle ? (
              <span title={activeQuestTitle}>{activeQuestTitle}</span>
            ) : (
              <span className="muted">None selected — head to Quests</span>
            )}
          </li>
        </ul>
        <div className="home-actions">
          <Link to="/quests" className="home-actions__primary">
            Go to Quests
          </Link>
          <Link to="/progress" className="home-actions__secondary">
            Progress &amp; blob
          </Link>
        </div>
      </section>
    </>
  );
}

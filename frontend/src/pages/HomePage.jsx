import { useMemo } from "react";
import { Link } from "react-router-dom";
import BlobPet from "../components/BlobPet";
import {
  getBlobColors,
  getRockAppearance,
  getTierProgressInfo,
} from "../utils/rockAppearance";
import { getQuip } from "../utils/blobPetQuips";
import { getTodayFocusInfo } from "../utils/todayFocus";

export default function HomePage({
  totalXP,
  rockScale,
  questCount,
  activeQuestRun,
}) {
  const focus = useMemo(
    () => getTodayFocusInfo(activeQuestRun),
    [activeQuestRun],
  );
  const { scale } = getRockAppearance(totalXP, rockScale, { maxScale: 1.38 });
  const blobColors = getBlobColors(totalXP);
  const tierInfo = getTierProgressInfo(totalXP);
  const tierLabel = blobColors.tierLabel;

  const blobOneLiner = useMemo(
    () => getQuip("idle", tierLabel),
    [tierLabel],
  );

  let focusBody = null;
  if (questCount === 0) {
    focusBody = (
      <p className="home-focus__text">
        No quests yet. Generate one on the{" "}
        <Link to="/quests">Quests</Link> page — your next task will land here.
      </p>
    );
  } else if (!focus.hasRun) {
    focusBody = (
      <p className="home-focus__text">
        Choose a quest run on the <Link to="/quests">Quests</Link> page to see
        your next unchecked task here.
      </p>
    );
  } else if (focus.allComplete) {
    focusBody = (
      <>
        <p className="home-focus__badge">Run complete</p>
        <p className="home-focus__text">
          Every task in this questline is checked off ({focus.completed}/
          {focus.total}). Time to celebrate — or{" "}
          <Link to="/quests">start a new quest</Link>.
        </p>
      </>
    );
  } else if (focus.nextTask) {
    focusBody = (
      <>
        {focus.userGoal ? (
          <p className="home-focus__goal muted">
            <strong>Your goal:</strong> {focus.userGoal}
          </p>
        ) : null}
        <p className="home-focus__next-label">Next up</p>
        <p className="home-focus__next-task">{focus.nextTask.taskTitle}</p>
        <p className="home-focus__meta muted">
          From <em>{focus.nextTask.questTitle}</em> · {focus.questTitle}
        </p>
        <p className="home-focus__progress muted">
          Tasks in this run: {focus.completed}/{focus.total} done
        </p>
      </>
    );
  } else {
    focusBody = (
      <p className="home-focus__text">
        Open <Link to="/quests">Quests</Link> to add tasks to this run.
      </p>
    );
  }

  return (
    <>
      <header className="hero hero--page">
        <h1>Gamified Self-Help Quest</h1>
        <p>
          Turn goals into quests and XP — with a blob pet that actually cares
          (allegedly).
        </p>
      </header>

      <div className="home-dashboard">
        <section className="panel home-card home-focus">
          <h2>Today&apos;s focus</h2>
          {focusBody}
        </section>

        <section className="panel home-card home-pet-card" aria-label="Pet preview">
          <h2>Your blob</h2>
          <p className="home-pet-card__sub muted">
            Same pet as the floating one — rarity grows with XP.
          </p>

          <p className="home-pet-card__peek-label muted">At a glance</p>
          <ul className="home-pet-card__pills">
            <li>
              <span className="home-pet-card__pill-label">XP</span>
              <span className="home-pet-card__pill-value">{totalXP}</span>
            </li>
            <li>
              <span className="home-pet-card__pill-label">Quests</span>
              <span className="home-pet-card__pill-value">{questCount}</span>
            </li>
            <li>
              <span className="home-pet-card__pill-label">Tier</span>
              <span className="home-pet-card__pill-value">{tierLabel}</span>
            </li>
          </ul>

          <div
            className="tier-progress home-pet-card__tier-progress"
            aria-label="Progress in current rarity tier"
          >
            <div className="tier-progress__track">
              <div
                className="tier-progress__fill"
                style={{ width: `${tierInfo.barPercent}%` }}
              />
            </div>
            <p className="tier-progress__label muted">
              {tierInfo.isMaxTier ? (
                <>Max rarity — keep earning XP to grow your blob!</>
              ) : (
                <>
                  {tierInfo.xpIntoNextTier} XP until{" "}
                  <strong>{tierInfo.nextTierLabel}</strong>
                </>
              )}
            </p>
          </div>

          <div className="home-pet-card__blob">
            <BlobPet
              hue={blobColors.hue}
              saturation={blobColors.saturation}
              lightness={blobColors.lightness}
              scale={scale}
              mood="idle"
              reaction="none"
              quip=""
              tierLabel={tierLabel}
              showQuip={false}
            />
          </div>
          <p className="home-pet-card__caption">{blobOneLiner}</p>
          <Link to="/progress" className="home-pet-card__link">
            XP bar &amp; report →
          </Link>
        </section>
      </div>
    </>
  );
}

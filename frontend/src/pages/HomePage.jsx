import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import BlobPet from "../components/BlobPet";
import { subquestXpValue } from "../hooks/useQuestState";
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
  onToggleSubquest,
  petName,
  onPetNameChange,
}) {
  /** Recompute when run reference or any subquest completion changes */
  const focusCompletionKey = useMemo(() => {
    if (!activeQuestRun?.questline?.quests) return "";
    return activeQuestRun.questline.quests
      .map((q) =>
        (q.subquests || [])
          .map((s) => `${s.id}:${s.completed === true ? 1 : 0}`)
          .join(","),
      )
      .join("|");
  }, [activeQuestRun]);

  const focus = useMemo(
    () => getTodayFocusInfo(activeQuestRun),
    [activeQuestRun, focusCompletionKey],
  );
  const { scale } = getRockAppearance(totalXP, rockScale, { maxScale: 1.38 });
  const blobColors = getBlobColors(totalXP);
  const tierInfo = getTierProgressInfo(totalXP);
  const tierLabel = blobColors.tierLabel;

  const blobOneLiner = useMemo(
    () => getQuip("idle", tierLabel),
    [tierLabel],
  );

  /** Today’s focus: encouragement line after checking a task */
  const [focusEncourage, setFocusEncourage] = useState(null);
  /** Home card blob: quick excited reaction when a focus task is completed */
  const [homePetCheer, setHomePetCheer] = useState(false);

  const [petNameDraft, setPetNameDraft] = useState(petName);
  useEffect(() => {
    setPetNameDraft(petName);
  }, [petName]);

  function commitPetName() {
    onPetNameChange?.(petNameDraft);
  }

  useEffect(() => {
    if (!focusEncourage) return;
    const t = window.setTimeout(() => setFocusEncourage(null), 3800);
    return () => clearTimeout(t);
  }, [focusEncourage]);

  useEffect(() => {
    if (!homePetCheer) return;
    const t = window.setTimeout(() => setHomePetCheer(false), 2600);
    return () => clearTimeout(t);
  }, [homePetCheer]);

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
  } else if (focus.nextTask) {
    const { questId, subquestId } = focus.nextTask;
    const q = activeQuestRun?.questline?.quests?.find((x) => x.id === questId);
    const sub = q?.subquests?.find((s) => s.id === subquestId);
    const subCompleted = sub?.completed === true;

    const canToggle =
      typeof onToggleSubquest === "function" &&
      questId &&
      subquestId &&
      activeQuestRun;

    focusBody = (
      <>
        {focus.userGoal ? (
          <p className="home-focus__goal muted">
            <strong>Your goal:</strong> {focus.userGoal}
          </p>
        ) : null}
        <p className="home-focus__next-label">Next unfinished task</p>
        <div className="home-focus__task-row">
          {canToggle ? (
            <label className="home-focus__task-check">
              <input
                type="checkbox"
                checked={subCompleted}
                onChange={() => {
                  if (!subCompleted) {
                    setFocusEncourage({
                      xp: subquestXpValue(sub),
                      line: getQuip("focus"),
                    });
                    setHomePetCheer(true);
                  }
                  onToggleSubquest(questId, subquestId);
                }}
              />
              <span className="home-focus__next-task">
                {focus.nextTask.taskTitle}
                {sub?.xp != null ? (
                  <span className="home-focus__task-xp muted">
                    {" "}
                    (+{sub.xp} XP)
                  </span>
                ) : null}
              </span>
            </label>
          ) : (
            <p className="home-focus__next-task">{focus.nextTask.taskTitle}</p>
          )}
        </div>
        <p className="home-focus__meta muted">
          From <em>{focus.nextTask.questTitle}</em> · {focus.questTitle}
        </p>
        <p className="home-focus__progress muted">
          Tasks in this run: {focus.completed}/{focus.total} done
        </p>
        {canToggle ? (
          <p className="home-focus__toggle-hint muted">
            Check off to earn XP — the next unfinished task will show here right
            away.
          </p>
        ) : null}
        {focusEncourage ? (
          <p className="home-focus__cheer" role="status" aria-live="polite">
            <span className="home-focus__cheer-xp">
              +{focusEncourage.xp} XP
            </span>
            <span className="home-focus__cheer-text">{focusEncourage.line}</span>
          </p>
        ) : null}
      </>
    );
  } else if (focus.allComplete) {
    focusBody = (
      <>
        <p className="home-focus__badge home-focus__badge--complete">
          RUN COMPLETE
        </p>
        <p className="home-focus__text">
          Every task in this questline is checked off ({focus.completed}/
          {focus.total}). Time to celebrate — or{" "}
          <Link to="/quests">start a new quest</Link>.
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

        <section
          className="panel home-card home-pet-card"
          aria-label={`${petName} preview`}
        >
          <h2>Your pet</h2>
          <p className="home-pet-card__sub muted">
            Same companion as the floating one — rarity grows with XP.
          </p>

          <div className="home-pet-card__name-row">
            <label className="home-pet-card__name-label" htmlFor="home-pet-name">
              Name
            </label>
            <input
              id="home-pet-name"
              className="home-pet-card__name-input"
              type="text"
              maxLength={32}
              autoComplete="off"
              spellCheck="false"
              value={petNameDraft}
              onChange={(e) => setPetNameDraft(e.target.value)}
              onBlur={commitPetName}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitPetName();
                  e.currentTarget.blur();
                }
              }}
              placeholder="Blob pet"
            />
          </div>

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
          <p className="muted xp-lifetime-hint home-pet-card__xp-hint">
            Lifetime total — removing quests from your list does not lower XP.
          </p>

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
                <>Max rarity — keep earning XP to grow {petName}!</>
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
              mood={homePetCheer ? "excited" : "idle"}
              reaction={homePetCheer ? "xp" : "none"}
              quip={homePetCheer ? getQuip("xp") : ""}
              tierLabel={tierLabel}
              petName={petName}
              showQuip={homePetCheer}
            />
          </div>
          <p className="home-pet-card__caption">{blobOneLiner}</p>
          <Link to="/skill" className="home-pet-card__link">
            Achievement report →
          </Link>
        </section>
      </div>
    </>
  );
}

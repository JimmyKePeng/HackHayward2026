import { useState } from "react";
import {
  MINERAL_FEED_COST,
  MINERAL_UNLOCK_TINT_COST,
} from "../hooks/useQuestState";
import { getBlobSurfaceGradient, PET_TINT_PRESETS } from "../utils/rockAppearance";
import PetKnowledgeQuizModal, {
  QUIZ_MINERALS_PASS_THRESHOLD,
} from "./PetKnowledgeQuizModal";

/**
 * Pet playground: earn minerals via knowledge quiz; feed & unlock tints.
 */
export default function PetMineralCare({
  petName,
  totalXP,
  petMineralBalance,
  petUnlockedTints,
  petTintIndex,
  petFeedCount,
  appState,
  onFeedMineral,
  onUnlockTint,
  onSelectTint,
  onAwardQuizMineral,
}) {
  const [quizOpen, setQuizOpen] = useState(false);
  const unlockedSet = new Set(petUnlockedTints ?? [0]);
  const happinessPct = Math.min(100, (petFeedCount ?? 0) * 7);

  return (
    <div className="pet-care">
      <PetKnowledgeQuizModal
        open={quizOpen}
        onClose={() => setQuizOpen(false)}
        appState={appState}
        onAwardMineral={onAwardQuizMineral}
      />

      <div className="pet-care__intro">
        <h3 className="pet-care__title">Minerals &amp; looks</h3>
        <p className="pet-care__blurb">
          Take a <strong>10-question quiz</strong> built from your saved quest topics
          (goals &amp; titles). Get <strong>{QUIZ_MINERALS_PASS_THRESHOLD}+ correct</strong>{" "}
          to earn <strong>1 mineral</strong>. Spend minerals to <strong>feed</strong>{" "}
          {petName} or <strong>unlock color moods</strong>.
        </p>
      </div>

      <div className="pet-care__stats">
        <div className="pet-care__stat pet-care__stat--highlight">
          <span className="pet-care__stat-label">Minerals</span>
          <span className="pet-care__stat-value">{petMineralBalance}</span>
        </div>
      </div>

      <div className="pet-care__quiz-block">
        <button
          type="button"
          className="pet-care__btn pet-care__btn--quiz"
          onClick={() => setQuizOpen(true)}
        >
          Take knowledge quiz (earn minerals)
        </button>
        <p className="pet-care__quiz-hint muted">
          Sends your learned topics to the server; Perplexity writes the questions.
          You need an archive of quest runs with goals — same data as the Skill page.
        </p>
      </div>

      <div className="pet-care__feed-block">
        <div className="pet-care__feed-head">
          <span className="pet-care__feed-title">Feed {petName}</span>
          <span className="pet-care__feed-cost">
            {MINERAL_FEED_COST} mineral{MINERAL_FEED_COST === 1 ? "" : "s"} each
          </span>
        </div>
        <div
          className="pet-care__happiness"
          role="meter"
          aria-valuenow={happinessPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${petName} snack happiness`}
        >
          <div className="pet-care__happiness-label">
            Snack happiness <span className="muted">({petFeedCount} feeds)</span>
          </div>
          <div className="pet-care__happiness-track">
            <div
              className="pet-care__happiness-fill"
              style={{ width: `${happinessPct}%` }}
            />
          </div>
        </div>
        <button
          type="button"
          className="pet-care__btn pet-care__btn--feed"
          onClick={() => onFeedMineral?.()}
          disabled={petMineralBalance < MINERAL_FEED_COST}
        >
          Drop a mineral treat
        </button>
        {petMineralBalance < MINERAL_FEED_COST ? (
          <p className="pet-care__hint muted">
            Pass the quiz (6+/10) to earn minerals for treats.
          </p>
        ) : null}
      </div>

      <div className="pet-care__tints">
        <h4 className="pet-care__tints-title">Color mood</h4>
        <p className="pet-care__tints-sub muted">
          Unlock extra palettes for <strong>{MINERAL_UNLOCK_TINT_COST} minerals</strong> each.
          Swatches match your pet at your current XP tier.
        </p>
        <ul className="pet-care__tint-list">
          {PET_TINT_PRESETS.map((preset, index) => {
            const unlocked = unlockedSet.has(index);
            const active = petTintIndex === index;
            return (
              <li key={preset.id} className="pet-care__tint-item">
                <div className="pet-care__tint-row">
                  <button
                    type="button"
                    className={`pet-care__tint-swatch${active ? " pet-care__tint-swatch--active" : ""}${!unlocked ? " pet-care__tint-swatch--locked" : ""}`}
                    style={{
                      background: getBlobSurfaceGradient(totalXP, index),
                    }}
                    onClick={() => unlocked && onSelectTint?.(index)}
                    disabled={!unlocked}
                    title={preset.label}
                    aria-pressed={active}
                    aria-label={
                      unlocked
                        ? `Select ${preset.label} tint`
                        : `Locked: ${preset.label}`
                    }
                  />
                  <div className="pet-care__tint-meta">
                    <span className="pet-care__tint-name">{preset.label}</span>
                    {index === 0 ? (
                      <span className="pet-care__tint-tag">Default</span>
                    ) : unlocked ? (
                      <span className="pet-care__tint-tag pet-care__tint-tag--ok">
                        Unlocked
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="pet-care__unlock"
                        onClick={() => onUnlockTint?.(index)}
                        disabled={
                          petMineralBalance < MINERAL_UNLOCK_TINT_COST
                        }
                      >
                        Unlock ({MINERAL_UNLOCK_TINT_COST} minerals)
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

import { getRockAppearance, getTierProgressInfo } from "../utils/rockAppearance";

function ProgressPanel({ totalXP, rockScale, rockAnchorRef }) {
  const { tierLabel } = getRockAppearance(totalXP, rockScale);
  const tierInfo = getTierProgressInfo(totalXP);

  return (
    <div className="panel">
      <h2>XP &amp; rarity</h2>
      <p>
        <strong>Total XP:</strong> {totalXP}
      </p>
      <p className="muted xp-lifetime-hint">
        Lifetime total — removing quests from the list does not lower this.
      </p>
      <p className="muted">
        <strong>Rarity:</strong> {tierLabel}
      </p>

      <div className="tier-progress" aria-label="Progress in current rarity tier">
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
              {tierInfo.xpIntoNextTier} XP until <strong>{tierInfo.nextTierLabel}</strong>
            </>
          )}
        </p>
      </div>

      {/* <p className="muted pet-rock-hint">
        Your blob starts in the slot below — drag it anywhere. Tap without
        dragging to boop.
      </p>
      <div ref={rockAnchorRef} className="pet-rock-anchor" aria-hidden /> */}
    </div>
  );
}

export default ProgressPanel;

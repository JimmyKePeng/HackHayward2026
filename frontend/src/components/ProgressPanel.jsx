import { getRockAppearance } from "../utils/rockAppearance";

function ProgressPanel({ totalXP, rockScale, rockAnchorRef }) {
  const { tierLabel } = getRockAppearance(totalXP, rockScale);

  return (
    <div className="panel">
      <h2>Progress</h2>
      <p>
        <strong>Total XP:</strong> {totalXP}
      </p>
      <p className="muted">
        <strong>Rarity:</strong> {tierLabel}
      </p>
      <p className="muted pet-rock-hint">
        Pet rock starts in the slot below — drag it anywhere on the screen. Position is saved.
      </p>

    </div>
  );
}

export default ProgressPanel;

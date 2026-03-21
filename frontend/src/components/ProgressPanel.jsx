function ProgressPanel({ totalXP, rockScale }) {
  const rarityTiers = [
    { minXP: 0, maxXP: 99, hue: 215, saturation: 10, lightness: 62, label: "Common" },
    { minXP: 100, maxXP: 249, hue: 140, saturation: 45, lightness: 56, label: "Uncommon" },
    { minXP: 250, maxXP: 499, hue: 210, saturation: 65, lightness: 54, label: "Rare" },
    { minXP: 500, maxXP: 899, hue: 275, saturation: 72, lightness: 55, label: "Epic" },
    { minXP: 900, maxXP: Infinity, hue: 45, saturation: 88, lightness: 54, label: "Legendary" },
  ];

  const currentTier =
    rarityTiers.find((tier) => totalXP >= tier.minXP && totalXP <= tier.maxXP) ??
    rarityTiers[0];

  const tierSpan = Number.isFinite(currentTier.maxXP)
    ? currentTier.maxXP - currentTier.minXP + 1
    : 250;
  const tierProgress = Math.min(
    1,
    Math.max(0, (totalXP - currentTier.minXP) / tierSpan)
  );

  const hue = currentTier.hue;
  const saturation = Math.round(currentTier.saturation + tierProgress * 6);
  const lightness = Math.round(currentTier.lightness - tierProgress * 4);

  return (
    <div className="panel">
      <h2>Progress</h2>
      <p>
        <strong>Total XP:</strong> {totalXP}
      </p>
      <p className="muted">
        <strong>Rarity:</strong> {currentTier.label}
      </p>
      <div className="rock-area">
        <div
          className="rock"
          style={{
            transform: `scale(${rockScale})`,
            background: `linear-gradient(145deg, hsl(${hue} ${saturation}% ${lightness + 8}%), hsl(${hue} ${saturation}% ${lightness}%))`,
            boxShadow: `inset -8px -8px 0 hsla(${hue}, ${Math.max(10, saturation - 10)}%, ${Math.max(20, lightness - 20)}%, 0.35)`,
          }}
          title="Pet Rock"
        />
      </div>
      <p className="muted">Your rock grows as XP increases.</p>
    </div>
  );
}

export default ProgressPanel;

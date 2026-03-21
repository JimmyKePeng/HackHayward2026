const RARITY_TIERS = [
  { minXP: 0, maxXP: 99, hue: 215, saturation: 10, lightness: 62, label: "Common" },
  { minXP: 100, maxXP: 249, hue: 140, saturation: 45, lightness: 56, label: "Uncommon" },
  { minXP: 250, maxXP: 499, hue: 210, saturation: 65, lightness: 54, label: "Rare" },
  { minXP: 500, maxXP: 899, hue: 275, saturation: 72, lightness: 55, label: "Epic" },
  { minXP: 900, maxXP: Infinity, hue: 45, saturation: 88, lightness: 54, label: "Legendary" },
];

/**
 * Shared visuals for the pet rock (Progress panel + fixed corner rock).
 * @param {number} totalXP
 * @param {number} rockScale — from 1 + XP/100
 * @param {{ maxScale?: number | null }} [options] — cap scale for fixed overlay so it stays on-screen
 */
export function getRockAppearance(totalXP, rockScale, options = {}) {
  const { maxScale = null } = options;

  const tierIndex = RARITY_TIERS.findIndex(
    (tier) => totalXP >= tier.minXP && totalXP <= tier.maxXP
  );
  const shapeId = tierIndex >= 0 ? tierIndex : 0;

  const currentTier =
    RARITY_TIERS[tierIndex >= 0 ? tierIndex : 0] ?? RARITY_TIERS[0];

  const tierSpan = Number.isFinite(currentTier.maxXP)
    ? currentTier.maxXP - currentTier.minXP + 1
    : 250;
  const tierProgress = Math.min(1, Math.max(0, (totalXP - currentTier.minXP) / tierSpan));

  const hue = currentTier.hue;
  const saturation = Math.round(currentTier.saturation + tierProgress * 6);
  const lightness = Math.round(currentTier.lightness - tierProgress * 4);

  const scale =
    maxScale != null ? Math.min(rockScale, maxScale) : rockScale;

  return {
    tierLabel: currentTier.label,
    /** 0–4: each rarity tier uses a different rock silhouette (see CSS `.rock--shape-*`) */
    shapeId,
    scale,
    style: {
      transform: `scale(${scale})`,
      background: `linear-gradient(145deg, hsl(${hue} ${saturation}% ${lightness + 8}%), hsl(${hue} ${saturation}% ${lightness}%))`,
      boxShadow: `inset -8px -8px 0 hsla(${hue}, ${Math.max(10, saturation - 10)}%, ${Math.max(20, lightness - 20)}%, 0.35)`,
    },
  };
}

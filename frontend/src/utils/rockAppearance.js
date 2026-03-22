/**
 * Cosmetic tints applied on top of rarity-based HSL (hue shifts wrap 0–360).
 * Index 0 is always free; others unlock with minerals on the Pet page.
 */
export const PET_TINT_PRESETS = [
  { id: 0, label: "Rarity", hueShift: 0, satShift: 0, lightShift: 0 },
  { id: 1, label: "Rose quartz", hueShift: 42, satShift: 12, lightShift: 6 },
  { id: 2, label: "Mint moon", hueShift: 168, satShift: 10, lightShift: -4 },
  { id: 3, label: "Sunset", hueShift: -38, satShift: 14, lightShift: 2 },
  { id: 4, label: "Deep sea", hueShift: 208, satShift: 6, lightShift: -8 },
];

export const PET_TINT_COUNT = PET_TINT_PRESETS.length;

function clampChannel(n, min, max) {
  return Math.min(max, Math.max(min, Math.round(n)));
}

export const RARITY_TIERS = [
  { minXP: 0, maxXP: 99, hue: 215, saturation: 10, lightness: 62, label: "Common" },
  { minXP: 100, maxXP: 249, hue: 140, saturation: 45, lightness: 56, label: "Uncommon" },
  { minXP: 250, maxXP: 499, hue: 210, saturation: 65, lightness: 54, label: "Rare" },
  { minXP: 500, maxXP: 899, hue: 275, saturation: 72, lightness: 55, label: "Epic" },
  { minXP: 900, maxXP: Infinity, hue: 45, saturation: 88, lightness: 54, label: "Legendary" },
];

/**
 * Shared visuals for the pet rock (Home preview + fixed corner rock).
 * @param {number} totalXP
 * @param {number} rockScale — from 1 + XP/400 (see useQuestState)
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

/** HSL palette for pet rock / corner companion (same tier math as rock preview, no transform). */
export function getBlobColors(totalXP, options = {}) {
  const tintIdx = Math.max(
    0,
    Math.min(PET_TINT_PRESETS.length - 1, Number(options.tintIndex) || 0),
  );
  const preset = PET_TINT_PRESETS[tintIdx] ?? PET_TINT_PRESETS[0];

  const tierIndex = RARITY_TIERS.findIndex(
    (tier) => totalXP >= tier.minXP && totalXP <= tier.maxXP
  );
  const currentTier =
    RARITY_TIERS[tierIndex >= 0 ? tierIndex : 0] ?? RARITY_TIERS[0];

  const tierSpan = Number.isFinite(currentTier.maxXP)
    ? currentTier.maxXP - currentTier.minXP + 1
    : 250;
  const tierProgress = Math.min(
    1,
    Math.max(0, (totalXP - currentTier.minXP) / tierSpan)
  );

  const baseHue = currentTier.hue;
  const baseSat = currentTier.saturation + tierProgress * 6;
  const baseLight = currentTier.lightness - tierProgress * 4;

  const hue = (baseHue + preset.hueShift + 360) % 360;
  const saturation = clampChannel(baseSat + preset.satShift, 0, 100);
  const lightness = clampChannel(baseLight + preset.lightShift, 18, 88);

  return {
    hue,
    saturation,
    lightness,
    tierLabel: currentTier.label,
    tierIndex: tierIndex >= 0 ? tierIndex : 0,
    tintIndex: tintIdx,
  };
}

/**
 * CSS gradient matching the pet rock body in `BlobPet` (so tint swatches match on-screen).
 * @param {number} totalXP
 * @param {number} tintIndex
 */
export function getBlobSurfaceGradient(totalXP, tintIndex) {
  const { hue, saturation, lightness } = getBlobColors(totalXP, {
    tintIndex,
  });
  return `linear-gradient(145deg, hsl(${hue} ${saturation}% ${lightness + 10}%), hsl(${hue} ${saturation}% ${lightness - 6}%))`;
}

/** Progress toward filling the current rarity tier (for UI bar). */
export function getTierProgressInfo(totalXP) {
  const idx = RARITY_TIERS.findIndex(
    (tier) => totalXP >= tier.minXP && totalXP <= tier.maxXP
  );
  const tier = idx >= 0 ? RARITY_TIERS[idx] : RARITY_TIERS[0];
  const nextTier = RARITY_TIERS[idx + 1];

  if (!nextTier) {
    return {
      tierLabel: tier.label,
      nextTierLabel: null,
      barPercent: 100,
      xpIntoNextTier: 0,
      isMaxTier: true,
    };
  }

  const span = tier.maxXP - tier.minXP + 1;
  const pos = Math.max(0, totalXP - tier.minXP);
  const barPercent = Math.min(100, (pos / span) * 100);
  const xpIntoNextTier = Math.max(0, nextTier.minXP - totalXP);

  return {
    tierLabel: tier.label,
    nextTierLabel: nextTier.label,
    barPercent,
    xpIntoNextTier,
    isMaxTier: false,
  };
}

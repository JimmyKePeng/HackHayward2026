/** Short funny lines — mood / tier / context. Keep PG & hackathon-friendly. */

const IDLE = [
  "Just blobbin’ around. No thoughts, head empty.",
  "I believe in you. Also in snacks.",
  "Professional cheer section. Woo.",
  "Drag me if you need moral support with wheels.",
  "I’m 90% vibes, 10% questionable geometry.",
];

const XP_GAIN = [
  "Yes! Feed me that sweet, sweet XP.",
  "That’s the stuff. Chef’s kiss. No lips.",
  "Ding! Level up in… existing.",
  "You did the thing. I’m literally shaking (CSS transform).",
  "XP acquired. My soul is 2% larger.",
];

const TIER_UP = [
  "Rarity unlocked. We’re basically famous now.",
  "Main character energy just dropped.",
  "New tier who dis?",
  "I’m glowing. It’s not radiation, it’s *progress*.",
  "The grind paid off. I’m insufferably proud.",
];

const HAPPY = [
  "Look at you go. Iconic.",
  "That tickles my blob heart. If I had one.",
  "We’re so back.",
];

const EXCITED = [
  "LET’S GOOO (indoor voice)",
  "I’m vibrating at a safe frequency!",
  "Adrenaline but make it gelatinous.",
];

const SLEEPY = [
  "Zzz… still rooting for you… zzz…",
  "Low power mode. Blob respects rest.",
];

const LOVE = [
  "You + tasks = OTP.",
  "If I had hands I’d high-five you.",
  "Proud blob noises.",
];

const CLICK = [
  "That’s the spot. Do it again.",
  "Booped. Legally distinct from a poke.",
  "Attention acquired. Proceed.",
  "You found the secret: I’m very clickable.",
  "Same blob, new dopamine.",
];

const SHOCKED = [
  "Wait WHAT. We’re that cool now?",
  "Plot twist: you’re actually doing it.",
];

export function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * @param {"idle"|"happy"|"excited"|"sleepy"|"love"|"shocked"|"xp"|"tier"|"click"} kind
 * @param {string} [tierLabel]
 */
export function getQuip(kind, tierLabel) {
  switch (kind) {
    case "xp":
      return pickRandom(XP_GAIN);
    case "tier":
      return pickRandom(TIER_UP);
    case "happy":
      return pickRandom(HAPPY);
    case "excited":
      return pickRandom(EXCITED);
    case "sleepy":
      return pickRandom(SLEEPY);
    case "love":
      return pickRandom(LOVE);
    case "shocked":
      return pickRandom(SHOCKED);
    case "click":
      return pickRandom(CLICK);
    case "idle":
    default:
      return tierLabel
        ? `${pickRandom(IDLE)} (${tierLabel} era)`
        : pickRandom(IDLE);
  }
}

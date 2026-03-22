import "./BlobPet.css";
import { DEFAULT_PET_NAME } from "../hooks/useQuestState";

/**
 * Pet rock companion: eyes, mood, reaction flash, funny quip (organic rock silhouette).
 *
 * @param {object} props
 * @param {number} props.hue
 * @param {number} props.saturation
 * @param {number} props.lightness
 * @param {number} props.scale — visual size multiplier (capped by parent)
 * @param {"idle"|"happy"|"excited"|"sleepy"|"love"|"shocked"} props.mood
 * @param {"none"|"xp"|"tier"|"celebrate"|"boop"} props.reaction
 * @param {string} props.quip
 * @param {string} props.tierLabel
 * @param {string} [props.petName] — shown in quip fallback
 * @param {boolean} [props.showQuip] — set false for compact / preview cards
 * @param {boolean} [props.compactGround] — no large shadow below rock (flush on a surface, e.g. seesaw plank)
 */
export default function BlobPet({
  hue,
  saturation,
  lightness,
  scale,
  mood = "idle",
  reaction = "none",
  quip = "",
  tierLabel,
  petName = DEFAULT_PET_NAME,
  showQuip = true,
  compactGround = false,
}) {
  const s = Math.min(2.75, Math.max(0.85, scale));

  const inset = `inset -6px -10px 0 hsla(${hue}, ${Math.max(12, saturation - 8)}%, ${Math.max(18, lightness - 22)}%, 0.4)`;
  const outer = compactGround
    ? `0 1px 3px hsla(${hue}, 45%, 6%, 0.18)`
    : `0 8px 24px hsla(${hue}, 50%, 8%, 0.45)`;

  const blobStyle = {
    "--blob-scale": String(s),
    background: `linear-gradient(145deg, hsl(${hue} ${saturation}% ${lightness + 10}%), hsl(${hue} ${saturation}% ${lightness - 6}%))`,
    boxShadow: `${inset}, ${outer}`,
  };

  return (
    <div className="blob-pet-wrap">
      <div
        className={`blob-pet blob-pet--mood-${mood} blob-pet--react-${reaction}${
          compactGround ? " blob-pet--ground" : ""
        }`}
        style={blobStyle}
      >
        <div className="blob-pet__shine" aria-hidden />
        <div className="blob-pet__face">
          <div className="blob-pet__eye blob-pet__eye--left">
            <span className="blob-pet__pupil" />
          </div>
          <div className="blob-pet__eye blob-pet__eye--right">
            <span className="blob-pet__pupil" />
          </div>
          <div className="blob-pet__mouth" aria-hidden />
        </div>
        {reaction === "tier" ? (
          <span className="blob-pet__sparkle blob-pet__sparkle--a" aria-hidden>
            ✦
          </span>
        ) : null}
        {reaction === "tier" || reaction === "celebrate" ? (
          <span className="blob-pet__sparkle blob-pet__sparkle--b" aria-hidden>
            ✧
          </span>
        ) : null}
      </div>
      {showQuip ? (
        <p className="blob-pet__quip" role="status">
          {quip || `${petName} · ${tierLabel}`}
        </p>
      ) : null}
    </div>
  );
}

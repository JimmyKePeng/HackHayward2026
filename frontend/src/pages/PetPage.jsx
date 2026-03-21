import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import BlobPet from "../components/BlobPet";
import { getBlobColors, getRockAppearance } from "../utils/rockAppearance";
import "./PetPage.css";

/** Minimum XP before the seesaw launches you noticeably (blob ~1.12×). */
const MIN_XP_FOR_LAUNCH = 15;

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export default function PetPage({ totalXP, rockScale }) {
  const { scale } = getRockAppearance(totalXP, rockScale, { maxScale: 2.75 });
  const blobColors = getBlobColors(totalXP);
  const { tierLabel } = blobColors;

  const blobVisualScale = useMemo(
    () => Math.min(1.6, Math.max(0.75, scale * 0.55)),
    [scale],
  );

  /** How high the person flies (px), 0 if blob too small. */
  const launchHeight = useMemo(() => {
    if (totalXP < MIN_XP_FOR_LAUNCH) return 0;
    const t = clamp((scale - 1) / 1.75, 0, 1);
    return Math.round(48 + t * 220);
  }, [totalXP, scale]);

  const blobTooSmall = totalXP < MIN_XP_FOR_LAUNCH;

  const [animKey, setAnimKey] = useState(0);

  const petTheBlob = useCallback(() => {
    setAnimKey((k) => k + 1);
  }, []);

  const beamTilt = blobTooSmall ? 2 : clamp(6 + (scale - 1) * 10, 8, 22);

  return (
    <>
      <header className="hero hero--page hero--compact">
        <h1>Pet playground</h1>
        <p>
          Drop the blob on the seesaw — the bigger your blob (more XP), the higher
          you fly.
        </p>
      </header>

      <section className="panel pet-play">
        <div className="pet-play__stats">
          <span>
            <strong>Total XP:</strong> {totalXP}
          </span>
          <span>·</span>
          <span>
            <strong>Blob scale:</strong> {scale.toFixed(2)}×
          </span>
          <span>·</span>
          <span>
            <strong>Tier:</strong> {tierLabel}
          </span>
        </div>

        <div className="pet-play__stage" aria-live="polite">
          <div
            key={animKey}
            className={`pet-seesaw${
              animKey > 0 ? " pet-seesaw--animate" : ""
            }${blobTooSmall ? " pet-seesaw--tiny" : ""}`}
            style={{
              "--launch": `${launchHeight}px`,
              "--tilt": `${beamTilt}deg`,
            }}
          >
            <div className="pet-seesaw__sky">
              <div className="pet-seesaw__person" aria-hidden>
                <span className="pet-seesaw__person-emoji">🧍</span>
              </div>
            </div>

            <div className="pet-seesaw__beam-wrap">
              <div className="pet-seesaw__beam">
                <div className="pet-seesaw__pad pet-seesaw__pad--left">
                  <span className="pet-seesaw__label">You</span>
                </div>
                <div className="pet-seesaw__pad pet-seesaw__pad--right">
                  <span className="pet-seesaw__label">Blob</span>
                  <div className="pet-seesaw__blob">
                    <BlobPet
                      hue={blobColors.hue}
                      saturation={blobColors.saturation}
                      lightness={blobColors.lightness}
                      scale={blobVisualScale}
                      mood="idle"
                      reaction="none"
                      quip=""
                      tierLabel={tierLabel}
                      showQuip={false}
                    />
                  </div>
                </div>
              </div>
              <div className="pet-seesaw__pivot" aria-hidden />
            </div>
          </div>
        </div>

        <div className="pet-play__actions">
          <button
            type="button"
            className="pet-play__btn"
            onClick={petTheBlob}
          >
            Pet the blob — drop the rock!
          </button>
        </div>

        {blobTooSmall ? (
          <p className="pet-play__hint pet-play__hint--warn">
            Your blob is still <strong>tiny</strong>. Complete quests and earn XP to
            grow it — then the seesaw will really launch you.{" "}
            <Link to="/quests">Go to Quests →</Link>
          </p>
        ) : (
          <p className="pet-play__hint">
            Higher XP → bigger blob → heavier drop → you fly higher. Try again!
          </p>
        )}
      </section>
    </>
  );
}

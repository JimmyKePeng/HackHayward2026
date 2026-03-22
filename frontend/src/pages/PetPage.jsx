import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import BlobPet from "../components/BlobPet";
import PetMineralCare from "../components/PetMineralCare";
import { DEFAULT_PET_NAME } from "../hooks/useQuestState";
import { getBlobColors, getRockAppearance } from "../utils/rockAppearance";
import "./PetPage.css";

/** Minimum XP before the seesaw launches you noticeably. */
const MIN_XP_FOR_LAUNCH = 15;

const PERSON_WEIGHT = 1;

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

/** Positive = left (person) side down. */
function tiltFromWeights(leftW, rightW, k = 9) {
  return clamp(k * (leftW - rightW), -26, 26);
}

export default function PetPage({
  totalXP,
  rockScale,
  petName = DEFAULT_PET_NAME,
  petTintIndex = 0,
  petMineralBalance = 0,
  petUnlockedTints = [0],
  petFeedCount = 0,
  appState,
  onFeedPetMineral,
  onUnlockPetTint,
  onSelectPetTint,
  onAwardQuizMineral,
}) {
  const { scale } = getRockAppearance(totalXP, rockScale, { maxScale: 2.75 });
  const blobColors = getBlobColors(totalXP, { tintIndex: petTintIndex });
  const { tierLabel } = blobColors;

  const blobWeight = scale;

  const blobVisualScale = useMemo(
    () => Math.min(1.6, Math.max(0.75, scale * 0.55)),
    [scale],
  );

  /** How high the person flies (px), 0 if rock too small. */
  const launchHeight = useMemo(() => {
    if (totalXP < MIN_XP_FOR_LAUNCH) return 0;
    const t = clamp((scale - 1) / 1.75, 0, 1);
    return Math.round(48 + t * 220);
  }, [totalXP, scale]);

  const blobTooSmall = totalXP < MIN_XP_FOR_LAUNCH;

  const tiltIdleDeg = useMemo(
    () => tiltFromWeights(PERSON_WEIGHT, 0),
    [],
  );
  const tiltRestDeg = useMemo(
    () => tiltFromWeights(PERSON_WEIGHT, blobWeight),
    [blobWeight],
  );
  /** Brief impact tilt — right side slams down. */
  const tiltImpactDeg = useMemo(() => {
    const towardRight = clamp(-12 - (blobWeight - 1) * 8, -32, -8);
    return towardRight;
  }, [blobWeight]);

  /** idle | animating | settled */
  const [phase, setPhase] = useState("idle");

  const handleDrop = useCallback(() => {
    if (phase === "animating") return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setPhase("settled");
      return;
    }
    setPhase("animating");
  }, [phase]);

  const handleBeamAnimationEnd = useCallback((e) => {
    if (e.target !== e.currentTarget) return;
    const name = e.animationName || "";
    if (!name.includes("pet-beam-drop")) return;
    setPhase("settled");
  }, []);

  const dropAgain = useCallback(() => {
    setPhase("idle");
  }, []);

  const showBlobOnBoard = phase === "settled";
  const showFallingBlob = phase === "animating";

  return (
    <>
      <header className="hero hero--page hero--compact">
        <h1>Pet playground</h1>
        <p>
          Stand on the seesaw, then drop {petName} — the bigger they are, the
          higher you&apos;ll pop.
        </p>
      </header>

      <section className="panel pet-play">
        <div className="pet-play__stats">
          <span><strong>{petName}</strong></span>
          <span>:</span>
          <span>
            <strong>Total XP:</strong> {totalXP}
          </span>
          {/* <span>·</span> */}
          {/* <span>
            <strong>{petName} scale:</strong> {scale.toFixed(2)}×
          </span> */}
          <span>·</span>
          <span>
            <strong>Tier:</strong> {tierLabel}
          </span>
        </div>

        <div className="pet-play__row">
          <div className="pet-play__stage" aria-live="polite">
            <div
              className={`pet-seesaw pet-seesaw--phase-${phase}${blobTooSmall ? " pet-seesaw--tiny" : ""
                }`}
              style={{
                "--tilt-idle": `${tiltIdleDeg}deg`,
                "--tilt-rest": `${tiltRestDeg}deg`,
                "--tilt-impact": `${tiltImpactDeg}deg`,
                "--launch": `${launchHeight}px`,
              }}
            >
              <div className="pet-seesaw__scale">
                <div
                  className="pet-seesaw__beam-rot"
                  onAnimationEnd={handleBeamAnimationEnd}
                >
                  <div className="pet-seesaw__beam-inner">
                    <div className="pet-seesaw__deck">
                      <div className="pet-seesaw__end pet-seesaw__end--left">
                        <span
                          className="pet-seesaw__person"
                          aria-hidden
                        >
                          🧍
                        </span>
                      </div>
                      <div className="pet-seesaw__end pet-seesaw__end--right">
                        {showBlobOnBoard ? (
                          <div className="pet-seesaw__blob-on-board">
                            <BlobPet
                              petName={petName}
                              hue={blobColors.hue}
                              saturation={blobColors.saturation}
                              lightness={blobColors.lightness}
                              scale={blobVisualScale}
                              mood="idle"
                              reaction="none"
                              quip=""
                              tierLabel={tierLabel}
                              showQuip={false}
                              compactGround
                            />
                          </div>
                        ) : (
                          <span className="pet-seesaw__empty" aria-hidden />
                        )}
                      </div>
                    </div>
                    <div className="pet-seesaw__plank" aria-hidden />
                  </div>

                  {showFallingBlob ? (
                    <div className="pet-seesaw__blob-fall" aria-hidden>
                      <div className="pet-seesaw__blob-fall-inner">
                        <BlobPet
                          petName={petName}
                          hue={blobColors.hue}
                          saturation={blobColors.saturation}
                          lightness={blobColors.lightness}
                          scale={blobVisualScale}
                          mood="idle"
                          reaction="none"
                          quip=""
                          tierLabel={tierLabel}
                          showQuip={false}
                          compactGround
                        />
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="pet-seesaw__fulcrum" aria-hidden />
              </div>
            </div>
          </div>

          <div className="pet-play__drop-col">
            {phase === "settled" ? (
              <button
                type="button"
                className="pet-play__btn pet-play__btn--secondary"
                onClick={dropAgain}
              >
                Reset
              </button>
            ) : null}
            <button
              type="button"
              className="pet-play__btn"
              onClick={handleDrop}
              disabled={phase === "animating"}
            >
              Drop
            </button>
          </div>
        </div>

        {blobTooSmall ? (
          <p className="pet-play__hint pet-play__hint--warn">
            Your rock is still <strong>tiny</strong>. Complete quests and earn XP to
            grow it — then the seesaw will really launch you.{" "}
            <Link to="/quests">Go to Quests →</Link>
          </p>
        ) : (
          <p className="pet-play__hint">
            After the drop, the board tips toward whoever&apos;s heavier — you or{" "}
            {petName}.
          </p>
        )}

        <hr className="pet-play__divider" aria-hidden />

        <PetMineralCare
          petName={petName}
          totalXP={totalXP}
          petMineralBalance={petMineralBalance}
          petUnlockedTints={petUnlockedTints}
          petTintIndex={petTintIndex}
          petFeedCount={petFeedCount}
          appState={appState}
          onFeedMineral={onFeedPetMineral}
          onUnlockTint={onUnlockPetTint}
          onSelectTint={onSelectPetTint}
          onAwardQuizMineral={onAwardQuizMineral}
        />
      </section>
    </>
  );
}

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import BlobPet from "./BlobPet";
import {
  DEFAULT_PET_NAME,
  PET_CELEBRATE_TASK_EVENT,
  PET_FEED_MINERAL_EVENT,
} from "../hooks/useQuestState";
import { getBlobColors, getRockAppearance, RARITY_TIERS } from "../utils/rockAppearance";
import { getQuip } from "../utils/blobPetQuips";

const POSITION_KEY = "pet-rock-position-free-v2";

function loadSaved() {
  try {
    const raw = localStorage.getItem(POSITION_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (typeof p.left === "number" && typeof p.top === "number") {
        return { left: p.left, top: p.top };
      }
    }
    const legacy = localStorage.getItem("pet-rock-position-v1");
    if (legacy) {
      const p = JSON.parse(legacy);
      if (typeof p.left === "number" && typeof p.top === "number") {
        return { left: p.left, top: p.top };
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function savePosition(left, top) {
  try {
    localStorage.setItem(POSITION_KEY, JSON.stringify({ left, top }));
  } catch {
    // ignore
  }
}

function clampPosition(left, top, width, height) {
  const pad = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return {
    left: Math.min(Math.max(pad, left), vw - width - pad),
    top: Math.min(Math.max(pad, top), vh - height - pad),
  };
}

/**
 * Fixed overlay: draggable pet rock (eyes, mood, reactions, quips).
 * With no saved position, starts centered on `anchorRef` (off-screen home anchor).
 */
function PetRockFixed({
  totalXP,
  rockScale,
  petName = DEFAULT_PET_NAME,
  petTintIndex = 0,
  anchorRef,
}) {
  const { tierLabel, scale } = getRockAppearance(totalXP, rockScale, {
    maxScale: 2.75,
  });
  const blobColors = getBlobColors(totalXP, { tintIndex: petTintIndex });

  const [mood, setMood] = useState("idle");
  const [reaction, setReaction] = useState("none");
  const [quip, setQuip] = useState(() => getQuip("idle", tierLabel));

  const initialSaved = useMemo(() => loadSaved(), []);

  const rootRef = useRef(null);
  const dragRef = useRef(null);
  const posRef = useRef({ left: 0, top: 0 });
  const pointerStartRef = useRef({ x: 0, y: 0 });
  const dragMovedRef = useRef(false);

  const [pos, setPos] = useState(() => initialSaved ?? { left: 0, top: 0 });
  const [visible, setVisible] = useState(initialSaved !== null);
  const [xpPop, setXpPop] = useState(null);
  const [celebrate, setCelebrate] = useState(false);
  const [tierPop, setTierPop] = useState(null);

  const prevXpRef = useRef(null);
  const prevTierRef = useRef(null);
  const tierLabelRef = useRef(tierLabel);
  tierLabelRef.current = tierLabel;
  const xpPartyTimersRef = useRef([]);

  useEffect(() => {
    posRef.current = pos;
  }, [pos]);

  const clearXpPartyTimers = useCallback(() => {
    xpPartyTimersRef.current.forEach(clearTimeout);
    xpPartyTimersRef.current = [];
  }, []);

  /** XP from completing tasks (dispatched from quest state) → excited + pop + quip */
  const runXpCelebration = useCallback(
    (delta) => {
      const d = Number(delta);
      if (!Number.isFinite(d) || d <= 0) return;

      clearXpPartyTimers();
      const tl = tierLabelRef.current;

      setXpPop(`+${Math.round(d)} XP`);
      setCelebrate(true);
      setMood("excited");
      setReaction("xp");
      setQuip(getQuip("xp"));

      const push = (fn, ms) => {
        xpPartyTimersRef.current.push(window.setTimeout(fn, ms));
      };
      push(() => setXpPop(null), 1300);
      push(() => setCelebrate(false), 550);
      push(() => setReaction("none"), 700);
      push(() => {
        setMood((m) => (m === "excited" ? "happy" : m));
      }, 380);
      push(() => {
        setMood("idle");
        setQuip(getQuip("idle", tierLabelRef.current));
      }, 3400);
    },
    [clearXpPartyTimers],
  );

  useEffect(() => {
    function onTaskCelebration(e) {
      const xp = e?.detail?.xp;
      runXpCelebration(xp);
    }
    window.addEventListener(PET_CELEBRATE_TASK_EVENT, onTaskCelebration);
    return () => window.removeEventListener(PET_CELEBRATE_TASK_EVENT, onTaskCelebration);
  }, [runXpCelebration]);

  useEffect(() => {
    function onFeedMineral() {
      clearXpPartyTimers();
      setMood("happy");
      setReaction("love");
      setQuip(getQuip("love"));
      const t1 = window.setTimeout(() => setReaction("none"), 750);
      const t2 = window.setTimeout(() => {
        setMood("idle");
        setQuip(getQuip("idle", tierLabelRef.current));
      }, 2600);
      xpPartyTimersRef.current.push(t1, t2);
    }
    window.addEventListener(PET_FEED_MINERAL_EVENT, onFeedMineral);
    return () => window.removeEventListener(PET_FEED_MINERAL_EVENT, onFeedMineral);
  }, [clearXpPartyTimers]);

  useEffect(() => () => clearXpPartyTimers(), [clearXpPartyTimers]);

  /** Tier up → love + sparkles (driven by totalXP / tier label changes) */
  useEffect(() => {
    if (prevXpRef.current === null) {
      prevXpRef.current = totalXP;
      prevTierRef.current = tierLabel;
      return;
    }

    const timers = [];

    if (prevTierRef.current !== tierLabel) {
      const oldIdx = RARITY_TIERS.findIndex((t) => t.label === prevTierRef.current);
      const newIdx = RARITY_TIERS.findIndex((t) => t.label === tierLabel);
      if (newIdx > oldIdx) {
        setTierPop(`🎉 ${tierLabel}!`);
        setMood("love");
        setReaction("tier");
        setQuip(getQuip("tier"));
        timers.push(window.setTimeout(() => setTierPop(null), 2200));
        timers.push(window.setTimeout(() => setReaction("none"), 950));
        timers.push(
          window.setTimeout(() => {
            setMood("happy");
            setQuip(getQuip("happy"));
          }, 400),
        );
        timers.push(
          window.setTimeout(() => {
            setMood("idle");
            setQuip(getQuip("idle", tierLabel));
          }, 4500),
        );
      }
      prevTierRef.current = tierLabel;
    }

    prevXpRef.current = totalXP;

    return () => timers.forEach(clearTimeout);
  }, [totalXP, tierLabel]);

  const triggerBoop = useCallback(() => {
    setMood("happy");
    setReaction("boop");
    setQuip(getQuip("click"));
    window.setTimeout(() => setReaction("none"), 420);
    window.setTimeout(() => {
      setMood("idle");
      setQuip(getQuip("idle", tierLabel));
    }, 2400);
  }, [tierLabel]);

  const updateMetricsAndClamp = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    setPos((p) => {
      const next = clampPosition(p.left, p.top, w, h);
      posRef.current = next;
      return next;
    });
  }, []);

  useLayoutEffect(() => {
    if (initialSaved !== null) {
      updateMetricsAndClamp();
      return;
    }

    function tryPlace() {
      const block = rootRef.current;
      const anchor = anchorRef?.current;
      if (!block || !anchor) return false;

      const ar = anchor.getBoundingClientRect();
      if (ar.width < 8 || ar.height < 8) return false;

      const bw = block.offsetWidth;
      const bh = block.offsetHeight;
      const left = ar.left + (ar.width - bw) / 2;
      const top = ar.top + (ar.height - bh) / 2;
      const next = clampPosition(left, top, bw, bh);
      posRef.current = next;
      setPos(next);
      queueMicrotask(() => setVisible(true));
      return true;
    }

    if (tryPlace()) return;

    const raf = requestAnimationFrame(() => tryPlace());
    const t = window.setTimeout(() => tryPlace(), 80);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [anchorRef, initialSaved, updateMetricsAndClamp]);

  useEffect(() => {
    function onResize() {
      updateMetricsAndClamp();
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [updateMetricsAndClamp]);

  const onPointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    const el = rootRef.current;
    if (!el) return;
    dragMovedRef.current = false;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    const rect = el.getBoundingClientRect();
    dragRef.current = {
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };
    el.setPointerCapture(e.pointerId);
    el.classList.add("pet-rock-fixed--dragging");
  }, []);

  const onPointerMove = useCallback((e) => {
    if (!dragRef.current) return;
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 10) {
      dragMovedRef.current = true;
    }
    const el = rootRef.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const left = e.clientX - dragRef.current.offsetX;
    const top = e.clientY - dragRef.current.offsetY;
    const next = clampPosition(left, top, w, h);
    posRef.current = next;
    setPos(next);
  }, []);

  const endDrag = useCallback(
    (e) => {
      if (!dragRef.current) return;
      dragRef.current = null;
      const el = rootRef.current;
      try {
        if (el && e?.pointerId != null && el.hasPointerCapture(e.pointerId)) {
          el.releasePointerCapture(e.pointerId);
        }
      } catch {
        // ignore
      }
      el?.classList.remove("pet-rock-fixed--dragging");
      savePosition(posRef.current.left, posRef.current.top);
      if (!dragMovedRef.current) {
        triggerBoop();
      }
    },
    [triggerBoop],
  );

  const reactionKey =
    celebrate && reaction === "none" ? "celebrate" : reaction;

  return (
    <div
      ref={rootRef}
      className="pet-rock-fixed"
      style={{
        left: pos.left,
        top: pos.top,
        right: "auto",
        bottom: "auto",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
      }}
      role="img"
      aria-label={`Pet rock. Mood ${mood}. Rarity ${tierLabel}. Drag to move; tap without dragging for a reaction.`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {xpPop ? (
        <span className="pet-rock-fixed__xp-pop" key={xpPop}>
          {xpPop}
        </span>
      ) : null}
      {tierPop ? (
        <span className="pet-rock-fixed__tier-pop" role="status">
          {tierPop}
        </span>
      ) : null}
      <div
        className={`pet-rock-fixed__rock-wrap${celebrate ? " pet-rock-fixed__rock-wrap--celebrate" : ""
          }`}
      >
        <BlobPet
          hue={blobColors.hue}
          saturation={blobColors.saturation}
          lightness={blobColors.lightness}
          scale={scale}
          mood={mood}
          reaction={reactionKey}
          quip={quip}
          tierLabel={tierLabel}
          petName={petName}
        />
      </div>
      <span className="pet-rock-fixed__caption">
        {petName} · {tierLabel}
      </span>
      {/* <span className="pet-rock-fixed__drag-hint">Drag anywhere · tap to boop</span> */}
    </div>
  );
}

export default PetRockFixed;

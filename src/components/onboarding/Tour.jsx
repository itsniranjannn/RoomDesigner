import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle } from 'lucide-react';
import { Button } from '../common/Button.jsx';
import { TOUR_STEPS } from './tourSteps.js';
import {
  TOUR_EVENT,
  initialTourState,
  markTourSeen,
  requestTour,
  shouldAutoStart,
  tourReducer,
} from './tourState.js';
import styles from './Tour.module.css';

const CARD_WIDTH = 320;
const MARGIN = 12;
const GAP = 14;
const START_DELAY_MS = 700;

/** The element a step points at, or null when it is missing or not on screen. */
function findTarget(selector) {
  if (!selector) return null;
  const el = document.querySelector(selector);
  if (!el || el.closest('[inert]')) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 4 || r.height < 4) return null;
  const onScreen =
    r.right > 0 && r.bottom > 0 && r.left < window.innerWidth && r.top < window.innerHeight;
  return onScreen ? el : null;
}

/** Place the card beside the target on the preferred side, falling back to the others. */
function placeCard(rect, card, preferred) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const fitsX = (x) => x >= MARGIN && x + card.width <= vw - MARGIN;
  const fitsY = (y) => y >= MARGIN && y + card.height <= vh - MARGIN;
  const clampX = (x) => Math.min(Math.max(x, MARGIN), Math.max(MARGIN, vw - card.width - MARGIN));
  const clampY = (y) => Math.min(Math.max(y, MARGIN), Math.max(MARGIN, vh - card.height - MARGIN));
  const cx = rect.left + rect.width / 2 - card.width / 2;
  const cy = rect.top + rect.height / 2 - card.height / 2;
  const options = {
    bottom: { left: clampX(cx), top: rect.bottom + GAP, ok: fitsY(rect.bottom + GAP) },
    top: {
      left: clampX(cx),
      top: rect.top - GAP - card.height,
      ok: fitsY(rect.top - GAP - card.height),
    },
    right: { left: rect.right + GAP, top: clampY(cy), ok: fitsX(rect.right + GAP) },
    left: {
      left: rect.left - GAP - card.width,
      top: clampY(cy),
      ok: fitsX(rect.left - GAP - card.width),
    },
  };
  const order = [preferred, 'bottom', 'right', 'left', 'top'];
  const pick = order.map((side) => options[side]).find((o) => o && o.ok);
  if (pick) return { left: pick.left, top: pick.top };
  return null; // nowhere beside it: caller centers the card
}

/**
 * First-run tour. Non-modal: the page stays usable, the card is a small floating dialog,
 * and Esc, the arrow keys, Skip and the buttons all work. `kind` is 'room' or 'flat'.
 * Starts by itself once per kind, and any time via requestTour(kind).
 */
export function Tour({ kind, launcher = false }) {
  const steps = TOUR_STEPS[kind];
  const [state, dispatch] = useReducer(tourReducer, initialTourState);
  const [box, setBox] = useState(null); // { ring: DOMRect|null, left, top, centered }
  const cardRef = useRef(null);
  const returnFocus = useRef(null);
  const titleId = useId();
  const bodyId = useId();
  const step = state.open ? steps[state.index] : null;

  const start = useCallback(() => {
    returnFocus.current = document.activeElement;
    dispatch({ type: 'start', count: steps.length });
  }, [steps.length]);

  // First visit: open once the editor has settled
  useEffect(() => {
    if (!shouldAutoStart(kind)) return undefined;
    const id = setTimeout(() => {
      if (!shouldAutoStart(kind)) return;
      // Never open over a dialog the user already opened
      if (document.querySelector('[aria-modal="true"]')) return;
      start();
    }, START_DELAY_MS);
    return () => clearTimeout(id);
  }, [kind, start]);

  // Re-open on request (Take the tour)
  useEffect(() => {
    const onRequest = (e) => {
      if (e.detail?.kind !== kind) return;
      e.detail.handled = true;
      start();
    };
    window.addEventListener(TOUR_EVENT, onRequest);
    return () => window.removeEventListener(TOUR_EVENT, onRequest);
  }, [kind, start]);

  // Remember completion the moment it is skipped or finished
  useEffect(() => {
    if (state.finished) {
      markTourSeen(kind);
      const back = returnFocus.current;
      if (back && document.contains(back) && back.focus) back.focus();
    }
  }, [state.finished, kind]);

  // Opening counts as seen too, so a reload mid-tour does not nag again
  useEffect(() => {
    if (state.open) markTourSeen(kind);
  }, [state.open, kind]);

  // Keyboard: Esc skips, arrows move. Arrows leave the canvas alone unless focus is on the card.
  useEffect(() => {
    if (!state.open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        dispatch({ type: 'close' });
        return;
      }
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      const active = document.activeElement;
      const inCard = cardRef.current?.contains(active);
      const idle = !active || active === document.body;
      if (!inCard && !idle) return;
      e.preventDefault();
      e.stopPropagation();
      dispatch({ type: e.key === 'ArrowRight' ? 'next' : 'prev' });
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [state.open]);

  // Position the card against its target; follow resizes and scrolling
  useLayoutEffect(() => {
    if (!step) return undefined;
    const update = () => {
      const card = cardRef.current;
      if (!card) return;
      const size = { width: card.offsetWidth, height: card.offsetHeight };
      const target = findTarget(step.target);
      if (!target) {
        setBox({ ring: null, centered: true });
        return;
      }
      const rect = target.getBoundingClientRect();
      const spot = placeCard(rect, size, step.placement);
      setBox({
        ring: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        ...(spot || { centered: true }),
      });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    const watch = setInterval(update, 500); // panels can open or close under the tip
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      clearInterval(watch);
    };
  }, [step]);

  // Focus moves into the card when it opens; later steps keep focus on the same button
  const focusedOnce = useRef(false);
  useEffect(() => {
    if (!state.open) {
      focusedOnce.current = false;
      return;
    }
    if (focusedOnce.current) return;
    focusedOnce.current = true;
    cardRef.current?.querySelector('[data-tour-primary]')?.focus({ preventScroll: true });
  }, [state.open]);

  const last = state.open && state.index === steps.length - 1;

  const launcherButton = launcher && !state.open && (
    <button
      type="button"
      className={styles.launcher}
      onClick={() => requestTour(kind)}
      aria-label="Take the tour"
      title="Take the tour (?)"
    >
      <HelpCircle size={18} aria-hidden="true" />
    </button>
  );

  // The launcher's "?" shortcut for views that have no shortcuts dialog
  useEffect(() => {
    if (!launcher) return undefined;
    const onKey = (e) => {
      if (e.key !== '?' || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = document.activeElement;
      if (el && (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName) || el.isContentEditable))
        return;
      if (document.querySelector('[aria-modal="true"]')) return;
      requestTour(kind);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [launcher, kind]);

  if (!state.open) return launcherButton || null;

  const cardStyle = box?.centered
    ? { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
    : { left: box?.left ?? -9999, top: box?.top ?? -9999 };

  return (
    <>
      {launcherButton}
      {createPortal(
        <div className={styles.layer}>
          {box?.ring && (
            <div
              className={styles.ring}
              aria-hidden="true"
              style={{
                left: box.ring.left - 4,
                top: box.ring.top - 4,
                width: box.ring.width + 8,
                height: box.ring.height + 8,
              }}
            />
          )}
          <div
            ref={cardRef}
            className={styles.card}
            style={{ ...cardStyle, width: Math.min(CARD_WIDTH, window.innerWidth - 2 * MARGIN) }}
            role="dialog"
            aria-modal="false"
            aria-labelledby={titleId}
            aria-describedby={bodyId}
            data-tour-card
          >
            <p className={styles.progress}>
              Step {state.index + 1} of {steps.length}
            </p>
            <div aria-live="polite">
              <h2 id={titleId} className={styles.title}>
                {step.title}
              </h2>
              <p id={bodyId} className={styles.body}>
                {step.body}
              </p>
            </div>
            <div className={styles.actions}>
              <Button
                size="small"
                variant="ghost"
                onClick={() => dispatch({ type: 'close' })}
                aria-keyshortcuts="Escape"
              >
                Skip tour
              </Button>
              <span className={styles.spacer} />
              {state.index > 0 && (
                <Button size="small" onClick={() => dispatch({ type: 'prev' })}>
                  Back
                </Button>
              )}
              <Button
                size="small"
                variant="primary"
                data-tour-primary
                onClick={() => dispatch({ type: 'next' })}
              >
                {last ? 'Done' : 'Next'}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

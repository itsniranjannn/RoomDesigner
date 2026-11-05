/**
 * Drag a catalog card into the room with pointer events, so it works with a mouse, a pen and a finger
 * (HTML5 drag and drop does not start from touch). A mouse drag starts after a few pixels of movement; a
 * finger needs a short press first, so swiping the list still scrolls it. A ghost follows the pointer and, on
 * release over an element marked `data-furniture-drop`, a `furniture-drop` event is dispatched on it with
 * `{ id, clientX, clientY }`.
 */
export const DROP_ATTRIBUTE = 'data-furniture-drop';
const MOUSE_SLOP = 6;
const TOUCH_SLOP = 10;
const HOLD_MS = 320;

/** True for a moment after a drag ended, so the card's click handler does not also add the piece. */
export function wasJustDragged(el) {
  return el?.dataset?.dragged === '1';
}

export function startPointerDrag(event, { id, label, onStart, onEnd }) {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  const card = event.currentTarget;
  const pointerId = event.pointerId;
  const touch = event.pointerType !== 'mouse';
  const origin = { x: event.clientX, y: event.clientY };
  let dragging = false;
  let ghost = null;
  let hold = null;
  let over = null;

  const place = (x, y) => {
    if (ghost) ghost.style.transform = `translate(${x + 12}px, ${y + 12}px)`;
  };
  // The room can sit under the drawer's scrim, so look through everything stacked at the point
  const targetAt = (x, y) =>
    document
      .elementsFromPoint(x, y)
      .map((el) => el.closest?.(`[${DROP_ATTRIBUTE}]`))
      .find(Boolean);
  const blockScroll = (e) => e.cancelable && e.preventDefault();

  const begin = (x, y) => {
    dragging = true;
    ghost = document.createElement('div');
    ghost.textContent = label;
    ghost.setAttribute('aria-hidden', 'true');
    Object.assign(ghost.style, {
      position: 'fixed',
      left: '0',
      top: '0',
      zIndex: '10000',
      pointerEvents: 'none',
      padding: '6px 12px',
      font: '600 13px var(--font-body, sans-serif)',
      color: '#fff',
      background: 'rgba(34, 24, 14, 0.88)',
      borderRadius: '999px',
      boxShadow: '0 6px 18px rgba(0,0,0,0.3)',
      whiteSpace: 'nowrap',
    });
    document.body.appendChild(ghost);
    document.addEventListener('touchmove', blockScroll, { passive: false });
    place(x, y);
    onStart?.();
  };

  const finish = (e, drop) => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', cancel);
    document.removeEventListener('touchmove', blockScroll);
    clearTimeout(hold);
    over?.removeAttribute('data-drop-over');
    if (ghost) ghost.remove();
    if (dragging) {
      card.dataset.dragged = '1';
      setTimeout(() => delete card.dataset.dragged, 0);
      const target = drop ? targetAt(e.clientX, e.clientY) : null;
      if (target)
        target.dispatchEvent(
          new CustomEvent('furniture-drop', {
            detail: { id, clientX: e.clientX, clientY: e.clientY },
          })
        );
      onEnd?.(!!target);
    }
  };

  function move(e) {
    if (e.pointerId !== pointerId) return;
    const dist = Math.hypot(e.clientX - origin.x, e.clientY - origin.y);
    if (!dragging) {
      if (touch) {
        // moving before the press timer fires means the user is scrolling the list
        if (dist > TOUCH_SLOP) finish(e, false);
        return;
      }
      if (dist < MOUSE_SLOP) return;
      begin(e.clientX, e.clientY);
    }
    e.preventDefault();
    place(e.clientX, e.clientY);
    const target = targetAt(e.clientX, e.clientY) || null;
    if (target !== over) {
      over?.removeAttribute('data-drop-over');
      target?.setAttribute('data-drop-over', '');
      over = target;
    }
  }
  function up(e) {
    if (e.pointerId !== pointerId) return;
    // a pointer that reports only its end position (no moves) still counts as a drag
    if (!dragging && !touch && Math.hypot(e.clientX - origin.x, e.clientY - origin.y) >= MOUSE_SLOP)
      begin(e.clientX, e.clientY);
    finish(e, true);
  }
  function cancel(e) {
    if (e.pointerId === pointerId) finish(e, false);
  }

  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', cancel);
  if (touch) hold = setTimeout(() => begin(origin.x, origin.y), HOLD_MS);
}

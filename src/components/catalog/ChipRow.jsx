import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './FurnitureCatalog.module.css';

/**
 * A single row of filter chips that scrolls sideways: mouse wheel, click-and-drag, touch swipe, arrow keys,
 * chevron buttons, and fading edges that show there is more. The active chip is scrolled into view.
 * @param {{ chips: Array<{id: string, label: string}>, value: string, onChange: (id: string) => void, label: string }} props
 */
export function ChipRow({ chips, value, onChange, label }) {
  const ref = useRef(null);
  const drag = useRef(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdges({
      left: el.scrollLeft > 2,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2,
    });
  }, []);

  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure, chips.length]);

  // Keep the chosen chip visible
  useEffect(() => {
    const el = ref.current?.querySelector('[aria-pressed="true"]');
    el?.scrollIntoView?.({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
  }, [value]);

  const scrollBy = (dir) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: 'smooth' });
  };

  // The wheel scrolls sideways; non-passive so the page does not scroll along with it
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      if (el.scrollWidth <= el.clientWidth) return;
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (!delta) return;
      e.preventDefault();
      el.scrollLeft += delta;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const onPointerDown = (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag.current = { x: e.clientX, left: ref.current.scrollLeft, moved: false };
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 4) {
      d.moved = true;
      ref.current.scrollLeft = d.left - dx;
    }
  };
  const endDrag = (e) => {
    const d = drag.current;
    drag.current = null;
    // some pointers report only the end position: apply the whole drag now
    if (d && !d.moved && e?.clientX !== undefined && Math.abs(e.clientX - d.x) > 4 && ref.current) {
      d.moved = true;
      ref.current.scrollLeft = d.left - (e.clientX - d.x);
    }
    // a drag must not count as a click on the chip under the pointer
    if (d?.moved && ref.current) {
      ref.current.dataset.dragged = '1';
      setTimeout(() => {
        if (ref.current) delete ref.current.dataset.dragged;
      }, 0);
    }
  };

  const onKeyDown = (e) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
    const buttons = [...ref.current.querySelectorAll('button')];
    const i = buttons.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    let next = i;
    if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = buttons.length - 1;
    else next = Math.max(0, Math.min(buttons.length - 1, i + (e.key === 'ArrowRight' ? 1 : -1)));
    buttons[next].focus();
    buttons[next].scrollIntoView?.({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
  };

  const fade = `${edges.left ? styles.fadeLeft : ''} ${edges.right ? styles.fadeRight : ''}`;

  return (
    <div className={styles.chipWrap}>
      {edges.left && (
        <button
          type="button"
          className={`${styles.chev} ${styles.chevLeft}`}
          aria-label="Scroll categories left"
          tabIndex={-1}
          onClick={() => scrollBy(-1)}
        >
          <ChevronLeft size={16} />
        </button>
      )}
      <div
        ref={ref}
        className={`${styles.chips} ${fade}`}
        role="group"
        aria-label={label}
        onScroll={measure}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        onClickCapture={(e) => {
          if (ref.current?.dataset.dragged) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            className={`${styles.chip} ${value === chip.id ? styles.chipOn : ''}`}
            aria-pressed={value === chip.id}
            onClick={() => onChange(chip.id)}
          >
            {chip.label}
          </button>
        ))}
      </div>
      {edges.right && (
        <button
          type="button"
          className={`${styles.chev} ${styles.chevRight}`}
          aria-label="Scroll categories right"
          tabIndex={-1}
          onClick={() => scrollBy(1)}
        >
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}

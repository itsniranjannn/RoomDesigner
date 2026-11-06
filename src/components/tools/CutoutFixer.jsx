import React, { useEffect, useRef, useState } from 'react';
import { Brush, Eraser, Crop, Undo2, RotateCcw, Check } from 'lucide-react';
import { Button } from '../common/Button.jsx';
import local from './CutoutFixer.module.css';

const MIN_CROP = 0.08;
const clamp01 = (v) => Math.min(1, Math.max(0, v));

/** The edits that mean "nothing changed" for a photo. */
export const NO_EDITS = { crop: null, keep: [], remove: [] };

/**
 * "Fix the cut-out": the photo with the cut-out drawn over it, a crop box ("Crop to the piece") and Keep / Remove
 * brushes. Everything is in fractions of the photo, so the edits survive a resize and apply at any resolution.
 * Works with a mouse, a finger or the keyboard (arrow keys move the brush or the crop box).
 */
export function CutoutFixer({ photo, mask, edits, onChange, onClose, label, busy }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [tool, setTool] = useState('keep');
  const [size, setSize] = useState(0.06);
  const [live, setLive] = useState(null); // stroke being drawn: { mode, points }
  const [cursor, setCursor] = useState({ x: 0.5, y: 0.5, show: false });
  const [history, setHistory] = useState([]);
  const drag = useRef(null);

  const commit = (next) => {
    setHistory((h) => [...h.slice(-24), edits]);
    onChange(next);
  };

  // The photo, with what is not part of the cut-out dimmed, so the cut can be judged at a glance
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !photo) return;
    canvas.width = photo.width;
    canvas.height = photo.height;
    const ctx = canvas.getContext('2d');
    const image = ctx.createImageData(photo.width, photo.height);
    for (let p = 0; p < mask.length; p++) {
      const i = p * 4;
      const on = mask[p];
      image.data[i] = on ? photo.rgba[i] : photo.rgba[i] * 0.35 + 150;
      image.data[i + 1] = on ? photo.rgba[i + 1] : photo.rgba[i + 1] * 0.35 + 110;
      image.data[i + 2] = on ? photo.rgba[i + 2] : photo.rgba[i + 2] * 0.35 + 140;
      image.data[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    const long = Math.max(photo.width, photo.height);
    const draw = (s, color) => {
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(2, s.size * long);
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      s.points.forEach(([x, y], k) =>
        k
          ? ctx.lineTo(x * photo.width, y * photo.height)
          : ctx.moveTo(x * photo.width, y * photo.height)
      );
      if (s.points.length === 1)
        ctx.lineTo(s.points[0][0] * photo.width + 0.1, s.points[0][1] * photo.height);
      ctx.stroke();
      ctx.globalAlpha = 1;
    };
    // The marks already made, so it is clear what the cut-out was told
    for (const s of edits.keep) draw(s, '#16a34a');
    for (const s of edits.remove) draw(s, '#dc2626');
    if (live) draw({ points: live.points, size }, live.mode === 'keep' ? '#16a34a' : '#dc2626');
  }, [photo, mask, edits, live, size]);

  const point = (event) => {
    const rect = wrapRef.current.getBoundingClientRect();
    return [
      clamp01((event.clientX - rect.left) / rect.width),
      clamp01((event.clientY - rect.top) / rect.height),
    ];
  };

  const crop = edits.crop;
  const nearCorner = (x, y) => {
    if (!crop) return null;
    const corners = [
      ['x0', 'y0'],
      ['x1', 'y0'],
      ['x0', 'y1'],
      ['x1', 'y1'],
    ];
    return corners.find(([cx, cy]) => Math.hypot(crop[cx] - x, crop[cy] - y) < 0.06) || null;
  };

  const onPointerDown = (event) => {
    if (busy) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const [x, y] = point(event);
    if (tool === 'crop') {
      const corner = nearCorner(x, y);
      if (corner) drag.current = { kind: 'corner', corner, start: crop };
      else if (crop && x > crop.x0 && x < crop.x1 && y > crop.y0 && y < crop.y1)
        drag.current = { kind: 'move', from: [x, y], start: crop };
      else drag.current = { kind: 'new', from: [x, y] };
      setHistory((h) => [...h.slice(-24), edits]);
    } else {
      drag.current = { kind: 'brush', mode: tool };
      setLive({ mode: tool, points: [[x, y]] });
    }
  };

  const onPointerMove = (event) => {
    const [x, y] = point(event);
    setCursor({ x, y, show: true });
    const d = drag.current;
    if (!d) return;
    if (d.kind === 'brush') {
      setLive((l) => (l ? { ...l, points: [...l.points, [x, y]] } : l));
    } else if (d.kind === 'new') {
      const next = {
        x0: Math.min(d.from[0], x),
        y0: Math.min(d.from[1], y),
        x1: Math.max(d.from[0], x),
        y1: Math.max(d.from[1], y),
      };
      if (next.x1 - next.x0 > 0.01) onChange({ ...edits, crop: next });
    } else if (d.kind === 'move') {
      const dx = x - d.from[0];
      const dy = y - d.from[1];
      const w = d.start.x1 - d.start.x0;
      const h = d.start.y1 - d.start.y0;
      const x0 = Math.min(1 - w, Math.max(0, d.start.x0 + dx));
      const y0 = Math.min(1 - h, Math.max(0, d.start.y0 + dy));
      onChange({ ...edits, crop: { x0, y0, x1: x0 + w, y1: y0 + h } });
    } else if (d.kind === 'corner') {
      const next = { ...d.start, [d.corner[0]]: x, [d.corner[1]]: y };
      const fixed = {
        x0: Math.min(next.x0, next.x1),
        x1: Math.max(next.x0, next.x1),
        y0: Math.min(next.y0, next.y1),
        y1: Math.max(next.y0, next.y1),
      };
      if (fixed.x1 - fixed.x0 >= MIN_CROP && fixed.y1 - fixed.y0 >= MIN_CROP)
        onChange({ ...edits, crop: fixed });
    }
  };

  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (d?.kind === 'brush' && live) {
      const stroke = { points: live.points, size };
      setLive(null);
      commit({ ...edits, [live.mode]: [...edits[live.mode], stroke] });
    }
  };

  // Keyboard: arrows move the brush (hold Shift to paint a line) or the crop box (Shift resizes it)
  const onKeyDown = (event) => {
    const step = event.altKey ? 0.005 : 0.02;
    const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[
      event.key
    ];
    if (tool === 'crop') {
      if (!dir) return;
      event.preventDefault();
      const c = crop || { x0: 0.1, y0: 0.1, x1: 0.9, y1: 0.9 };
      let next;
      if (event.shiftKey) {
        next = { ...c, x1: clamp01(c.x1 + dir[0] * step), y1: clamp01(c.y1 + dir[1] * step) };
        if (next.x1 - next.x0 < MIN_CROP || next.y1 - next.y0 < MIN_CROP) return;
      } else {
        const dx = Math.min(1 - c.x1, Math.max(-c.x0, dir[0] * step));
        const dy = Math.min(1 - c.y1, Math.max(-c.y0, dir[1] * step));
        next = { x0: c.x0 + dx, x1: c.x1 + dx, y0: c.y0 + dy, y1: c.y1 + dy };
      }
      commit({ ...edits, crop: next });
      return;
    }
    if (dir) {
      event.preventDefault();
      const next = {
        x: clamp01(cursor.x + dir[0] * step),
        y: clamp01(cursor.y + dir[1] * step),
        show: true,
      };
      if (event.shiftKey)
        commit({
          ...edits,
          [tool]: [
            ...edits[tool],
            {
              points: [
                [cursor.x, cursor.y],
                [next.x, next.y],
              ],
              size,
            },
          ],
        });
      setCursor(next);
    } else if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      commit({ ...edits, [tool]: [...edits[tool], { points: [[cursor.x, cursor.y]], size }] });
    }
  };

  const undo = () => {
    if (!history.length) return;
    onChange(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
  };
  const reset = () => {
    setHistory([]);
    onChange(NO_EDITS);
  };
  const edited = edits.keep.length > 0 || edits.remove.length > 0 || edits.crop;
  const brushPx = size * 100;

  return (
    <div className={local.fixer} role="group" aria-label={`Fix the cut-out of the ${label} photo`}>
      <p className={local.help}>
        Paint <strong className={local.keepWord}>Keep</strong> over any furniture the cut-out missed
        and <strong className={local.removeWord}>Remove</strong> over anything that should not be
        there, or crop to the piece. The cut-out updates after each stroke.
      </p>
      <div className={local.tools} role="radiogroup" aria-label="Tool">
        {[
          ['keep', 'Keep', Brush],
          ['remove', 'Remove', Eraser],
          ['crop', 'Crop to the piece', Crop],
        ].map(([id, text, Icon]) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={tool === id}
            className={local.tool}
            data-tool={id}
            onClick={() => setTool(id)}
          >
            <Icon size={14} aria-hidden="true" /> {text}
          </button>
        ))}
      </div>
      <div
        ref={wrapRef}
        className={local.stage}
        tabIndex={0}
        role="application"
        aria-label={
          tool === 'crop'
            ? 'Crop box: arrow keys move it, Shift with arrows resizes it'
            : `Photo: arrow keys move the ${tool} brush, Space paints, Shift with arrows paints a line`
        }
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => setCursor((c) => ({ ...c, show: false }))}
        onKeyDown={onKeyDown}
        data-busy={busy ? '1' : undefined}
      >
        <canvas ref={canvasRef} className={local.canvas} aria-hidden="true" />
        {crop && (
          <div
            className={local.cropBox}
            style={{
              left: `${crop.x0 * 100}%`,
              top: `${crop.y0 * 100}%`,
              width: `${(crop.x1 - crop.x0) * 100}%`,
              height: `${(crop.y1 - crop.y0) * 100}%`,
            }}
            aria-hidden="true"
          >
            {['tl', 'tr', 'bl', 'br'].map((c) => (
              <span key={c} className={local.handle} data-corner={c} />
            ))}
          </div>
        )}
        {tool !== 'crop' && cursor.show && (
          <span
            className={local.ring}
            data-tool={tool}
            style={{
              left: `${cursor.x * 100}%`,
              top: `${cursor.y * 100}%`,
              width: `${brushPx}%`,
              aspectRatio: '1',
            }}
            aria-hidden="true"
          />
        )}
      </div>
      <div className={local.row}>
        <label className={local.size}>
          <span>Brush size</span>
          <input
            type="range"
            min={0.02}
            max={0.2}
            step={0.01}
            value={size}
            aria-label="Brush size"
            onChange={(e) => setSize(Number(e.target.value))}
          />
        </label>
        <div className={local.actions}>
          <Button
            variant="ghost"
            size="small"
            icon={<Undo2 size={14} />}
            onClick={undo}
            disabled={!history.length}
          >
            Undo
          </Button>
          {crop && (
            <Button variant="ghost" size="small" onClick={() => commit({ ...edits, crop: null })}>
              Clear crop
            </Button>
          )}
          <Button
            variant="ghost"
            size="small"
            icon={<RotateCcw size={14} />}
            onClick={reset}
            disabled={!edited}
          >
            Reset
          </Button>
          <Button variant="primary" size="small" icon={<Check size={14} />} onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
      <p className={local.status} aria-live="polite">
        {busy
          ? 'Updating the cut-out...'
          : edited
            ? 'Your changes are applied.'
            : 'No changes yet.'}
      </p>
    </div>
  );
}

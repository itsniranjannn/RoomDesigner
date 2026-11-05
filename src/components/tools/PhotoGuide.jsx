import React from 'react';
import { Button } from '../common/Button.jsx';
import local from './PhotoModelModal.module.css';

/** What to do for each photo slot, shown inside the slot while it is empty. */
export const SLOT_HINTS = {
  front: 'Straight on, camera at mid-height. Start here.',
  right: 'Turn the piece a quarter turn. Same distance.',
  back: 'Optional. Shows the back, rails and panels.',
  left: 'The other side, if it looks different.',
  top: 'From above, back of the piece at the top.',
};

const GUIDE_KEY = 'room-designer-photo-guide-seen';

/** Has the guide been shown (and dismissed) before? Browser storage may be blocked, so this never throws. */
export function guideSeen() {
  try {
    return window.localStorage.getItem(GUIDE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markGuideSeen() {
  try {
    window.localStorage.setItem(GUIDE_KEY, '1');
  } catch {
    // Storage unavailable: the guide simply shows again next time
  }
}

/** Shared frame of every diagram: the photo edge, the empty margin to keep, and the floor line. */
function Frame({ children, floor = true }) {
  return (
    <>
      <rect x="3" y="3" width="114" height="90" rx="5" className={local.diaFrame} />
      <rect x="12" y="11" width="96" height="74" rx="3" className={local.diaMargin} />
      {floor && <line x1="12" y1="78" x2="108" y2="78" className={local.diaFloor} />}
      {children}
    </>
  );
}

/** A small drawing of how a photo should be framed: 'front', 'side' or 'top'. */
export function GuideDiagram({ kind }) {
  return (
    <svg viewBox="0 0 120 96" className={local.diagram} role="img" aria-labelledby={`dia-${kind}`}>
      <title id={`dia-${kind}`}>
        {kind === 'front'
          ? 'Front photo: the whole sofa in frame with space all round, camera at mid-height'
          : kind === 'side'
            ? 'Side photo: a quarter turn, the whole sofa in frame with space all round'
            : 'Top photo: looking straight down with the back of the sofa at the top'}
      </title>
      {kind === 'front' && (
        <Frame>
          <rect x="30" y="42" width="60" height="22" rx="4" className={local.diaPiece} />
          <rect x="22" y="44" width="14" height="30" rx="5" className={local.diaPiece} />
          <rect x="84" y="44" width="14" height="30" rx="5" className={local.diaPiece} />
          <rect x="34" y="30" width="52" height="20" rx="5" className={local.diaPiece} />
          <rect x="26" y="74" width="5" height="4" className={local.diaDark} />
          <rect x="89" y="74" width="5" height="4" className={local.diaDark} />
          <line x1="12" y1="54" x2="108" y2="54" className={local.diaLevel} />
          <text x="60" y="19" textAnchor="middle" className={local.diaText}>
            camera level with the middle
          </text>
        </Frame>
      )}
      {kind === 'side' && (
        <Frame>
          <path d="M34 30 h14 v22 h40 v22 h-54 z" className={local.diaPiece} />
          <rect x="34" y="74" width="5" height="4" className={local.diaDark} />
          <rect x="83" y="74" width="5" height="4" className={local.diaDark} />
          <line x1="12" y1="54" x2="108" y2="54" className={local.diaLevel} />
          <text x="34" y="26" className={local.diaText}>
            back
          </text>
          <text x="88" y="68" textAnchor="end" className={local.diaText}>
            front
          </text>
        </Frame>
      )}
      {kind === 'top' && (
        <Frame floor={false}>
          <rect x="28" y="22" width="64" height="52" rx="5" className={local.diaPiece} />
          <rect x="28" y="22" width="64" height="12" rx="4" className={local.diaDark} />
          <rect x="28" y="22" width="9" height="52" rx="4" className={local.diaDark} />
          <rect x="83" y="22" width="9" height="52" rx="4" className={local.diaDark} />
          <text x="60" y="18" textAnchor="middle" className={local.diaText}>
            back at the top
          </text>
          <text x="60" y="82" textAnchor="middle" className={local.diaText}>
            front at the bottom
          </text>
        </Frame>
      )}
    </svg>
  );
}

/** A short, friendly guide to photographing a piece, with three framing diagrams. */
export function CaptureGuide({ onClose }) {
  return (
    <section className={local.guide} aria-label="How to photograph it">
      <div className={local.guideHead}>
        <h3 className={local.guideTitle}>How to photograph it</h3>
        <Button variant="secondary" size="small" onClick={onClose}>
          Got it
        </Button>
      </div>
      <div className={local.guideGrid}>
        {[
          ['front', 'Front', 'Stand straight in front and hold the camera level at mid-height.'],
          ['side', 'Side', 'Turn the piece a quarter turn and keep the same distance.'],
          ['top', 'Top', 'Optional. Stand on a chair and point the camera straight down.'],
        ].map(([kind, title, text]) => (
          <figure key={kind} className={local.guideItem}>
            <GuideDiagram kind={kind} />
            <figcaption>
              <strong>{title}.</strong> {text}
            </figcaption>
          </figure>
        ))}
      </div>
      <ul className={local.tips}>
        <li>Leave a little empty space all round, so no edge of the piece is cut off.</li>
        <li>Use a plain wall or sheet behind it and soft, even light without hard shadows.</li>
        <li>One front photo is enough to start. More photos make the model more accurate.</li>
      </ul>
    </section>
  );
}

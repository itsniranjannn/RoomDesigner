import React from 'react';
import { RotateCcw } from 'lucide-react';
import { useRoomStore } from '../../store/roomStore.js';
import { MOUNT_LIMITS, clampMountHeight } from '../../engine/wallMount.js';
import { patternsFor, patternKindOf, patternOf } from '../preview3d/patterns.js';
import { ArchitecturalSilhouette } from '../canvas/ArchitecturalSilhouette.jsx';
import { CurtainSwatch } from '../canvas/silhouettes/PatternPlan.jsx';
import { Button } from '../common/Button.jsx';
import { NumberField } from '../common/Field.jsx';
import { Section } from '../common/Section.jsx';
import styles from './Inspector.module.css';
import patternStyles from './PatternSection.module.css';

/** The pattern a rug or curtain is drawn with; rugs without one show the original galaicha. */
const currentPattern = (def, kind) => patternOf(def) || (kind === 'rug' ? 'classic' : 'plain');

/** Pattern picker for rugs and curtains: small previews in the piece's own colours. */
export function PatternSection({ item, def }) {
  const updateItemOverrides = useRoomStore((state) => state.updateItemOverrides);
  const kind = patternKindOf(def);
  const list = patternsFor(kind);
  if (!list) return null;
  const current = currentPattern(def, kind);
  const scale = Math.min(34 / def.widthCm, 22 / def.depthCm);
  const colors = { main: def.color, sub: def.subColor, accent: def.accentColor };

  return (
    <Section
      title="Pattern"
      action={
        item.overrides?.pattern && (
          <Button
            variant="ghost"
            size="small"
            icon={<RotateCcw size={14} />}
            onClick={() => updateItemOverrides(item.id, { pattern: null }, true)}
          >
            Reset pattern
          </Button>
        )
      }
    >
      <div className={patternStyles.grid} role="radiogroup" aria-label="Pattern">
        {list.map((p) => {
          const on = current === p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={on}
              title={p.note}
              className={`${patternStyles.option} ${on ? patternStyles.on : ''}`}
              onClick={() => updateItemOverrides(item.id, { pattern: p.id }, true)}
            >
              {kind === 'rug' ? (
                <svg className={patternStyles.preview} viewBox="-20 -13 40 26" aria-hidden="true">
                  <ArchitecturalSilhouette
                    item={{ ...def, pattern: p.id }}
                    widthCm={def.widthCm * scale}
                    depthCm={def.depthCm * scale}
                    isSwatch
                  />
                </svg>
              ) : (
                <span className={patternStyles.preview}>
                  <CurtainSwatch pattern={p.id} colors={colors} size={40} />
                </span>
              )}
              <span className={patternStyles.label}>{p.label}</span>
            </button>
          );
        })}
      </div>
      <p className={styles.note}>
        {kind === 'rug'
          ? 'The pattern uses the colours below. Pick a colour and the pattern follows it.'
          : 'The fabric uses the colour below; the stripes and checks are lighter and darker shades of it.'}
      </p>
    </Section>
  );
}

/** How high a wall piece hangs. Pieces resting on a shelf follow it. */
export function MountSection({ item, def }) {
  const setItemElevation = useRoomStore((state) => state.setItemElevation);
  if (!def?.wallMounted) return null;
  const top = Math.max(0, MOUNT_LIMITS.wallHeightCm - def.heightCm);
  const height = clampMountHeight(item.elevationCm ?? 0, def);
  return (
    <Section title="Wall mounting">
      <NumberField
        label="Hangs at"
        suffix="cm from the floor"
        value={height}
        min={0}
        max={top}
        onCommit={(v) => setItemElevation(item.id, v)}
        hint={`Bottom edge of the piece, up to ${top} cm. The piece snaps to the nearest wall when you move it.`}
      />
    </Section>
  );
}

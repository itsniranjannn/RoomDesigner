import React from 'react';
import { Palette } from 'lucide-react';
import { Popover } from '../common/Popover.jsx';
import { Button } from '../common/Button.jsx';
import { Segmented } from '../common/Field.jsx';
import { FLOORS, WALLS, CLASSIC_FLOOR, CLASSIC_WALL } from './materials.js';
import { QUALITY_OPTIONS } from './quality.js';
import styles from './MaterialsPanel.module.css';

function Swatches({ label, items, classic, value, onChange, extra }) {
  const all = [{ id: null, label: classic.label, swatch: classic.color }, ...items];
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>{label}</legend>
      <div className={styles.grid} role="radiogroup" aria-label={label}>
        {all.map((f) => {
          const on = (value ?? null) === f.id;
          return (
            <button
              key={f.id ?? 'classic'}
              type="button"
              role="radio"
              aria-checked={on}
              title={f.label}
              className={`${styles.swatch} ${on ? styles.on : ''}`}
              onClick={() => onChange(f.id)}
            >
              <span className={styles.chip} style={{ background: f.swatch }} aria-hidden="true" />
              <span className={styles.name}>{f.label}</span>
            </button>
          );
        })}
      </div>
      {extra}
    </fieldset>
  );
}

/**
 * The compact "Materials" control of the 3D views: floor, wall finish and graphics quality.
 * `floor` and `wall` are finish ids or null (classic). `floorLabel` renames the floor group in the flat view.
 */
export function MaterialsPanel({
  floor,
  wall,
  onFloor,
  onWall,
  quality,
  onQuality,
  resolvedQuality,
  floorLabel = 'Floor',
  floorNote,
  buttonClassName = '',
  textClassName = '',
  size,
}) {
  return (
    <Popover
      role="dialog"
      label="Materials and quality"
      align="end"
      direction="up"
      renderTrigger={(props) => (
        <Button
          variant="secondary"
          icon={<Palette size={16} aria-hidden="true" />}
          aria-label="Materials"
          title="Floor, walls and graphics quality"
          className={buttonClassName}
          size={size}
          {...props}
        >
          <span className={textClassName}>Materials</span>
        </Button>
      )}
    >
      <div className={styles.panel}>
        <Swatches
          label={floorLabel}
          items={FLOORS}
          classic={CLASSIC_FLOOR}
          value={floor}
          onChange={onFloor}
          extra={floorNote ? <p className={styles.note}>{floorNote}</p> : null}
        />
        <Swatches
          label="Walls"
          items={WALLS}
          classic={CLASSIC_WALL}
          value={wall}
          onChange={onWall}
        />
        <div className={styles.group}>
          <span className={styles.legend}>Graphics quality</span>
          <Segmented
            ariaLabel="Graphics quality"
            options={QUALITY_OPTIONS}
            value={quality}
            onChange={onQuality}
            size="small"
            fill
          />
          <p className={styles.note}>
            {quality === 'auto'
              ? `Auto chose ${resolvedQuality} for this device.`
              : resolvedQuality === 'low'
                ? 'Low is lightest: smaller shadows, best for phones.'
                : 'High adds soft shadows and reflected light.'}
          </p>
        </div>
      </div>
    </Popover>
  );
}

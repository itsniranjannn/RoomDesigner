import React, { Suspense, useEffect, useState } from 'react';
import {
  ChevronLeft,
  Plus,
  Trash2,
  RotateCw,
  DoorOpen,
  Layers,
  Box,
  Bath,
  Bed,
  Sofa,
  CookingPot,
  MoveVertical,
  Home,
  Footprints,
} from 'lucide-react';
import { useFlatStore } from '../../store/flatStore.js';
import { Button } from '../common/Button.jsx';
import { FlatPlanCanvas } from './FlatPlanCanvas.jsx';
import {
  SPACE_KINDS,
  STAIR_TYPES,
  stairGeometry,
  stairRunLength,
  flatSummary,
  levelIndex,
} from '../../engine/flat.js';
import styles from './FlatDesigner.module.css';

const Flat3DView = React.lazy(() => import('./Flat3DView.jsx').then((m) => ({ default: m.Flat3DView })));

const KIND_ICONS = { living: Sofa, bedroom: Bed, kitchen: CookingPot, bathroom: Bath, corridor: Footprints, room: Home };

function NumberInput({ label, value, min, max, step = 10, onCommit }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const n = Number(draft);
    if (!Number.isFinite(n) || n === value) {
      setDraft(String(value));
      return;
    }
    onCommit(Math.max(min, Math.min(max, n)));
  };
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <input
        type="number"
        className={styles.input}
        value={draft}
        min={min}
        max={max}
        step={step}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
    </label>
  );
}

function SpaceInspector({ space }) {
  const room = useFlatStore((s) => s.rooms[space.roomId]);
  const renameSpace = useFlatStore((s) => s.renameSpace);
  const resizeSpace = useFlatStore((s) => s.resizeSpace);
  const setSpaceDoorWall = useFlatStore((s) => s.setSpaceDoorWall);
  const removeSpace = useFlatStore((s) => s.removeSpace);
  const openSpace = useFlatStore((s) => s.openSpace);
  const [name, setName] = useState(space.name);
  const [error, setError] = useState(null);
  useEffect(() => setName(space.name), [space.name, space.id]);

  const resize = async (w, d) => {
    const ok = await resizeSpace(space.id, w, d);
    setError(ok ? null : 'Not enough free space: it would overlap a neighbour.');
  };

  return (
    <div className={styles.inspectorBody}>
      <div className={styles.kindTag}>{(SPACE_KINDS[space.kind] || SPACE_KINDS.room).label.toUpperCase()}</div>
      <label className={styles.field}>
        <span className={styles.label}>Name</span>
        <input
          className={styles.input}
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name !== space.name && renameSpace(space.id, name)}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
      </label>
      <div className={styles.grid2}>
        <NumberInput label="Width (cm)" value={space.widthCm} min={100} max={1500} onCommit={(w) => resize(w, space.depthCm)} />
        <NumberInput label="Depth (cm)" value={space.depthCm} min={100} max={1500} onCommit={(d) => resize(space.widthCm, d)} />
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {space.kind !== 'corridor' && (
        <label className={styles.field}>
          <span className={styles.label}>Door on wall</span>
          <select
            className={styles.input}
            value={room?.doors?.[0]?.wall || 'bottom'}
            onChange={(e) => setSpaceDoorWall(space.id, e.target.value)}
          >
            <option value="top">Top (north)</option>
            <option value="bottom">Bottom (south)</option>
            <option value="left">Left (west)</option>
            <option value="right">Right (east)</option>
          </select>
        </label>
      )}
      <p className={styles.meta}>
        {((space.widthCm * space.depthCm) / 10000).toFixed(1)} m² · {(room?.placedFurniture || []).length} pieces ·{' '}
        {(room?.doors || []).length} door(s) · {(room?.windows || []).length} window(s)
      </p>
      <Button variant="primary" size="small" icon={<DoorOpen size={13} />} onClick={() => openSpace(space.id)}>
        Customize in room designer
      </Button>
      <p className={styles.hint}>Furniture, doors, windows and 3D preview for this {SPACE_KINDS[space.kind]?.label.toLowerCase() || 'room'} open in the full room designer.</p>
      <Button
        variant="danger"
        size="small"
        icon={<Trash2 size={13} />}
        onClick={() => window.confirm(`Delete "${space.name}" and its furniture?`) && removeSpace(space.id)}
      >
        Delete space
      </Button>
    </div>
  );
}

function StairInspector({ stair }) {
  const updateStair = useFlatStore((s) => s.updateStair);
  const removeStair = useFlatStore((s) => s.removeStair);
  const g = stairGeometry(stair);
  return (
    <div className={styles.inspectorBody}>
      <div className={styles.kindTag}>STAIRCASE</div>
      <label className={styles.field}>
        <span className={styles.label}>Shape</span>
        <select className={styles.input} value={stair.type} onChange={(e) => updateStair(stair.id, { type: e.target.value })}>
          {Object.entries(STAIR_TYPES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </label>
      <div className={styles.grid2}>
        <NumberInput label="Stair width (cm)" value={stair.widthCm} min={70} max={200} onCommit={(v) => updateStair(stair.id, { widthCm: v })} />
        <NumberInput label="Floor-to-floor (cm)" value={stair.riseCm} min={200} max={450} onCommit={(v) => updateStair(stair.id, { riseCm: v })} />
      </div>
      <p className={styles.meta}>
        {g.steps} steps · riser {g.riserCm.toFixed(1)} cm · tread 27 cm · run {(stairRunLength(stair) / 100).toFixed(2)} m
      </p>
      {g.riserCm > 18 && <p className={styles.error}>Risers above 18 cm are steep. Increase the floor-to-floor allowance carefully.</p>}
      <div className={styles.grid2}>
        <Button variant="secondary" size="small" icon={<RotateCw size={13} />} onClick={() => updateStair(stair.id, { rotationDeg: (stair.rotationDeg || 0) + 90 })}>
          Rotate 90°
        </Button>
        <Button variant="danger" size="small" icon={<Trash2 size={13} />} onClick={() => removeStair(stair.id)}>
          Remove
        </Button>
      </div>
      <p className={styles.hint}>Place the stair on the lower floor. The floor above shows a matching opening.</p>
    </div>
  );
}

export function FlatDesigner() {
  const flat = useFlatStore((s) => s.flat);
  const rooms = useFlatStore((s) => s.rooms);
  const levelId = useFlatStore((s) => s.levelId);
  const selected = useFlatStore((s) => s.selected);
  const viewMode = useFlatStore((s) => s.viewMode);
  const setViewMode = useFlatStore((s) => s.setViewMode);
  const setLevel = useFlatStore((s) => s.setLevel);
  const addLevel = useFlatStore((s) => s.addLevel);
  const removeLevel = useFlatStore((s) => s.removeLevel);
  const renameLevel = useFlatStore((s) => s.renameLevel);
  const addSpace = useFlatStore((s) => s.addSpace);
  const addStair = useFlatStore((s) => s.addStair);
  const closeFlat = useFlatStore((s) => s.closeFlat);
  const renameFlat = useFlatStore((s) => s.renameFlat);
  const [name, setName] = useState(flat?.name || '');
  useEffect(() => setName(flat?.name || ''), [flat?.id, flat?.name]);

  if (!flat) return null;
  const idx = levelIndex(flat, levelId);
  const level = flat.levels[idx];
  const summary = flatSummary(flat, Object.values(rooms));
  const selSpace = selected?.type === 'space' ? flat.spaces.find((s) => s.id === selected.id) : null;
  const selStair = selected?.type === 'stair' ? flat.stairs.find((s) => s.id === selected.id) : null;

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={closeFlat} aria-label="Back to studio overview">
          <ChevronLeft size={16} /> Studio
        </button>
        <input
          className={styles.titleInput}
          value={name}
          maxLength={80}
          aria-label="Flat name"
          onChange={(e) => setName(e.target.value)}
          onBlur={() => renameFlat(name)}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
        <nav className={styles.levels} aria-label="Floors">
          {flat.levels.map((l) => (
            <button
              key={l.id}
              type="button"
              className={`${styles.levelTab} ${l.id === levelId ? styles.levelTabActive : ''}`}
              onClick={() => setLevel(l.id)}
              aria-pressed={l.id === levelId}
            >
              {l.name}
            </button>
          ))}
          <button type="button" className={styles.levelAdd} onClick={addLevel} disabled={flat.levels.length >= 6} aria-label="Add a floor" title="Add a floor">
            <Plus size={13} />
          </button>
        </nav>
        <div className={styles.viewToggle} role="group" aria-label="View mode">
          <button type="button" className={viewMode === '2d' ? styles.toggleOn : ''} onClick={() => setViewMode('2d')} aria-pressed={viewMode === '2d'}>
            <Layers size={13} /> Plan
          </button>
          <button type="button" className={viewMode === '3d' ? styles.toggleOn : ''} onClick={() => setViewMode('3d')} aria-pressed={viewMode === '3d'}>
            <Box size={13} /> 3D
          </button>
        </div>
      </header>

      <div className={styles.body}>
        <aside className={styles.palette} aria-label="Add to flat">
          <h2 className={styles.paletteTitle}>Add to {level?.name}</h2>
          <div className={styles.paletteList}>
            {Object.entries(SPACE_KINDS).map(([kind, def]) => {
              const Icon = KIND_ICONS[kind] || Home;
              return (
                <button key={kind} type="button" className={styles.paletteBtn} onClick={() => addSpace(kind)}>
                  <Icon size={16} />
                  <span>
                    <strong>{def.label}</strong>
                    <small>{(def.widthCm / 100).toFixed(1)} × {(def.depthCm / 100).toFixed(1)} m</small>
                  </span>
                </button>
              );
            })}
          </div>
          <h2 className={styles.paletteTitle}>Staircases</h2>
          <div className={styles.paletteList}>
            {Object.entries(STAIR_TYPES).map(([type, label]) => (
              <button key={type} type="button" className={styles.paletteBtn} onClick={() => addStair(type)}>
                <MoveVertical size={16} />
                <span><strong>{label}</strong><small>connects to the floor above</small></span>
              </button>
            ))}
          </div>
          <p className={styles.hint}>
            Drag to move · corner handle to resize · double-click a room to furnish it. Rooms snap flush to each other.
          </p>
        </aside>

        <main className={styles.stage}>
          {viewMode === '2d' ? (
            <FlatPlanCanvas />
          ) : (
            <Suspense fallback={<div className={styles.loading}>Loading 3D…</div>}>
              <Flat3DView />
            </Suspense>
          )}
        </main>

        <aside className={styles.inspector} aria-label="Inspector">
          {selSpace ? (
            <SpaceInspector space={selSpace} />
          ) : selStair ? (
            <StairInspector stair={selStair} />
          ) : (
            <div className={styles.inspectorBody}>
              <div className={styles.kindTag}>FLAT SUMMARY</div>
              <h2 className={styles.summaryTitle}>{flat.name}</h2>
              <dl className={styles.summary}>
                <div><dt>Total area</dt><dd>{summary.areaM2.toFixed(1)} m²</dd></div>
                <div><dt>Floors</dt><dd>{summary.levels}</dd></div>
                <div><dt>Spaces</dt><dd>{flat.spaces.length}</dd></div>
                <div><dt>Staircases</dt><dd>{summary.stairs}</dd></div>
                <div><dt>Furniture</dt><dd>{summary.furnitureCount}</dd></div>
              </dl>
              <label className={styles.field}>
                <span className={styles.label}>Floor name</span>
                <input
                  className={styles.input}
                  defaultValue={level?.name}
                  key={level?.id + level?.name}
                  maxLength={40}
                  onBlur={(e) => renameLevel(level.id, e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                />
              </label>
              {flat.levels.length > 1 && (
                <Button
                  variant="danger"
                  size="small"
                  icon={<Trash2 size={13} />}
                  onClick={() => window.confirm(`Remove "${level.name}" and all its rooms?`) && removeLevel(level.id)}
                >
                  Remove this floor
                </Button>
              )}
              <p className={styles.hint}>Select a room or staircase to edit it.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

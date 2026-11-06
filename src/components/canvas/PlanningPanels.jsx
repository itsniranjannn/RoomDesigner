import React, { useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  Info,
  RotateCw,
  Trash2,
  X,
} from 'lucide-react';
import { useRoomStore } from '../../store/roomStore.js';
import { usePlanningStore } from '../../store/planningStore.js';
import {
  SERVICE_GROUPS,
  SERVICE_KINDS,
  kindsInGroup,
  serviceLabels,
  servicesOf,
} from '../../engine/planning.js';
import { SEVERITY_LABELS } from '../../engine/planningChecks.js';
import { Button } from '../common/Button.jsx';
import { Switch, TextField } from '../common/Field.jsx';
import { ServiceIcon } from './serviceSymbols.jsx';
import styles from './PlanningPanels.module.css';

// Clicks on a panel must not reach the plan underneath (that would clear the selection)
const stop = { onClick: (e) => e.stopPropagation(), onPointerDown: (e) => e.stopPropagation() };

function PanelShell({ title, label, onClose, children }) {
  const side = usePlanningStore((s) => s.panelSide);
  const setPanelSide = usePlanningStore((s) => s.setPanelSide);
  const other = side === 'left' ? 'right' : 'left';
  return (
    <section
      className={`${styles.panel} ${side === 'left' ? styles.panelLeft : ''}`}
      role="dialog"
      aria-label={label || title}
      {...stop}
    >
      <header className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        <div className={styles.headerActions}>
          {/* The panel can cover the wall you want to work on, so it can sit on either side */}
          <button
            type="button"
            className={styles.side}
            onClick={() => setPanelSide(other)}
            aria-label={`Move panel to the ${other}`}
            title={`Move panel to the ${other}`}
          >
            <ArrowLeftRight size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label={`Close ${title}`}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </header>
      <div className={styles.body}>{children}</div>
    </section>
  );
}

// ---------- Services ----------

function SelectedService({ service, label }) {
  const updateService = useRoomStore((s) => s.updateService);
  const removeService = useRoomStore((s) => s.removeService);
  const rotateService = useRoomStore((s) => s.rotateService);
  const clearSelection = usePlanningStore((s) => s.clearServiceSelection);
  const def = SERVICE_KINDS[service.kind];
  const [draft, setDraft] = React.useState(service.note || '');
  React.useEffect(() => setDraft(service.note || ''), [service.id, service.note]);

  return (
    <div className={styles.selected} role="group" aria-label={`${label} details`}>
      <div className={styles.selectedHead}>
        <ServiceIcon kind={service.kind} size={28} />
        <div>
          <strong>{label}</strong>
          <span className={styles.muted}>
            {def.mount === 'wall'
              ? 'Sits on a wall. Drag it along the wall to move it.'
              : 'Drag it to move it.'}
          </span>
        </div>
      </div>
      <TextField
        label="Note"
        value={draft}
        maxLength={80}
        placeholder="For example: by the bed"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() =>
          draft.trim() !== (service.note || '') && updateService(service.id, { note: draft })
        }
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          e.stopPropagation();
        }}
      />
      <div className={styles.row}>
        {def.mount !== 'wall' && (
          <Button
            size="small"
            variant="secondary"
            icon={<RotateCw size={14} />}
            onClick={() => rotateService(service.id)}
          >
            Rotate
          </Button>
        )}
        <Button
          size="small"
          variant="danger"
          icon={<Trash2 size={14} />}
          onClick={() => {
            removeService(service.id);
            clearSelection();
          }}
        >
          Delete
        </Button>
        <Button size="small" variant="ghost" onClick={clearSelection}>
          Done
        </Button>
      </div>
    </div>
  );
}

export function ServicesPanel() {
  const room = useRoomStore((s) => s.room);
  const placeKind = usePlanningStore((s) => s.placeKind);
  const selectedServiceId = usePlanningStore((s) => s.selectedServiceId);
  const showServices = usePlanningStore((s) => s.showServices);
  const startPlacing = usePlanningStore((s) => s.startPlacing);
  const stopPlacing = usePlanningStore((s) => s.stopPlacing);
  const setShowServices = usePlanningStore((s) => s.setShowServices);
  const closePanel = usePlanningStore((s) => s.closePanel);

  const services = useMemo(() => servicesOf(room), [room]);
  const labels = useMemo(() => serviceLabels(services), [services]);
  const selected = services.find((s) => s.id === selectedServiceId);

  return (
    <PanelShell title="Services" onClose={closePanel}>
      <p className={styles.lead}>
        Mark where sockets, switches, water and drains are. Pick a point, then click the plan.
        Points on a wall snap to the nearest wall.
      </p>

      {SERVICE_GROUPS.map((group) => (
        <div key={group.id} className={styles.group}>
          <h3 className={styles.groupTitle}>{group.label}</h3>
          <div className={styles.kinds}>
            {kindsInGroup(group.id).map((kind) => (
              <button
                key={kind}
                type="button"
                className={`${styles.kind} ${placeKind === kind ? styles.kindOn : ''}`}
                aria-pressed={placeKind === kind}
                title={SERVICE_KINDS[kind].help}
                onClick={() => (placeKind === kind ? stopPlacing() : startPlacing(kind))}
              >
                <ServiceIcon kind={kind} size={30} />
                <span>{SERVICE_KINDS[kind].label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {placeKind ? (
        <p className={styles.placing} role="status">
          Click the plan to place a {SERVICE_KINDS[placeKind].label.toLowerCase()}. Press Esc when
          you are done.
        </p>
      ) : (
        <p className={styles.muted}>
          {services.length === 0
            ? 'Nothing marked yet.'
            : `${services.length} ${services.length === 1 ? 'point' : 'points'} marked. Click one on the plan to edit it.`}
        </p>
      )}

      {selected && <SelectedService service={selected} label={labels[selected.id]} />}

      <Switch checked={showServices} onChange={setShowServices} label="Show points on the plan" />
    </PanelShell>
  );
}

// ---------- Plan checks ----------

const SEVERITY_ICON = { error: AlertCircle, warning: AlertTriangle, info: Info };

function IssueRow({ issue, active, onShow }) {
  const Icon = SEVERITY_ICON[issue.severity];
  return (
    <li className={`${styles.issue} ${styles[issue.severity]} ${active ? styles.issueActive : ''}`}>
      <Icon size={18} className={styles.issueIcon} aria-hidden="true" />
      <div className={styles.issueText}>
        <strong>{issue.title}</strong>
        <p>{issue.message}</p>
      </div>
      <Button
        size="small"
        variant="secondary"
        onClick={() => onShow(issue)}
        aria-label={`Show: ${issue.title}`}
      >
        Show
      </Button>
    </li>
  );
}

export function PlanChecksPanel({ checks }) {
  const accessible = usePlanningStore((s) => s.accessible);
  const showTurning = usePlanningStore((s) => s.showTurning);
  const setAccessible = usePlanningStore((s) => s.setAccessible);
  const setShowTurning = usePlanningStore((s) => s.setShowTurning);
  const showLinks = usePlanningStore((s) => s.showLinks);
  const setShowLinks = usePlanningStore((s) => s.setShowLinks);
  const closePanel = usePlanningStore((s) => s.closePanel);
  const highlight = usePlanningStore((s) => s.highlight);
  const selectItem = useRoomStore((s) => s.selectItem);
  const deselectItem = useRoomStore((s) => s.deselectItem);
  const startPlanning = usePlanningStore.getState;

  const show = (issue) => {
    const { focus, point } = issue;
    if (focus.type === 'item') selectItem(focus.id);
    else deselectItem();
    if (focus.type === 'service') usePlanningStore.getState().selectService(focus.id);
    startPlanning().showHighlight(point.x, point.y);
  };

  const issues = checks?.issues || [];
  const counts = checks?.counts || { error: 0, warning: 0, info: 0, total: 0 };
  const groups = ['error', 'warning', 'info']
    .map((severity) => ({ severity, items: issues.filter((i) => i.severity === severity) }))
    .filter((g) => g.items.length > 0);

  return (
    <PanelShell title="Plan checks" onClose={closePanel}>
      {counts.total === 0 ? (
        <p className={styles.allClear} role="status">
          <CheckCircle2 size={18} aria-hidden="true" />
          <span>All clear. Nothing in the way, and nothing missing that I can see.</span>
        </p>
      ) : (
        <p className={styles.summary} role="status">
          {[
            counts.error > 0 && `${counts.error} to fix`,
            counts.warning > 0 && `${counts.warning} worth a look`,
            counts.info > 0 && `${counts.info} ${counts.info === 1 ? 'tip' : 'tips'}`,
          ]
            .filter(Boolean)
            .join(', ')}
        </p>
      )}

      <div className={styles.options}>
        <Switch checked={accessible} onChange={setAccessible} label="Check for wheelchair access" />
        <p className={styles.muted}>
          Wider doors and routes (120 cm), more room in front of units, and room for a 150 cm turn.
        </p>
        <Switch
          checked={showTurning}
          onChange={setShowTurning}
          label="Show where a 150 cm circle fits"
        />
        <Switch checked={showLinks} onChange={setShowLinks} label="Show service links" />
        <p className={styles.muted}>
          Dashed lines join sinks, stoves, TVs and other pieces to the nearest water, drain, gas or
          socket point. Green is within reach, red is too far, amber means none is marked.
        </p>
      </div>

      {groups.map((g) => (
        <div key={g.severity} className={styles.group}>
          <h3 className={styles.groupTitle}>{SEVERITY_LABELS[g.severity]}</h3>
          <ul className={styles.issues}>
            {g.items.map((issue) => (
              <IssueRow
                key={issue.id}
                issue={issue}
                active={highlight && highlight.x === issue.point.x && highlight.y === issue.point.y}
                onShow={show}
              />
            ))}
          </ul>
        </div>
      ))}

      {checks?.checked?.length > 0 && (
        <div className={styles.group}>
          <h3 className={styles.groupTitle}>What was checked</h3>
          <ul className={styles.checked}>
            {checks.checked.map((c) => (
              <li key={c.id} className={c.issues ? styles.checkedIssue : styles.checkedOk}>
                {c.issues ? (
                  <AlertTriangle size={13} aria-hidden="true" />
                ) : (
                  <CheckCircle2 size={13} aria-hidden="true" />
                )}
                {c.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </PanelShell>
  );
}

/** Whichever planning panel is open, floating over the plan. */
export function PlanningPanels({ checks }) {
  const panel = usePlanningStore((s) => s.panel);
  if (panel === 'services') return <ServicesPanel />;
  if (panel === 'checks') return <PlanChecksPanel checks={checks} />;
  return null;
}

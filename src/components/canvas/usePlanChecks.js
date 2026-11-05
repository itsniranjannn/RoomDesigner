import { useEffect, useMemo, useState } from 'react';
import { runPlanChecks } from '../../engine/planningChecks.js';

const SETTLE_MS = 250;

/**
 * Plan-check results for the open room. The checks are recomputed a moment after the room
 * stops changing, so dragging a piece around stays smooth; switching rooms is immediate.
 */
export function usePlanChecks(room, accessible = false) {
  const [settled, setSettled] = useState(room);

  useEffect(() => {
    if (settled === room) return undefined;
    const t = setTimeout(() => setSettled(room), SETTLE_MS);
    return () => clearTimeout(t);
  }, [room, settled]);

  const current = settled && room && settled.id === room.id ? settled : room;
  return useMemo(() => runPlanChecks(current, { accessible }), [current, accessible]);
}

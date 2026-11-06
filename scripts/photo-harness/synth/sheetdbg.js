import { corpusSpecs } from './corpus.js';
import { runCase, score } from './evaluate.js';
const rows = [];
for (const s of corpusSpecs({ sheet: 3 })) {
  const r = runCase(s);
  const sc = score(r);
  console.log(
    s.type.padEnd(12),
    s.seed,
    r.case.layout,
    r.case.bg.padEnd(8),
    'views',
    r.views,
    '/',
    r.expectedViews,
    'slots',
    JSON.stringify(r.slots),
    'exp',
    r.expected?.join(','),
    '->',
    r.type,
    r.error || '',
    sc.ok ? 'OK' : 'XX'
  );
}

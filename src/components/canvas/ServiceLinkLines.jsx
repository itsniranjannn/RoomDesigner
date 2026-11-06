import React from 'react';

/**
 * Dashed connector lines from each piece to the service point it relies on. Green: the point
 * is within reach. Red: the nearest point is too far. Amber: the room has no point of that
 * kind at all. Broken links carry a small tag ("no water nearby").
 *
 * Used on the editor plan (dimmed unless emphasized) and on the exported sheet (all at full
 * strength, `k` scales strokes and text with the sheet).
 */

export const LINK_COLORS = { ok: '#2E7D4F', far: '#B3261E', missing: '#C77700' };

const FONT = 'var(--font-sans, sans-serif)';

function LinkTag({ link, row, k, emphasized, dim, fontFamily }) {
  const font = 8.5 * k;
  const w = link.tag.length * font * 0.54 + font * 1.2;
  const h = font * 1.55;
  const x = link.center.x;
  const y = link.center.y - h * 0.5 + (row - 0.5) * (h + k * 1.5);
  return (
    <g opacity={emphasized ? 1 : dim} data-link-tag={link.need}>
      <rect
        x={x - w / 2}
        y={y}
        width={w}
        height={h}
        rx={h / 2}
        fill="#FFFFFF"
        stroke={LINK_COLORS[link.status]}
        strokeWidth={1 * k}
      />
      <text
        x={x}
        y={y + h * 0.7}
        textAnchor="middle"
        fontSize={font}
        fontWeight="600"
        fill={LINK_COLORS[link.status]}
        fontFamily={fontFamily}
      >
        {link.tag}
      </text>
    </g>
  );
}

/**
 * `isEmphasized(link)` tells which links are drawn bold (the selected piece or point);
 * links that are not emphasized are drawn thin and faded by `dim`.
 */
export function ServiceLinkLines({
  links,
  isEmphasized = () => true,
  dim = 0.5,
  k = 1,
  fontFamily = FONT,
}) {
  if (!links || links.length === 0) return null;
  const tagRows = {};
  return (
    <g pointerEvents="none" aria-hidden="true" data-service-links={links.length}>
      {links.map((l) => {
        const emph = isEmphasized(l);
        const color = LINK_COLORS[l.status];
        const length = l.from ? Math.hypot(l.to.x - l.from.x, l.to.y - l.from.y) : 0;
        return (
          <g key={l.id} data-link={l.need} data-link-status={l.status}>
            {l.from && length > 1 && (
              <line
                x1={l.from.x}
                y1={l.from.y}
                x2={l.to.x}
                y2={l.to.y}
                stroke={color}
                strokeWidth={(emph ? 2.6 : 1.3) * k}
                strokeDasharray={`${6 * k} ${4 * k}`}
                strokeLinecap="round"
                opacity={emph ? 1 : dim}
              />
            )}
            {l.from && (
              <circle
                cx={l.from.x}
                cy={l.from.y}
                r={(emph ? 3.4 : 2.4) * k}
                fill={color}
                opacity={emph ? 1 : dim}
              />
            )}
            <circle
              cx={l.to.x}
              cy={l.to.y}
              r={(emph ? 3 : 2) * k}
              fill="#FFFFFF"
              stroke={color}
              strokeWidth={1.4 * k}
              opacity={emph ? 1 : dim}
            />
          </g>
        );
      })}
      {links
        .filter((l) => l.tag)
        .map((l) => {
          const row = tagRows[l.itemId] || 0;
          tagRows[l.itemId] = row + 1;
          return (
            <LinkTag
              key={`tag-${l.id}`}
              link={l}
              row={row}
              k={k}
              fontFamily={fontFamily}
              emphasized={isEmphasized(l)}
              dim={Math.min(1, dim + 0.3)}
            />
          );
        })}
    </g>
  );
}

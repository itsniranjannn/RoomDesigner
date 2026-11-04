/** 2D plan symbols: storage. Coordinates are centered at (0, 0), widthCm x depthCm. */
import { SwingArc, BarHandle, LINE, HAIR, DETAIL, METAL, METAL_DARK, P } from './parts.jsx';

/** Door fronts along the +y (front) edge: seams, swing arcs and handles. */
function FrontDoors({ hw, hd, widthCm, count, handleColor, swing = 22 }) {
  const dw = (widthCm - 2) / count;
  return (
    <g>
      {Array.from({ length: count - 1 }).map((_, i) => (
        <line
          key={i}
          x1={-hw + 1 + dw * (i + 1)}
          y1={hd - 4}
          x2={-hw + 1 + dw * (i + 1)}
          y2={hd}
          stroke={DETAIL}
          strokeWidth="0.8"
        />
      ))}
      {Array.from({ length: count }).map((_, i) => {
        const left = i < count / 2 - 0.01;
        const hinge = left ? -hw + 1 + dw * i : -hw + 1 + dw * (i + 1);
        return (
          <g key={i}>
            <SwingArc x={hinge} y={hd} r={Math.min(dw - 1, swing)} openDown={false} flip={!left} />
            <BarHandle
              x={left ? -hw + 1 + dw * (i + 1) - 4 : -hw + 1 + dw * i + 4}
              y={hd - 2.4}
              length={4}
              horizontal={false}
              color={handleColor}
            />
          </g>
        );
      })}
    </g>
  );
}

function Legs({ hw, hd, inset = 5, r = 2.2 }) {
  return (
    <g stroke={LINE} strokeWidth="0.5" fill="#8A7A5A">
      {[
        [-hw + inset, -hd + inset],
        [hw - inset, -hd + inset],
        [-hw + inset, hd - inset],
        [hw - inset, hd - inset],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={r} />
      ))}
    </g>
  );
}

export function WardrobeSilhouette({ widthCm, depthCm, hw, hd, color, handleColor }) {
  const count = Math.max(2, Math.min(6, Math.round(widthCm / 62)));
  const dw = (widthCm - 2) / count;
  const mirrorIdx = Math.floor(count / 2);
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={1.5}
        fill={color}
        stroke="#2B2117"
        strokeWidth="1.3"
      />
      {/* Crown moulding line and back panel */}
      <rect
        x={-hw + 2}
        y={-hd + 2}
        width={P(widthCm - 4)}
        height={P(depthCm - 4)}
        fill="none"
        stroke="rgba(255,255,255,0.28)"
        strokeWidth="0.7"
      />
      <line
        x1={-hw + 2}
        y1={-hd + 4}
        x2={hw - 2}
        y2={-hd + 4}
        stroke="rgba(0,0,0,0.3)"
        strokeWidth="0.6"
      />
      {widthCm > 150 && (
        <g>
          <rect
            x={-hw + 1 + dw * mirrorIdx + 3}
            y={hd - 3.2}
            width={P(dw - 6)}
            height={2.2}
            fill="#CFE3EA"
            stroke={METAL_DARK}
            strokeWidth="0.5"
          />
          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={f}
              x1={-hw + 1 + dw * mirrorIdx + 3 + (dw - 6) * f}
              y1={hd - 3}
              x2={-hw + 1 + dw * mirrorIdx + 3 + (dw - 6) * f - 2}
              y2={hd - 1.2}
              stroke="#FFFFFF"
              strokeWidth="0.5"
            />
          ))}
        </g>
      )}
      <FrontDoors
        hw={hw}
        hd={hd}
        widthCm={widthCm}
        count={count}
        handleColor={handleColor}
        swing={Math.min(30, depthCm * 0.5)}
      />
    </g>
  );
}

export function BookshelfSilhouette({ widthCm, depthCm, hw, hd, color }) {
  const n = Math.max(6, Math.round(widthCm / 4));
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={1}
        fill={color}
        stroke="#4A3B2B"
        strokeWidth="1.3"
      />
      <rect
        x={-hw + 3}
        y={-hd + 2}
        width={P(widthCm - 6)}
        height={P(depthCm - 5)}
        fill="rgba(0,0,0,0.2)"
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="0.7"
      />
      {/* Back board, shelf edge and a row of book spines along the shelf */}
      <line x1={-hw + 3} y1={-hd + 4} x2={hw - 3} y2={-hd + 4} stroke={DETAIL} strokeWidth="1.2" />
      {Array.from({ length: n }).map((_, i) => {
        const bw = (widthCm * 0.62) / n;
        const x = -hw + widthCm * 0.2 + bw * i;
        return (
          <rect
            key={i}
            x={x}
            y={-hd + 7}
            width={bw * 0.88}
            height={depthCm * 0.5 + ((i * 7) % 5)}
            fill={['#8B2635', '#22485E', '#C49746', '#4A5D52', '#5C3A5A'][i % 5]}
            stroke="rgba(0,0,0,0.3)"
            strokeWidth="0.4"
          />
        );
      })}
      <line x1={-hw + 1} y1={hd - 2} x2={hw - 1} y2={hd - 2} stroke={HAIR} strokeWidth="0.7" />
    </g>
  );
}

function ShoeRackPlan({ widthCm, depthCm, hw, hd, color }) {
  const colors = ['#2B2B2E', '#8B4A2B', '#C9B79C', '#B8343F'];
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={1}
        fill={color}
        stroke="#4A3B2B"
        strokeWidth="1.3"
      />
      {[0.2, 0.5, 0.8].map((f) => (
        <line
          key={f}
          x1={-hw + 2}
          y1={-hd + depthCm * f}
          x2={hw - 2}
          y2={-hd + depthCm * f}
          stroke="rgba(0,0,0,0.3)"
          strokeWidth="0.7"
        />
      ))}
      {[-0.28, -0.05, 0.2].map((fx, i) => (
        <g key={fx}>
          {[-1, 1].map((s) => (
            <rect
              key={s}
              x={widthCm * fx + s * 4 - 3.4}
              y={-hd + depthCm * 0.15}
              width={6.8}
              height={depthCm * 0.65}
              rx={3}
              fill={colors[i % colors.length]}
              stroke="rgba(0,0,0,0.4)"
              strokeWidth="0.5"
            />
          ))}
        </g>
      ))}
    </g>
  );
}

export function ChestDrawersSilhouette({ item, widthCm, depthCm, hw, hd, color, handleColor }) {
  const id = item?.id || '';
  if (id === 'shoe-rack') {
    return <ShoeRackPlan widthCm={widthCm} depthCm={depthCm} hw={hw} hd={hd} color={color} />;
  }
  const filing = id === 'filing-cabinet';
  const drawers = 4;
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={filing ? 1.5 : 2}
        fill={color}
        stroke="#3D2A1C"
        strokeWidth="1.2"
      />
      {/* Top with overhang line */}
      <rect
        x={-hw + 2}
        y={-hd + 2}
        width={P(widthCm - 4)}
        height={P(depthCm - 5)}
        rx={1.5}
        fill="none"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="0.7"
      />
      {/* Drawer fronts along the front edge with pulls */}
      <line x1={-hw + 1} y1={hd - 4} x2={hw - 1} y2={hd - 4} stroke={DETAIL} strokeWidth="0.8" />
      {Array.from({ length: drawers }).map((_, i) => (
        <BarHandle
          key={i}
          x={-hw + (widthCm * (i + 0.5)) / drawers}
          y={hd - 2}
          length={Math.min(8, (widthCm / drawers) * 0.6)}
          color={handleColor || '#C4A869'}
        />
      ))}
      {filing && (
        <g>
          <circle
            cx={hw * 0.6}
            cy={-hd * 0.5}
            r={2.2}
            fill={METAL}
            stroke={METAL_DARK}
            strokeWidth="0.5"
          />
          <line
            x1={hw * 0.6}
            y1={-hd * 0.5 - 1.2}
            x2={hw * 0.6}
            y2={-hd * 0.5 + 1.2}
            stroke={LINE}
            strokeWidth="0.4"
          />
          <rect
            x={-hw * 0.5}
            y={-hd * 0.2}
            width={widthCm * 0.5}
            height={depthCm * 0.2}
            rx={1}
            fill="none"
            stroke={HAIR}
            strokeWidth="0.6"
            strokeDasharray="3 2"
          />
        </g>
      )}
    </g>
  );
}

export function SideboardSilhouette({ item, widthCm, depthCm, hw, hd, color, handleColor }) {
  const id = item?.id || '';
  const bar = id === 'bar-cabinet';
  const micro = id === 'microwave-stand';
  const consoleTable = id === 'console-table';
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={2}
        fill={color}
        stroke="#3A2D20"
        strokeWidth="1.2"
      />
      <rect
        x={-hw + 2}
        y={-hd + 2}
        width={P(widthCm - 4)}
        height={P(depthCm - 4)}
        rx={1.5}
        fill="none"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="0.7"
      />
      <Legs hw={hw} hd={hd} />
      {bar && (
        <g>
          <rect
            x={-hw * 0.82}
            y={-hd * 0.7}
            width={widthCm * 0.82}
            height={depthCm * 0.55}
            rx={2}
            fill="rgba(160,200,215,0.28)"
            stroke="#9FC3D2"
            strokeWidth="0.8"
          />
          {Array.from({ length: Math.max(3, Math.round(widthCm / 14)) }).map((_, i, a) => (
            <circle
              key={i}
              cx={-hw * 0.82 + 6 + ((widthCm * 0.82 - 12) * (i + 0.5)) / a.length}
              cy={-hd * 0.42}
              r={3}
              fill={['#2D4A2E', '#6B2A2A', '#B8923A', '#3C4E6B'][i % 4]}
              stroke="rgba(0,0,0,0.4)"
              strokeWidth="0.4"
            />
          ))}
        </g>
      )}
      {micro && (
        <g>
          <rect
            x={-hw * 0.72}
            y={-hd * 0.75}
            width={widthCm * 0.72}
            height={depthCm * 0.7}
            rx={2}
            fill="#D5D8DB"
            stroke={METAL_DARK}
            strokeWidth="0.9"
          />
          <rect
            x={-hw * 0.6}
            y={hd * -0.05 - 4}
            width={widthCm * 0.42}
            height={5}
            rx={1}
            fill="#0F1316"
            stroke="none"
          />
          <rect
            x={hw * 0.34}
            y={-hd * 0.68}
            width={widthCm * 0.14}
            height={depthCm * 0.56}
            rx={1}
            fill="#B9BDC1"
            stroke={METAL_DARK}
            strokeWidth="0.5"
          />
        </g>
      )}
      {consoleTable && (
        <rect
          x={-hw * 0.8}
          y={-hd * 0.4}
          width={widthCm * 0.8}
          height={depthCm * 0.3}
          rx={1}
          fill="none"
          stroke={HAIR}
          strokeWidth="0.6"
          strokeDasharray="3 2"
        />
      )}
      {!consoleTable && (
        <g>
          <line
            x1={-hw * 0.34}
            y1={hd - 4}
            x2={-hw * 0.34}
            y2={hd}
            stroke={DETAIL}
            strokeWidth="0.8"
          />
          <line
            x1={hw * 0.34}
            y1={hd - 4}
            x2={hw * 0.34}
            y2={hd}
            stroke={DETAIL}
            strokeWidth="0.8"
          />
          <SwingArc x={-hw + 1} y={hd} r={Math.min(hw * 0.6, 20)} openDown={false} />
          <SwingArc x={hw - 1} y={hd} r={Math.min(hw * 0.6, 20)} openDown={false} flip />
        </g>
      )}
      {[-0.67, -0.0, 0.67].map((f, i) => (
        <BarHandle
          key={i}
          x={hw * f + (f === 0 ? 0 : f < 0 ? 6 : -6)}
          y={hd - 2}
          length={f === 0 ? 8 : 4}
          horizontal={f === 0}
          color={handleColor || '#C4A869'}
        />
      ))}
    </g>
  );
}

export function VanityDresserSilhouette({
  widthCm,
  depthCm,
  hw,
  hd,
  color,
  subColor,
  handleColor,
  item,
}) {
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={2}
        fill={color}
        stroke="#3D2A1C"
        strokeWidth="1.2"
      />
      <rect
        x={-hw + 2}
        y={-hd + 2}
        width={P(widthCm - 4)}
        height={P(depthCm - 4)}
        rx={1.5}
        fill="none"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="0.7"
      />
      {/* Upright mirror in a frame along the back edge */}
      <rect
        x={-hw * 0.72}
        y={-hd + 1}
        width={widthCm * 0.72}
        height={5}
        rx={1.2}
        fill={item?.mirrorColor || '#9FC3D2'}
        stroke={handleColor || '#C4A869'}
        strokeWidth="1"
      />
      <line
        x1={-hw * 0.6}
        y1={-hd + 3.5}
        x2={-hw * 0.2}
        y2={-hd + 2.5}
        stroke="#FFFFFF"
        strokeWidth="0.6"
      />
      {/* Jewellery tray, perfume bottles */}
      <rect
        x={-hw * 0.7}
        y={-hd * 0.2}
        width={widthCm * 0.2}
        height={depthCm * 0.22}
        rx={1.5}
        fill={subColor}
        stroke={DETAIL}
        strokeWidth="0.6"
      />
      <circle
        cx={hw * 0.45}
        cy={-hd * 0.1}
        r={3}
        fill="#C7DDE4"
        stroke={METAL_DARK}
        strokeWidth="0.5"
      />
      <circle
        cx={hw * 0.6}
        cy={-hd * 0.05}
        r={2.2}
        fill="#E3C7CF"
        stroke={METAL_DARK}
        strokeWidth="0.5"
      />
      {/* Drawer fronts with knobs */}
      <line x1={-hw + 1} y1={hd - 4} x2={hw - 1} y2={hd - 4} stroke={DETAIL} strokeWidth="0.8" />
      <line x1={0} y1={hd - 4} x2={0} y2={hd} stroke={DETAIL} strokeWidth="0.8" />
      {[-0.5, 0.5, 0].map((f, i) => (
        <circle
          key={i}
          cx={hw * f}
          cy={hd - 2}
          r={1.3}
          fill={handleColor || '#C4A869'}
          stroke="#3D2A1C"
          strokeWidth="0.4"
        />
      ))}
      <Legs hw={hw} hd={hd} inset={4} r={1.8} />
    </g>
  );
}

export function CredenzaSilhouette({ widthCm, depthCm, hw, hd, color, subColor }) {
  const cw = widthCm * 0.3;
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={2}
        fill={color}
        stroke="#3A2A1C"
        strokeWidth="1.2"
      />
      <rect
        x={-hw + 2}
        y={-hd + 2}
        width={P(widthCm - 4)}
        height={P(depthCm - 4)}
        rx={1.5}
        fill="none"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="0.7"
      />
      {/* Open AV bay in the centre with a set-top box, cupboards left and right */}
      <rect
        x={-widthCm * 0.2}
        y={-hd + 5}
        width={widthCm * 0.4}
        height={P(depthCm - 8)}
        rx={1.5}
        fill={subColor || 'rgba(0,0,0,0.25)'}
        fillOpacity="0.7"
        stroke={DETAIL}
        strokeWidth="0.7"
      />
      <rect
        x={-widthCm * 0.14}
        y={-hd * 0.3}
        width={widthCm * 0.28}
        height={depthCm * 0.4}
        rx={1}
        fill="#1B1D20"
        stroke="none"
      />
      <circle cx={widthCm * 0.1} cy={-hd * 0.2} r={0.9} fill="#4EE08A" />
      {[-1, 1].map((s) => (
        <g key={s}>
          <line
            x1={s * widthCm * 0.2}
            y1={hd - 4}
            x2={s * widthCm * 0.2}
            y2={hd}
            stroke={DETAIL}
            strokeWidth="0.8"
          />
          <SwingArc
            x={s * (hw - 1)}
            y={hd}
            r={Math.min(cw - 2, 20)}
            openDown={false}
            flip={s > 0}
          />
          <circle
            cx={s * widthCm * 0.22 + (s > 0 ? 5 : -5)}
            cy={hd - 2}
            r={1.3}
            fill="#C4A869"
            stroke="#3A2A1C"
            strokeWidth="0.4"
          />
        </g>
      ))}
      <Legs hw={hw} hd={hd} inset={8} r={2} />
    </g>
  );
}

export function PantryCabinetSilhouette({ item, widthCm, depthCm, hw, hd, color, handleColor }) {
  const towel = item?.id === 'towel-cabinet';
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={2}
        fill={color}
        stroke="#2F3A33"
        strokeWidth="1.2"
      />
      <rect
        x={-hw + 2}
        y={-hd + 2}
        width={P(widthCm - 4)}
        height={P(depthCm - 4)}
        rx={1.5}
        fill="none"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="0.7"
      />
      {towel ? (
        <g>
          {[0.2, 0.34, 0.48, 0.62].map((f) => (
            <rect
              key={f}
              x={-hw + 4}
              y={-hd + depthCm * f - 2}
              width={P(widthCm - 8)}
              height={3.4}
              rx={1.2}
              fill="#E9DFD0"
              stroke={DETAIL}
              strokeWidth="0.5"
            />
          ))}
          <BarHandle x={hw - 6} y={hd - 2} length={3} horizontal={false} color={handleColor} />
          <SwingArc x={-hw + 1} y={hd} r={Math.min(widthCm - 4, 20)} openDown={false} />
        </g>
      ) : (
        <FrontDoors
          hw={hw}
          hd={hd}
          widthCm={widthCm}
          count={2}
          handleColor={handleColor}
          swing={Math.min(30, depthCm * 0.5)}
        />
      )}
    </g>
  );
}

export function TvSilhouette({ widthCm, depthCm, hw, hd, color, subColor }) {
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={1.5}
        fill={color}
        stroke="#0B0C0D"
        strokeWidth="1.2"
      />
      {/* Screen glass edge, centre mount and stand foot beneath */}
      <rect
        x={-hw + 1}
        y={hd - 3}
        width={P(widthCm - 2)}
        height={1.6}
        fill="#16273A"
        stroke="none"
      />
      <rect
        x={-hw * 0.3}
        y={-hd + 1.5}
        width={widthCm * 0.3}
        height={P(depthCm - 3)}
        rx={1}
        fill={subColor || '#303438'}
        stroke="none"
      />
      <rect
        x={-widthCm * 0.15}
        y={-hd - 1}
        width={widthCm * 0.3}
        height={depthCm + 2}
        rx={1.5}
        fill="none"
        stroke={HAIR}
        strokeWidth="0.7"
        strokeDasharray="3 2"
      />
      <circle cx={hw * 0.8} cy={hd - 2.2} r={0.8} fill="#FF3B30" />
    </g>
  );
}

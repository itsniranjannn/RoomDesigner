/** 2D plan symbols: kitchen. Coordinates are centered at (0, 0), widthCm x depthCm. */
import {
  KnobPlan,
  DrainPlan,
  SwingArc,
  BarHandle,
  LINE,
  HAIR,
  DETAIL,
  METAL,
  METAL_DARK,
  P,
} from './parts.jsx';

/** Gooseneck tap in plan: base ring, arched spout reaching towards +y. */
function GoosenekPlan({ x, y }) {
  return (
    <g name="tap" stroke={METAL_DARK} strokeWidth="0.6">
      <circle cx={x} cy={y} r={3} fill="#F1F3F4" />
      <path
        d={`M ${x} ${y} L ${x} ${y + 9}`}
        stroke={METAL}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx={x} cy={y + 9} r={1.5} fill={METAL} />
      <rect x={x + 3.4} y={y - 1} width="6" height="2" rx="1" fill={METAL} />
    </g>
  );
}

export function KitchenIslandSilhouette({ widthCm, depthCm, hw, hd, color }) {
  const bodyD = depthCm * 0.78;
  const bodyZ = -depthCm * 0.05;
  const bodyTop = bodyZ - bodyD / 2;
  const bankW = widthCm * 0.32;
  const doorW = (widthCm * 0.94 - bankW) / 2;
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={4}
        fill={color}
        stroke="#5A6D63"
        strokeWidth="1.2"
      />
      <rect
        x={-hw + 2}
        y={-hd + 2}
        width={P(widthCm - 4)}
        height={P(depthCm - 4)}
        rx={2.5}
        fill="none"
        stroke="rgba(255,255,255,0.6)"
        strokeWidth="0.7"
      />
      {/* Base cabinets below the worktop (hidden, dashed) with door pair and drawer bank on the back side */}
      <rect
        x={-hw * 0.94}
        y={bodyTop}
        width={widthCm * 0.94}
        height={bodyD}
        fill="none"
        stroke={HAIR}
        strokeWidth="0.7"
        strokeDasharray="4 3"
      />
      <line
        x1={-bankW / 2}
        y1={bodyTop}
        x2={-bankW / 2}
        y2={bodyTop + 6}
        stroke={DETAIL}
        strokeWidth="0.7"
      />
      <line
        x1={bankW / 2}
        y1={bodyTop}
        x2={bankW / 2}
        y2={bodyTop + 6}
        stroke={DETAIL}
        strokeWidth="0.7"
      />
      <SwingArc x={-bankW / 2 - doorW} y={bodyTop} r={Math.min(doorW, 26)} openDown />
      <SwingArc x={bankW / 2 + doorW} y={bodyTop} r={Math.min(doorW, 26)} openDown flip />
      {[-1, 0, 1].map((i) => (
        <BarHandle
          key={i}
          x={i * bankW * 0.22}
          y={bodyTop + 3}
          length={bankW * 0.3}
          color={METAL}
        />
      ))}
      {/* Overhang line and stools tucked underneath */}
      <line
        x1={-hw + 5}
        y1={bodyZ + bodyD / 2}
        x2={hw - 5}
        y2={bodyZ + bodyD / 2}
        stroke={DETAIL}
        strokeWidth="0.8"
        strokeDasharray="5 3"
      />
      {[-0.4, 0.4].map((f) => (
        <g key={f}>
          <circle
            cx={hw * f}
            cy={hd - 6}
            r={7}
            fill="none"
            stroke={HAIR}
            strokeWidth="0.8"
            strokeDasharray="3 2"
          />
          <circle
            cx={hw * f}
            cy={hd - 6}
            r={3.4}
            fill="none"
            stroke={HAIR}
            strokeWidth="0.5"
            strokeDasharray="2 2"
          />
        </g>
      ))}
    </g>
  );
}

export function KitchenCounterSilhouette({ widthCm, depthCm, hw, hd, color }) {
  const holeW = widthCm * 0.4;
  const holeX = -widthCm * 0.18;
  const holeD = depthCm * 0.62;
  const holeY = depthCm * 0.04;
  const n = widthCm > 130 ? 4 : widthCm > 90 ? 3 : 2;
  const dw = (widthCm - 4) / n;
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={2}
        fill={color}
        stroke="#4A453C"
        strokeWidth="1.2"
      />
      {/* Double stainless bowls with drains */}
      <rect
        x={holeX - holeW / 2}
        y={holeY - holeD / 2}
        width={holeW}
        height={holeD}
        rx={3}
        fill="#C6CCD2"
        stroke={METAL_DARK}
        strokeWidth="1"
      />
      {[-1, 1].map((s) => (
        <g key={s}>
          <rect
            x={holeX + s * holeW * 0.25 - holeW * 0.22}
            y={holeY - holeD / 2 + 3}
            width={holeW * 0.44}
            height={P(holeD - 6)}
            rx={2.5}
            fill="#E2E6EA"
            stroke="#AAB3BA"
            strokeWidth="0.8"
          />
          <DrainPlan x={holeX + s * holeW * 0.25} y={holeY} r={2.4} />
        </g>
      ))}
      {/* Drainer grooves */}
      {[0.1, 0.22, 0.34, 0.46, 0.58, 0.7, 0.82].map((f) => (
        <line
          key={f}
          x1={hw * 0.28}
          y1={-hd + depthCm * f * 0.9 + 4}
          x2={hw * 0.74}
          y2={-hd + depthCm * f * 0.9 + 4}
          stroke="rgba(0,0,0,0.25)"
          strokeWidth="0.7"
        />
      ))}
      <GoosenekPlan x={holeX} y={-hd + 6} />
      {/* Cabinet doors along the front with swing hints and bar handles */}
      {Array.from({ length: n - 1 }).map((_, i) => (
        <line
          key={i}
          x1={-hw + 2 + dw * (i + 1)}
          y1={hd - 4}
          x2={-hw + 2 + dw * (i + 1)}
          y2={hd}
          stroke={DETAIL}
          strokeWidth="0.8"
        />
      ))}
      {Array.from({ length: n }).map((_, i) => (
        <g key={i}>
          <BarHandle
            x={-hw + 2 + dw * (i + 0.5) + (i % 2 ? -dw * 0.3 : dw * 0.3)}
            y={hd - 3}
            length={5}
            color={METAL}
          />
          <SwingArc
            x={-hw + 2 + dw * (i + (i % 2 ? 1 : 0))}
            y={hd}
            r={Math.min(dw - 1, 24)}
            openDown={false}
            flip={i % 2 === 1}
          />
        </g>
      ))}
    </g>
  );
}

function Burner2D({ x, y, r }) {
  return (
    <g stroke="#555" strokeWidth="0.7">
      <circle cx={x} cy={y} r={r} fill="#2B2D30" />
      <circle cx={x} cy={y} r={r * 0.66} fill="#16171A" />
      <circle cx={x} cy={y} r={r * 0.3} fill="#4B4F54" />
      <g stroke="#8A8F94" strokeWidth="1.1">
        <line x1={x - r * 1.18} y1={y} x2={x + r * 1.18} y2={y} />
        <line x1={x} y1={y - r * 1.18} x2={x} y2={y + r * 1.18} />
        <line
          x1={x - r * 0.83}
          y1={y - r * 0.83}
          x2={x + r * 0.83}
          y2={y + r * 0.83}
          strokeWidth="0.6"
        />
        <line
          x1={x - r * 0.83}
          y1={y + r * 0.83}
          x2={x + r * 0.83}
          y2={y - r * 0.83}
          strokeWidth="0.6"
        />
      </g>
    </g>
  );
}

export function KitchenStoveSilhouette({ widthCm, depthCm, hw, hd, color, subColor }) {
  const br = Math.min(widthCm, depthCm) * 0.14;
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={2}
        fill={color}
        stroke="#17181A"
        strokeWidth="1.2"
      />
      <rect
        x={-hw + 2}
        y={-hd + 2}
        width={P(widthCm - 4)}
        height={P(depthCm - 4)}
        rx={1.5}
        fill="none"
        stroke="rgba(255,255,255,0.28)"
        strokeWidth="0.6"
      />
      {/* Rear upstand */}
      <line
        x1={-hw}
        y1={-hd + 4}
        x2={hw}
        y2={-hd + 4}
        stroke={subColor || '#52575C'}
        strokeWidth="1.2"
      />
      {/* Four burners with pan supports */}
      <Burner2D x={-hw * 0.5} y={-hd * 0.4} r={br * 0.9} />
      <Burner2D x={hw * 0.5} y={-hd * 0.4} r={br * 0.8} />
      <Burner2D x={-hw * 0.5} y={hd * 0.18} r={br * 1.1} />
      <Burner2D x={hw * 0.5} y={hd * 0.18} r={br * 0.9} />
      {/* Front control strip: four burner knobs, clock, oven handle */}
      <rect
        x={-hw + 2}
        y={hd - 11}
        width={P(widthCm - 4)}
        height={9}
        rx={1.5}
        fill={subColor || '#52575C'}
        stroke={LINE}
        strokeWidth="0.5"
      />
      {[-0.74, -0.4, 0.4, 0.74].map((k) => (
        <KnobPlan key={k} x={hw * k} y={hd - 6.5} r={2.6} />
      ))}
      <rect x={-5} y={hd - 8.5} width={10} height={4} rx={0.8} fill="#101315" stroke="none" />
      <rect
        x={-hw * 0.7}
        y={hd - 0.4}
        width={widthCm * 0.7}
        height={2.2}
        rx={1.1}
        fill="#E0E3E6"
        stroke={LINE}
        strokeWidth="0.5"
      />
    </g>
  );
}

export function KitchenFridgeSilhouette({ widthCm, depthCm, hw, hd, color, handleColor }) {
  const handle = handleColor || '#1C1D1F';
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={3}
        fill={color}
        stroke="#3E4348"
        strokeWidth="1.2"
      />
      {/* Top face: door seams and the freezer drawer line at the front */}
      <line x1={0} y1={hd - 14} x2={0} y2={hd} stroke="#2D3034" strokeWidth="1.2" />
      <line x1={-hw} y1={hd - 14} x2={hw} y2={hd - 14} stroke="#2D3034" strokeWidth="1" />
      <rect
        x={-hw + 2}
        y={-hd + 2}
        width={P(widthCm - 4)}
        height={P(depthCm - 4)}
        rx={2}
        fill="none"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="0.6"
      />
      {/* French door swings and bar handles at the seam */}
      <SwingArc x={-hw} y={hd} r={hw - 1} openDown={false} />
      <SwingArc x={hw} y={hd} r={hw - 1} openDown={false} flip />
      {[-1, 1].map((s) => (
        <rect
          key={s}
          x={s * 3 - 1}
          y={hd - 1.6}
          width={2}
          height={3.6}
          rx={0.8}
          fill={handle}
          stroke="none"
        />
      ))}
      <rect
        x={-hw * 0.5}
        y={hd - 0.6}
        width={widthCm * 0.5}
        height={2.2}
        rx={1}
        fill={handle}
        stroke="none"
      />
      {/* Rear vent grille and hinge caps */}
      {[0, 1, 2, 3].map((i) => (
        <line
          key={i}
          x1={-hw * 0.5}
          y1={-hd + 5 + i * 2.6}
          x2={hw * 0.5}
          y2={-hd + 5 + i * 2.6}
          stroke={HAIR}
          strokeWidth="0.6"
        />
      ))}
      <rect x={-hw + 2} y={hd - 6} width={5} height={4} rx={1} fill="#17181A" stroke="none" />
      <rect x={hw - 7} y={hd - 6} width={5} height={4} rx={1} fill="#17181A" stroke="none" />
    </g>
  );
}

export function DiningNookSilhouette({ hw, hd, color, cushionColor }) {
  const seatD = 40;
  const tableR = Math.max(10, Math.min(hw * 2 - seatD, hd * 2 - seatD) * 0.4);
  const tx = -hw + seatD + (hw * 2 - seatD) / 2 + 2;
  const ty = -hd + seatD + (hd * 2 - seatD) / 2 + 2;
  return (
    <g>
      <path
        d={`M ${-hw} ${-hd} L ${hw} ${-hd} L ${hw} ${-hd + seatD} L ${-hw + seatD} ${-hd + seatD} L ${-hw + seatD} ${hd} L ${-hw} ${hd} Z`}
        fill={color}
        stroke="#4D3823"
        strokeWidth="1.2"
      />
      <path
        d={`M ${-hw + 3} ${-hd + 3} L ${hw - 3} ${-hd + 3} L ${hw - 3} ${-hd + seatD - 3} L ${-hw + seatD - 3} ${-hd + seatD - 3} L ${-hw + seatD - 3} ${hd - 3} L ${-hw + 3} ${hd - 3} Z`}
        fill={cushionColor}
        stroke="#948572"
        strokeWidth="0.8"
      />
      {/* Back cushions along both walls with button tufting */}
      <path
        d={`M ${-hw + 7} ${hd - 8} L ${-hw + 7} ${-hd + 7} L ${hw - 8} ${-hd + 7}`}
        fill="none"
        stroke="#7D6F5E"
        strokeWidth="1"
        strokeDasharray="3 3"
      />
      {[0.2, 0.5, 0.8].map((f) => (
        <circle key={f} cx={-hw + hw * 2 * f} cy={-hd + 11} r={1} fill="#7D6F5E" />
      ))}
      {[0.35, 0.7].map((f) => (
        <circle key={f} cx={-hw + 11} cy={-hd + hd * 2 * f} r={1} fill="#7D6F5E" />
      ))}
      {/* Seat seams */}
      <line
        x1={-hw * 0.1}
        y1={-hd + 4}
        x2={-hw * 0.1}
        y2={-hd + seatD - 4}
        stroke="#B3A692"
        strokeWidth="0.6"
      />
      <line
        x1={-hw + 4}
        y1={hd * 0.1}
        x2={-hw + seatD - 4}
        y2={hd * 0.1}
        stroke="#B3A692"
        strokeWidth="0.6"
      />
      {/* Pedestal table in the corner of the nook */}
      <circle cx={tx} cy={ty} r={tableR} fill="#EFE7DA" stroke="#6B5B47" strokeWidth="1" />
      <circle cx={tx} cy={ty} r={tableR * 0.9} fill="none" stroke={HAIR} strokeWidth="0.5" />
      <circle
        cx={tx}
        cy={ty}
        r={tableR * 0.2}
        fill="none"
        stroke={HAIR}
        strokeWidth="0.6"
        strokeDasharray="2 2"
      />
    </g>
  );
}

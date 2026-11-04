/** 2D plan symbols: floor-standing kitchen units. Coordinates are centered at (0, 0), widthCm x depthCm. */
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
} from './parts.jsx';

export function SinkUnitSilhouette({ widthCm, depthCm, hw, hd, color, subColor }) {
  const bowlW = widthCm * 0.3;
  const bowlH = depthCm * 0.64;
  const bowlX = -widthCm * 0.28;
  const boardX = widthCm * 0.06;
  const boardW = hw - boardX - widthCm * 0.04;
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
      {/* Bowl with drain and overflow */}
      <rect
        x={bowlX - bowlW / 2}
        y={-hd + depthCm * 0.18}
        width={bowlW}
        height={bowlH}
        rx={4}
        fill="#C6CCD2"
        stroke={METAL_DARK}
        strokeWidth="1"
      />
      <rect
        x={bowlX - bowlW / 2 + 3}
        y={-hd + depthCm * 0.18 + 3}
        width={bowlW - 6}
        height={bowlH - 6}
        rx={3}
        fill="#E2E6EA"
        stroke="#AAB3BA"
        strokeWidth="0.7"
      />
      <DrainPlan x={bowlX} y={-hd + depthCm * 0.18 + bowlH / 2} r={2.6} />
      <rect
        x={bowlX - 2}
        y={-hd + depthCm * 0.18 + 4}
        width={4}
        height={1.4}
        rx={0.7}
        fill="#2B2E31"
        stroke="none"
      />
      {/* Gooseneck tap and soap dispenser at the back */}
      <g name="tap" stroke={METAL_DARK} strokeWidth="0.6">
        <circle cx={bowlX} cy={-hd + 6} r={3} fill="#F1F3F4" />
        <line
          x1={bowlX}
          y1={-hd + 6}
          x2={bowlX}
          y2={-hd + 15}
          stroke={METAL}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <circle cx={bowlX} cy={-hd + 15} r={1.5} fill={METAL} />
        <circle cx={bowlX + bowlW / 2 + 5} cy={-hd + 6} r={1.8} fill={METAL} />
      </g>
      {/* Drainer board with ribs */}
      <rect
        x={boardX}
        y={-hd + depthCm * 0.12}
        width={boardW}
        height={depthCm * 0.76}
        rx={2}
        fill={subColor}
        stroke={METAL_DARK}
        strokeWidth="0.8"
      />
      {[0.15, 0.27, 0.39, 0.51, 0.63, 0.75, 0.87].map((f) => (
        <line
          key={f}
          x1={boardX + boardW * 0.08}
          y1={-hd + depthCm * (0.12 + 0.76 * f)}
          x2={boardX + boardW * 0.92}
          y2={-hd + depthCm * (0.12 + 0.76 * f)}
          stroke="rgba(0,0,0,0.25)"
          strokeWidth="0.7"
        />
      ))}
      {/* Doors below: split line, swing arcs and pulls along the front edge */}
      <line x1={0} y1={hd - 4} x2={0} y2={hd} stroke={DETAIL} strokeWidth="0.9" />
      <SwingArc x={-hw} y={hd} r={Math.min(hw - 1, 24)} openDown={false} />
      <SwingArc x={hw} y={hd} r={Math.min(hw - 1, 24)} openDown={false} flip />
      <BarHandle x={-4} y={hd - 3} length={5} color={METAL} />
      <BarHandle x={4} y={hd - 3} length={5} color={METAL} />
    </g>
  );
}

export function ApplianceSilhouette({
  item,
  widthCm,
  depthCm,
  hw,
  hd,
  color,
  subColor,
  accentColor,
}) {
  const oven = item?.id === 'oven-unit';
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={3}
        fill={color}
        stroke="#4A5057"
        strokeWidth="1.2"
      />
      <rect
        x={-hw + 2}
        y={-hd + 2}
        width={widthCm - 4}
        height={depthCm - 4}
        rx={2}
        fill="none"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="0.6"
      />
      {oven && (
        <g stroke="#555" strokeWidth="0.7">
          {[
            [-0.5, -0.45],
            [0.5, -0.45],
            [-0.5, 0.1],
            [0.5, 0.1],
          ].map(([zx, zy]) => (
            <g key={`${zx}${zy}`}>
              <circle cx={hw * zx} cy={hd * zy} r={widthCm * 0.15} fill="none" />
              <circle
                cx={hw * zx}
                cy={hd * zy}
                r={widthCm * 0.11}
                fill="none"
                strokeDasharray="2 2"
              />
            </g>
          ))}
        </g>
      )}
      {/* Front control strip: display, buttons and knobs */}
      <rect
        x={-hw * 0.9}
        y={hd - 12}
        width={widthCm * 0.9}
        height={9}
        rx={2}
        fill={subColor}
        stroke={LINE}
        strokeWidth="0.5"
      />
      {oven ? (
        [-0.7, -0.4, 0.4, 0.7].map((k) => <KnobPlan key={k} x={hw * k} y={hd - 7.5} r={2.6} />)
      ) : (
        <>
          <rect
            x={-widthCm * 0.2}
            y={hd - 10}
            width={widthCm * 0.22}
            height={4.5}
            rx={1}
            fill="#101315"
            stroke="none"
          />
          <rect
            x={-widthCm * 0.17}
            y={hd - 8.7}
            width={2}
            height={2}
            fill="#4EA8FF"
            stroke="none"
          />
          {[0.08, 0.16, 0.24, 0.32].map((f) => (
            <rect
              key={f}
              x={widthCm * f - 2}
              y={hd - 8.8}
              width={4}
              height={2.2}
              rx={0.6}
              fill={accentColor}
              stroke="none"
            />
          ))}
          <KnobPlan x={-hw * 0.7} y={hd - 7.5} r={2.4} />
        </>
      )}
      {/* Handle and door seam; the door drops open towards the front */}
      <rect
        x={-hw * 0.7}
        y={hd - 0.4}
        width={widthCm * 0.7}
        height={2.2}
        rx={1.1}
        fill={accentColor}
        stroke={LINE}
        strokeWidth="0.5"
      />
      <line
        x1={-hw + 3}
        y1={hd - 14}
        x2={hw - 3}
        y2={hd - 14}
        stroke={HAIR}
        strokeWidth="0.6"
        strokeDasharray="3 2"
      />
    </g>
  );
}

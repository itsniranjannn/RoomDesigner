/** 2D plan symbols: office pieces. Coordinates are centered at (0, 0), widthCm x depthCm. */
export function DeskLSilhouette({ widthCm, depthCm, hw, hd, color, subColor }) {
  const mainD = depthCm * 0.45;
  const returnW = widthCm * 0.38;
  return (
    <g>
      {/* L-shaped worktop: main run along the back plus a return on the right */}
      <path
        d={`M ${-hw} ${-hd} H ${hw} V ${hd} H ${hw - returnW} V ${-hd + mainD} H ${-hw} Z`}
        fill={color}
        stroke="#2B2117"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Monitor and keyboard on the main run */}
      <rect
        x={-hw * 0.35}
        y={-hd + 4}
        width={widthCm * 0.24}
        height={mainD * 0.16}
        rx={1}
        fill={subColor}
      />
      <rect
        x={-hw * 0.4}
        y={-hd + mainD * 0.45}
        width={widthCm * 0.3}
        height={mainD * 0.22}
        rx={2}
        fill="rgba(255,255,255,0.3)"
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="0.6"
      />
      {/* Notebook on the return */}
      <rect
        x={hw - returnW * 0.75}
        y={hd * 0.1}
        width={returnW * 0.5}
        height={depthCm * 0.22}
        rx={2}
        fill="rgba(255,255,255,0.25)"
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="0.6"
      />
    </g>
  );
}

export function StandingDeskSilhouette({ widthCm, depthCm, hw, hd, color, subColor, accentColor }) {
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={3}
        fill={color}
        stroke="#2B2B2B"
        strokeWidth="1.2"
      />
      {/* Monitor and keyboard */}
      <rect
        x={-widthCm * 0.14}
        y={-hd + 4}
        width={widthCm * 0.28}
        height={depthCm * 0.1}
        rx={1}
        fill={subColor}
      />
      <rect
        x={-widthCm * 0.16}
        y={-hd + depthCm * 0.5}
        width={widthCm * 0.32}
        height={depthCm * 0.2}
        rx={2}
        fill="rgba(255,255,255,0.3)"
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="0.6"
      />
      {/* Height controller panel on the front edge */}
      <rect
        x={hw - widthCm * 0.2}
        y={hd - depthCm * 0.16}
        width={widthCm * 0.14}
        height={depthCm * 0.1}
        rx={1}
        fill={accentColor}
      />
      {/* Column legs seen as dashed footprints under the top */}
      <rect
        x={-hw + widthCm * 0.08}
        y={-hd + depthCm * 0.1}
        width={widthCm * 0.05}
        height={depthCm * 0.8}
        fill="none"
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="0.8"
        strokeDasharray="3 2"
      />
      <rect
        x={hw - widthCm * 0.13}
        y={-hd + depthCm * 0.1}
        width={widthCm * 0.05}
        height={depthCm * 0.8}
        fill="none"
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="0.8"
        strokeDasharray="3 2"
      />
    </g>
  );
}

export function ReceptionCounterSilhouette({
  widthCm,
  depthCm,
  hw,
  hd,
  color,
  accentColor,
  subColor,
}) {
  const ledgeD = depthCm * 0.34;
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={6}
        fill={color}
        stroke="#2B2B2B"
        strokeWidth="1.2"
      />
      {/* Raised front transaction ledge */}
      <rect
        x={-hw * 0.97}
        y={hd * 0.94 - ledgeD}
        width={widthCm * 0.97}
        height={ledgeD}
        rx={4}
        fill={accentColor}
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="0.8"
      />
      {/* Work surface items behind the ledge */}
      <rect
        x={-widthCm * 0.2}
        y={-hd + depthCm * 0.14}
        width={widthCm * 0.18}
        height={depthCm * 0.12}
        rx={1}
        fill={subColor}
      />
      <rect
        x={widthCm * 0.06}
        y={-hd + depthCm * 0.14}
        width={widthCm * 0.14}
        height={depthCm * 0.2}
        rx={2}
        fill="rgba(255,255,255,0.3)"
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="0.6"
      />
      <circle cx={hw * 0.6} cy={hd - ledgeD / 2 - hd * 0.06} r={3} fill={subColor} />
    </g>
  );
}

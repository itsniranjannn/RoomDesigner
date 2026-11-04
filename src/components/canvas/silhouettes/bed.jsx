/** 2D plan symbols: bed. Coordinates are centered at (0, 0), widthCm x depthCm. */
export function BedSilhouette({
  widthCm,
  depthCm,
  hw,
  hd,
  color,
  fabricColor,
  headboardColor,
  accentColor,
}) {
  const isSingle = widthCm < 120;
  const pillowW = isSingle ? widthCm * 0.65 : widthCm * 0.38;
  const pillowH = depthCm * 0.2;
  const duvetTopY = -hd + depthCm * 0.44;

  return (
    <g>
      {/* Bed Base Frame */}
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={4}
        fill={color}
        stroke="#3D2A1C"
        strokeWidth="1.2"
      />

      {/* Wooden / Upholstered Headboard at top */}
      <rect x={-hw} y={-hd} width={widthCm} height={depthCm * 0.12} rx={2} fill={headboardColor} />

      {/* Mattress */}
      <rect
        x={-hw + 3}
        y={-hd + depthCm * 0.12 + 2}
        width={widthCm - 6}
        height={depthCm * 0.88 - 5}
        rx={3}
        fill={fabricColor}
        stroke="#D8CFBF"
        strokeWidth="0.8"
      />

      {/* Pillows */}
      {isSingle ? (
        <rect
          x={-pillowW / 2}
          y={-hd + depthCm * 0.16}
          width={pillowW}
          height={pillowH}
          rx={3}
          fill="#FFFFFF"
          stroke="#D4C9BA"
          strokeWidth="0.8"
        />
      ) : (
        <>
          <rect
            x={-hw + widthCm * 0.08}
            y={-hd + depthCm * 0.16}
            width={pillowW}
            height={pillowH}
            rx={3}
            fill="#FFFFFF"
            stroke="#D4C9BA"
            strokeWidth="0.8"
          />
          <rect
            x={hw - widthCm * 0.08 - pillowW}
            y={-hd + depthCm * 0.16}
            width={pillowW}
            height={pillowH}
            rx={3}
            fill="#FFFFFF"
            stroke="#D4C9BA"
            strokeWidth="0.8"
          />
        </>
      )}

      {/* Duvet / Throw Quilt across lower bed */}
      <path
        d={`M ${-hw + 3} ${duvetTopY} L ${hw - 3} ${duvetTopY} L ${hw - 3} ${hd - 3} L ${-hw + 3} ${hd - 3} Z`}
        fill={accentColor}
        opacity="0.85"
      />

      {/* Turned-down sheet fold */}
      <line
        x1={-hw + 3}
        y1={duvetTopY}
        x2={hw - 3}
        y2={duvetTopY}
        stroke="#FFFFFF"
        strokeWidth="2"
      />
    </g>
  );
}

export function BedBunkSilhouette({ widthCm, depthCm, hw, hd, color, fabricColor, accentColor }) {
  const postSize = 6;
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={2}
        fill={color}
        stroke="#2B3830"
        strokeWidth="1.4"
      />
      <rect
        x={-hw + postSize}
        y={-hd + depthCm * 0.12}
        width={widthCm - postSize * 2}
        height={depthCm * 0.82}
        rx={2}
        fill={fabricColor}
        stroke="#D4C8B8"
        strokeWidth="0.8"
      />
      <rect
        x={-hw + postSize + 4}
        y={-hd + depthCm * 0.15}
        width={widthCm * 0.65}
        height={depthCm * 0.18}
        rx={2}
        fill="#FFFFFF"
        stroke="#C8BCAB"
        strokeWidth="0.8"
      />
      <rect
        x={-hw + postSize}
        y={-hd + depthCm * 0.42}
        width={widthCm - postSize * 2}
        height={depthCm * 0.52}
        fill={accentColor}
        opacity={0.35}
      />
      <line
        x1={-hw + postSize}
        y1={-hd + depthCm * 0.42}
        x2={hw - postSize}
        y2={-hd + depthCm * 0.42}
        stroke={accentColor}
        strokeWidth="1.2"
      />
      {[
        [-hw, -hd],
        [hw - postSize, -hd],
        [-hw, hd - postSize],
        [hw - postSize, hd - postSize],
      ].map(([px, py], i) => (
        <rect key={i} x={px} y={py} width={postSize} height={postSize} fill="#2B3830" />
      ))}
      <g transform={`translate(${hw - 8}, 0)`}>
        <rect
          x={-2}
          y={-hd + depthCm * 0.3}
          width={8}
          height={depthCm * 0.45}
          fill="#FAF6EE"
          stroke="#C97B4A"
          strokeWidth="1"
        />
        {[0.35, 0.45, 0.55, 0.65].map((t, idx) => (
          <line
            key={idx}
            x1={-1}
            y1={-hd + depthCm * t}
            x2={5}
            y2={-hd + depthCm * t}
            stroke="#C97B4A"
            strokeWidth="1.5"
          />
        ))}
      </g>
    </g>
  );
}

/** 2D plan symbols: decor. Coordinates are centered at (0, 0), widthCm x depthCm. */
import { LINE, HAIR, DETAIL, METAL, METAL_DARK, P } from './parts.jsx';

export function PlantSilhouette({ hw, hd, color, subColor }) {
  const radius = Math.min(hw, hd) * 0.42;
  return (
    <g>
      {/* Saucer, pot rim, soil and pebbles */}
      <circle cx={0} cy={0} r={radius * 1.12} fill="none" stroke={HAIR} strokeWidth="0.8" />
      <circle cx={0} cy={0} r={radius} fill={subColor} stroke="#A89B88" strokeWidth="1" />
      <circle cx={0} cy={0} r={radius * 0.9} fill="none" stroke="#C49746" strokeWidth="0.9" />
      <circle cx={0} cy={0} r={radius * 0.75} fill="#4E3B2B" />
      {[0, 1, 2, 3, 4].map((i) => (
        <circle
          key={i}
          cx={Math.cos(i * 2.4) * radius * 0.5}
          cy={Math.sin(i * 2.4) * radius * 0.5}
          r={1.2}
          fill={i % 2 ? '#B8AFA2' : '#8E877C'}
        />
      ))}
      {/* Leaves of varied size radiating out, with midribs */}
      {[0, 40, 80, 120, 160, 200, 240, 280, 320].map((angle, idx) => {
        const rad = (angle * Math.PI) / 180;
        const reach = hw * (0.55 + (0.25 * ((idx * 5) % 3)) / 2);
        const lx = Math.sin(rad) * reach * 0.6;
        const ly = -Math.cos(rad) * reach * 0.6;
        return (
          <g key={idx} transform={`rotate(${angle}, ${lx}, ${ly})`}>
            <ellipse
              cx={lx}
              cy={ly}
              rx={hw * (0.26 + 0.07 * (idx % 3))}
              ry={hd * 0.15}
              fill={color}
              stroke="#2B3D33"
              strokeWidth="0.75"
            />
            <line
              x1={lx - hw * 0.22}
              y1={ly}
              x2={lx + hw * 0.22}
              y2={ly}
              stroke="#2B3D33"
              strokeWidth="0.45"
            />
          </g>
        );
      })}
    </g>
  );
}

export function LampSilhouette({ hw, hd, subColor }) {
  const radius = Math.min(hw, hd) * 0.45;
  return (
    <g>
      <circle
        cx={0}
        cy={hd * 0.4}
        r={radius * 0.6}
        fill="#262422"
        stroke="#111111"
        strokeWidth="1"
      />
      <circle
        cx={0}
        cy={hd * 0.4}
        r={radius * 0.3}
        fill="none"
        stroke="#C49746"
        strokeWidth="0.8"
      />
      <path
        d={`M 0 ${hd * 0.4} Q ${hw * 0.6} ${0} 0 ${-hd * 0.3}`}
        fill="none"
        stroke="#262422"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <rect x={hw * 0.18} y={hd * 0.1} width={3} height={5} rx={1} fill="#2B2B2B" stroke="none" />
      <path
        d={`M ${-radius * 0.3} ${hd * 0.4 + radius * 0.5} Q ${-hw * 0.5} ${hd * 0.7} ${-hw * 0.7} ${hd * 0.85}`}
        fill="none"
        stroke="#1A1A1A"
        strokeWidth="0.8"
      />
      <circle
        cx={0}
        cy={-hd * 0.3}
        r={radius * 0.85}
        fill={subColor}
        stroke="#B3A898"
        strokeWidth="1"
      />
      <circle
        cx={0}
        cy={-hd * 0.3}
        r={radius * 0.6}
        fill="none"
        stroke="#C9BFAE"
        strokeWidth="0.6"
      />
      <circle cx={0} cy={-hd * 0.3} r={3} fill="#C97B4A" />
    </g>
  );
}

export function LampTripodSilhouette({ hw, hd, color, subColor }) {
  const radius = Math.min(hw, hd);
  return (
    <g>
      {[90, 210, 330].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <line
            key={angle}
            x1={0}
            y1={0}
            x2={Math.cos(rad) * radius * 0.92}
            y2={Math.sin(rad) * radius * 0.92}
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
          />
        );
      })}
      <path
        d={`M ${radius * 0.4} ${radius * 0.5} Q ${radius * 0.8} ${radius * 0.8} ${radius * 0.95} ${radius * 0.7}`}
        fill="none"
        stroke="#1A1A1A"
        strokeWidth="0.8"
      />
      <circle cx={0} cy={0} r={radius * 0.6} fill={subColor} stroke="#B3A898" strokeWidth="1" />
      <circle cx={0} cy={0} r={radius * 0.46} fill="none" stroke="#B3A898" strokeWidth="0.6" />
      <circle
        cx={0}
        cy={0}
        r={Math.max(2, radius * 0.08)}
        fill="#C97B4A"
        stroke={LINE}
        strokeWidth="0.4"
      />
    </g>
  );
}

export function LampTorchiereSilhouette({ hw, hd, color, subColor }) {
  const radius = Math.min(hw, hd);
  return (
    <g>
      <circle cx={0} cy={0} r={radius * 0.96} fill={color} stroke="#111111" strokeWidth="1" />
      <circle
        cx={0}
        cy={0}
        r={radius * 0.84}
        fill="none"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.7"
      />
      <circle cx={0} cy={0} r={radius * 0.72} fill={subColor} stroke="#B3A898" strokeWidth="1" />
      <circle cx={0} cy={0} r={radius * 0.46} fill="none" stroke="#C9BFAE" strokeWidth="0.6" />
      <circle cx={0} cy={0} r={radius * 0.22} fill="#F0DDB4" stroke="#B3A898" strokeWidth="0.8" />
      <path
        d={`M ${radius * 0.3} ${radius * 0.7} Q ${radius * 0.7} ${radius * 0.95} ${radius * 0.5} ${radius * 1.1}`}
        fill="none"
        stroke="#1A1A1A"
        strokeWidth="0.7"
      />
    </g>
  );
}

export function WallMirrorSilhouette({ item, widthCm, depthCm, hw, hd, color }) {
  const id = item?.id || '';
  const cabinet = id === 'mirror-cabinet';
  const cheval = id === 'cheval-mirror';
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={2}
        fill={color}
        stroke="#4A3B2B"
        strokeWidth="1.2"
      />
      {cheval ? (
        <g>
          {/* Two posts with sled feet and swivel knobs, mirror between them */}
          {[-1, 1].map((s) => (
            <g key={s}>
              <rect
                x={s * (hw - 3) - 2.5}
                y={-hd}
                width={5}
                height={depthCm}
                rx={1.5}
                fill="#4A3B2B"
                stroke="none"
              />
              <circle
                cx={s * (hw - 3)}
                cy={0}
                r={2.2}
                fill="#C49746"
                stroke={LINE}
                strokeWidth="0.4"
              />
            </g>
          ))}
          <rect
            x={-hw + 8}
            y={-2.2}
            width={P(widthCm - 16)}
            height={4.4}
            rx={1}
            fill="#B0D3E2"
            stroke="#7E9DAA"
            strokeWidth="0.7"
          />
          <line
            x1={-hw * 0.5}
            y1={-0.6}
            x2={-hw * 0.1}
            y2={0.6}
            stroke="rgba(255,255,255,0.8)"
            strokeWidth="0.6"
          />
        </g>
      ) : (
        <g>
          <rect
            x={-hw + 3}
            y={-hd + 3}
            width={P(widthCm - 6)}
            height={P(depthCm - 6)}
            fill="#B0D3E2"
            stroke="#7E9DAA"
            strokeWidth="0.8"
          />
          <rect
            x={-hw + 4.5}
            y={-hd + 4.5}
            width={P(widthCm - 9)}
            height={P(depthCm - 9)}
            fill="none"
            stroke="rgba(255,255,255,0.45)"
            strokeWidth="0.5"
          />
          <line
            x1={-hw * 0.3}
            y1={-hd + 5}
            x2={-hw * 0.1}
            y2={hd - 5}
            stroke="rgba(255,255,255,0.7)"
            strokeWidth="1"
            strokeLinecap="round"
          />
          <line
            x1={hw * 0.1}
            y1={-hd + 5}
            x2={hw * 0.25}
            y2={hd - 5}
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="0.75"
            strokeLinecap="round"
          />
        </g>
      )}
      {cabinet && (
        <g>
          {/* Door hinges on the left edge, finger pull on the right, lit strip along the top */}
          {[-0.6, 0.6].map((f) => (
            <rect
              key={f}
              x={-hw - 0.5}
              y={hd * f - 2}
              width={2}
              height={4}
              fill={METAL}
              stroke={METAL_DARK}
              strokeWidth="0.4"
            />
          ))}
          <circle cx={hw - 4} cy={0} r={1.2} fill="#D8D8D8" stroke={LINE} strokeWidth="0.4" />
          <line
            x1={-hw * 0.6}
            y1={-hd + 1.6}
            x2={hw * 0.6}
            y2={-hd + 1.6}
            stroke="#FFF1CC"
            strokeWidth="1"
          />
        </g>
      )}
      {!cabinet && !cheval && (
        <g>
          {/* Frame corner joints and the rear easel leg */}
          {[
            [-hw, -hd],
            [hw - 5, -hd],
            [-hw, hd - 5],
            [hw - 5, hd - 5],
          ].map(([x, y], i) => (
            <rect
              key={i}
              x={x}
              y={y}
              width={5}
              height={5}
              fill="none"
              stroke={DETAIL}
              strokeWidth="0.5"
            />
          ))}
          <line
            x1={-hw * 0.3}
            y1={0}
            x2={-hw * 0.3}
            y2={-hd}
            stroke={HAIR}
            strokeWidth="0.6"
            strokeDasharray="2 1.5"
          />
          <line
            x1={hw * 0.3}
            y1={0}
            x2={hw * 0.3}
            y2={-hd}
            stroke={HAIR}
            strokeWidth="0.6"
            strokeDasharray="2 1.5"
          />
        </g>
      )}
    </g>
  );
}

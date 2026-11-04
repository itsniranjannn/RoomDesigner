/** 2D plan symbols: small pieces that stand on other furniture. Coordinates centered at (0, 0). */
import { HAIR, P } from './parts.jsx';

export function TableLampSilhouette({ hw, hd, color, subColor }) {
  const r = Math.min(hw, hd);
  return (
    <g>
      <circle cx={0} cy={0} r={r} fill={subColor || '#F2E8D5'} stroke="#B3A898" strokeWidth="1" />
      <circle cx={0} cy={0} r={r * 0.62} fill="none" stroke="#C9BFAE" strokeWidth="0.6" />
      <circle cx={0} cy={0} r={r * 0.3} fill={color} stroke="#4A4640" strokeWidth="0.8" />
      <circle cx={0} cy={0} r={r * 0.1} fill="#C49746" stroke="none" />
    </g>
  );
}

export function MonitorSilhouette({ widthCm, depthCm, hw, hd, color, subColor }) {
  return (
    <g>
      <circle
        cx={0}
        cy={hd * 0.2}
        r={P(Math.min(hd * 0.8, hw * 0.28))}
        fill={subColor}
        stroke="#0B0C0D"
        strokeWidth="0.8"
      />
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={P(depthCm * 0.34)}
        rx={1.2}
        fill={color}
        stroke="#0B0C0D"
        strokeWidth="1"
      />
      <rect
        x={-hw + 1.5}
        y={-hd + 0.8}
        width={P(widthCm - 3)}
        height={P(depthCm * 0.34 - 1.6)}
        fill="#16273A"
        stroke="none"
      />
      <rect
        x={-3}
        y={-hd + depthCm * 0.34}
        width={6}
        height={P(hd * 0.9)}
        rx={1}
        fill={subColor}
        stroke="none"
      />
    </g>
  );
}

export function MicrowaveSilhouette({ widthCm, depthCm, hw, hd, color }) {
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={2}
        fill={color}
        stroke="#7C8186"
        strokeWidth="1"
      />
      <rect
        x={-hw + 2}
        y={hd - 3}
        width={P(widthCm * 0.66)}
        height={2.2}
        fill="#0F1316"
        stroke="none"
      />
      <rect
        x={hw - widthCm * 0.24}
        y={hd - 3}
        width={P(widthCm * 0.2)}
        height={2.2}
        fill="#B9BDC1"
        stroke="none"
      />
      <rect
        x={-hw + 4}
        y={-hd + 4}
        width={P(widthCm - 8)}
        height={P(depthCm - 12)}
        rx={1.5}
        fill="none"
        stroke={HAIR}
        strokeWidth="0.6"
      />
    </g>
  );
}

export function BookStackSilhouette({ widthCm, depthCm, hw, hd, color, subColor }) {
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={1}
        fill="#EFE6D3"
        stroke="#6B5A44"
        strokeWidth="0.9"
      />
      <rect
        x={-hw}
        y={-hd}
        width={P(widthCm * 0.14)}
        height={depthCm}
        rx={1}
        fill={color}
        stroke="#6B5A44"
        strokeWidth="0.6"
      />
      <rect
        x={-hw + widthCm * 0.14 + 2}
        y={-hd + 3}
        width={P(widthCm * 0.5)}
        height={1.4}
        fill={subColor || '#2F4A5C'}
        stroke="none"
      />
      <rect
        x={-hw + widthCm * 0.14 + 2}
        y={-hd + 6}
        width={P(widthCm * 0.34)}
        height={1}
        fill={HAIR}
        stroke="none"
      />
    </g>
  );
}

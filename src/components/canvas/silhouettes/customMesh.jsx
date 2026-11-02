/** 2D plan symbols: customMesh. Coordinates are centered at (0, 0), widthCm x depthCm. */
export function CustomMeshSilhouette({ item, widthCm, depthCm, hw, hd, color }) {
  return (
    <g>
      <rect x={-hw} y={-hd} width={widthCm} height={depthCm} rx={3} fill={color} stroke="#22180E" strokeWidth="1.4" />
      {item.topImage && (
        <image
          href={item.topImage}
          x={-hw}
          y={-hd}
          width={widthCm}
          height={depthCm}
          preserveAspectRatio="none"
        />
      )}
      <rect x={-hw} y={-hd} width={widthCm} height={depthCm} rx={3} fill="none" stroke="#22180E" strokeWidth="1.4" />
      {/* Front edge marker so orientation stays readable */}
      <line x1={-hw + 4} y1={hd - 3} x2={hw - 4} y2={hd - 3} stroke="rgba(34,24,14,0.55)" strokeWidth="1.6" strokeDasharray="4 3" />
    </g>
  );
}

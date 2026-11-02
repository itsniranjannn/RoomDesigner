/** Plain box used when a shapeType has no dedicated 3D model. */
export function FallbackBoxModel({ widthM, depthM, heightM, mainColor }) {
  return (
    <mesh position={[0, heightM / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[widthM, heightM, depthM]} />
      <meshStandardMaterial color={mainColor} roughness={0.7} />
    </mesh>
  );
}

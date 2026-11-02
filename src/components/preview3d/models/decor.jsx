/** 3D models: decor. Built from Three.js primitives; origin on the floor, centered on the footprint. */

export function PlantModel({ def, widthM, depthM, heightM, mainColor }) {
  const potRadius = Math.min(widthM, depthM) * 0.32;
  const potH = 0.42;
  const trunkH = heightM - potH;

  return (
    <group>
      {/* Fluted Ceramic Planter Pot */}
      <mesh position={[0, potH / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[potRadius, potRadius * 0.75, potH, 24]} />
        <meshStandardMaterial color={def.subColor || '#DDD6C9'} roughness={0.5} />
      </mesh>
      {/* Brass Ring Accent around Pot Rim */}
      <mesh position={[0, potH - 0.01, 0]} castShadow>
        <torusGeometry args={[potRadius * 0.98, 0.012, 12, 24]} rotation={[Math.PI / 2, 0, 0]} />
        <meshStandardMaterial color="#C49746" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Rich Organic Potting Soil Bed */}
      <mesh position={[0, potH - 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[potRadius * 0.92, potRadius * 0.92, 0.02, 20]} />
        <meshStandardMaterial color="#2E1C12" roughness={0.95} />
      </mesh>

      {/* Woody Central Trunk Stem */}
      <mesh position={[0, potH + trunkH * 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.018, 0.025, trunkH * 0.82, 12]} />
        <meshStandardMaterial color="#3E2C1E" roughness={0.85} />
      </mesh>

      {/* Architectural Broad Fiddle Leaves radiating at staggered heights and upward angles, strictly confined within bounding footprint */}
      {[
        { y: 0.12, r: 0.14, rotY: 0, tilt: 0.65, scale: 0.75 },
        { y: 0.22, r: 0.16, rotY: Math.PI / 3, tilt: 0.70, scale: 0.8 },
        { y: 0.32, r: 0.17, rotY: (2 * Math.PI) / 3, tilt: 0.60, scale: 0.85 },
        { y: 0.42, r: 0.18, rotY: Math.PI, tilt: 0.68, scale: 0.9 },
        { y: 0.52, r: 0.17, rotY: (4 * Math.PI) / 3, tilt: 0.62, scale: 0.85 },
        { y: 0.62, r: 0.15, rotY: (5 * Math.PI) / 3, tilt: 0.65, scale: 0.8 },
        { y: 0.72, r: 0.13, rotY: Math.PI / 4, tilt: 0.55, scale: 0.7 },
        { y: 0.80, r: 0.11, rotY: (3 * Math.PI) / 4, tilt: 0.50, scale: 0.6 },
      ].map((leaf, idx) => {
        const petioleLen = leaf.r * 0.7;
        const leafLen = 0.18 * leaf.scale;
        const leafW = 0.13 * leaf.scale;
        return (
          <group key={idx} position={[0, potH + leaf.y * trunkH, 0]} rotation={[0, leaf.rotY, 0]}>
            {/* Leaf Petiole / Branch angled upwards */}
            <mesh position={[0, (petioleLen / 2) * Math.sin(leaf.tilt), (petioleLen / 2) * Math.cos(leaf.tilt)]} rotation={[leaf.tilt, 0, 0]} castShadow>
              <cylinderGeometry args={[0.005, 0.007, petioleLen, 8]} rotation={[Math.PI / 2, 0, 0]} />
              <meshStandardMaterial color="#2F4234" roughness={0.7} />
            </mesh>
            {/* Sculptural Broad Fig Leaf angled upright */}
            <mesh
              position={[0, petioleLen * Math.sin(leaf.tilt) + (leafLen * 0.45) * Math.sin(leaf.tilt + 0.15), petioleLen * Math.cos(leaf.tilt) + (leafLen * 0.45) * Math.cos(leaf.tilt + 0.15)]}
              rotation={[leaf.tilt + 0.2, 0, 0]}
              castShadow
            >
              <boxGeometry args={[leafW, 0.004, leafLen]} />
              <meshStandardMaterial color={idx % 2 === 0 ? mainColor : '#415D48'} roughness={0.65} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export function LampModel({ def, widthM, depthM, heightM, mainColor }) {
  // Architectural Cantilevered Arc Lamp (Base at rear +Z, sweeping overhead arc forward to hanging shade at -Z)
  const baseR = Math.min(widthM, depthM) * 0.32;
  const poleR = 0.014;
  const shadeR = baseR * 0.95;

  return (
    <group>
      {/* Weighted Circular Steel Base Disc */}
      <mesh position={[0, 0.02, depthM * 0.28]} castShadow receiveShadow>
        <cylinderGeometry args={[baseR, baseR, 0.04, 32]} />
        <meshStandardMaterial color={mainColor} roughness={0.35} metalness={0.7} />
      </mesh>
      {/* Polished Brass Base Ring Accent */}
      <mesh position={[0, 0.042, depthM * 0.28]} castShadow>
        <cylinderGeometry args={[baseR * 0.45, baseR * 0.45, 0.015, 24]} />
        <meshStandardMaterial color="#C49746" metalness={0.85} roughness={0.25} />
      </mesh>

      {/* Segment 1: Lower Vertical Riser Pole */}
      <mesh position={[0, heightM * 0.42, depthM * 0.28]} castShadow>
        <cylinderGeometry args={[poleR, poleR, heightM * 0.8, 16]} />
        <meshStandardMaterial color={mainColor} roughness={0.35} metalness={0.7} />
      </mesh>

      {/* Segment 2: Upper Angled Arc Arm reaching forward */}
      <mesh position={[0, heightM * 0.88, depthM * 0.08]} rotation={[-0.65, 0, 0]} castShadow>
        <cylinderGeometry args={[poleR, poleR, heightM * 0.52, 16]} />
        <meshStandardMaterial color={mainColor} roughness={0.35} metalness={0.7} />
      </mesh>

      {/* Segment 3: Horizontal Cantilever Arm extending forward */}
      <mesh position={[0, heightM * 1.02, -depthM * 0.12]} rotation={[-Math.PI / 2 + 0.1, 0, 0]} castShadow>
        <cylinderGeometry args={[poleR, poleR, depthM * 0.36, 16]} />
        <meshStandardMaterial color={mainColor} roughness={0.35} metalness={0.7} />
      </mesh>

      {/* Brass Arm Adjustment Knuckle */}
      <mesh position={[0, heightM * 0.82, depthM * 0.28]} castShadow>
        <sphereGeometry args={[0.026, 16, 16]} />
        <meshStandardMaterial color="#C49746" metalness={0.88} roughness={0.2} />
      </mesh>

      {/* Hanging Cord & Brass Shade Cap */}
      <mesh position={[0, heightM * 0.94, -depthM * 0.24]} castShadow>
        <cylinderGeometry args={[0.005, 0.005, 0.16, 8]} />
        <meshStandardMaterial color="#1C1A17" />
      </mesh>
      <mesh position={[0, heightM * 0.86, -depthM * 0.24]} castShadow>
        <cylinderGeometry args={[0.045, 0.025, 0.035, 20]} />
        <meshStandardMaterial color="#C49746" metalness={0.88} roughness={0.2} />
      </mesh>

      {/* Architectural Linen Dome Lamp Shade */}
      <mesh position={[0, heightM * 0.78, -depthM * 0.24]} castShadow>
        <sphereGeometry args={[shadeR, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial
          color={def.subColor || '#FAF6EE'}
          roughness={0.85}
          side={2}
        />
      </mesh>
      {/* Soft Ambient Light Glow Bulb inside Shade */}
      <mesh position={[0, heightM * 0.76, -depthM * 0.24]}>
        <sphereGeometry args={[0.038, 16, 16]} />
        <meshBasicMaterial color="#FFF5DF" />
      </mesh>
    </group>
  );
}

export function WallMirrorModel({ widthM, depthM, heightM, mainColor, legColor }) {
  const frameW = 0.055; // 5.5cm timber border molding
  const frameThick = 0.04; // 4cm depth
  const tiltAngle = 0.08; // subtle elegant ~4.5 degree lean backward
  const glassW = widthM - frameW * 2;
  const glassH = heightM - frameW * 2;
  const mirrorH = heightM;

  return (
    // Mirror frame front sits at +depthM/2 - 0.04m, so rear easel stays strictly within -depthM/2
    <group position={[0, 0, depthM * 0.3]}>
      {/* Leaning Mirror Main Frame & Glass Assembly */}
      <group rotation={[-tiltAngle, 0, 0]}>
        {/* Top Frame Rail */}
        <mesh position={[0, mirrorH - frameW / 2, 0]} castShadow>
          <boxGeometry args={[widthM, frameW, frameThick]} />
          <meshStandardMaterial color={mainColor} roughness={0.55} />
        </mesh>
        {/* Bottom Frame Rail */}
        <mesh position={[0, frameW / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[widthM, frameW, frameThick]} />
          <meshStandardMaterial color={mainColor} roughness={0.55} />
        </mesh>
        {/* Left Stile */}
        <mesh position={[-widthM / 2 + frameW / 2, mirrorH / 2, 0]} castShadow>
          <boxGeometry args={[frameW, mirrorH, frameThick]} />
          <meshStandardMaterial color={mainColor} roughness={0.55} />
        </mesh>
        {/* Right Stile */}
        <mesh position={[widthM / 2 - frameW / 2, mirrorH / 2, 0]} castShadow>
          <boxGeometry args={[frameW, mirrorH, frameThick]} />
          <meshStandardMaterial color={mainColor} roughness={0.55} />
        </mesh>

        {/* Back Protective Timber Panel */}
        <mesh position={[0, mirrorH / 2, -frameThick / 2 + 0.005]}>
          <boxGeometry args={[glassW, glassH, 0.01]} />
          <meshStandardMaterial color="#2B1F13" roughness={0.8} />
        </mesh>

        {/* Luminous Silver-Ice Reflective Mirror Glass */}
        <mesh position={[0, mirrorH / 2, 0.006]}>
          <boxGeometry args={[glassW, glassH, 0.008]} />
          <meshStandardMaterial
            color="#E8F4F8"
            roughness={0.15}
            metalness={0.1}
          />
        </mesh>

        {/* Architectural Reflection Diagonal Glare Bars */}
        <mesh position={[0, mirrorH * 0.58, 0.012]} rotation={[0, 0, -0.42]}>
          <planeGeometry args={[widthM * 0.82, 0.045]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.85} />
        </mesh>
        <mesh position={[-widthM * 0.12, mirrorH * 0.42, 0.012]} rotation={[0, 0, -0.42]}>
          <planeGeometry args={[widthM * 0.6, 0.024]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.65} />
        </mesh>

        {/* Top Brass Pivot Hinge attached to back of frame */}
        <mesh position={[0, mirrorH * 0.82, -frameThick / 2 - 0.008]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, widthM * 0.32, 12]} />
          <meshStandardMaterial color="#C49746" metalness={0.85} roughness={0.25} />
        </mesh>

        {/* Rear Supporting Easel Leg - angled so foot lands neatly within rear footprint */}
        <group position={[0, mirrorH * 0.82, -frameThick / 2 - 0.008]} rotation={[0.16, 0, 0]}>
          <mesh position={[0, -mirrorH * 0.41, 0]} castShadow>
            <boxGeometry args={[widthM * 0.28, mirrorH * 0.82, 0.018]} />
            <meshStandardMaterial color={legColor || '#2B1F13'} roughness={0.6} />
          </mesh>
          {/* Cross brace on easel leg */}
          <mesh position={[0, -mirrorH * 0.58, -0.008]} castShadow>
            <boxGeometry args={[widthM * 0.32, 0.03, 0.016]} />
            <meshStandardMaterial color={legColor || '#2B1F13'} roughness={0.6} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

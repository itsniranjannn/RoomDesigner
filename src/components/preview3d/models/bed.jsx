/** 3D models: bed. Built from Three.js primitives; origin on the floor, centered on the footprint. */

export function BedModel({ widthM, depthM, mainColor, fabricColor, headboardColor, accentColor }) {
  const isSingle = widthM < 1.2;
  const headboardH = 0.95;
  const headboardThick = 0.08;
  const mattressH = 0.22;
  const plinthH = 0.18;
  const pillowW = isSingle ? widthM * 0.6 : widthM * 0.38;

  return (
    <group>
      {/* Wooden Plinth Base */}
      <mesh position={[0, plinthH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM, plinthH, depthM]} />
        <meshStandardMaterial color={mainColor} roughness={0.7} />
      </mesh>

      {/* Headboard at the back (-Z in local space) */}
      <mesh
        position={[0, headboardH / 2, -depthM / 2 + headboardThick / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[widthM, headboardH, headboardThick]} />
        <meshStandardMaterial color={headboardColor} roughness={0.8} />
      </mesh>

      {/* Mattress */}
      <mesh
        position={[0, plinthH + mattressH / 2, headboardThick / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[widthM * 0.96, mattressH, depthM - headboardThick - 0.04]} />
        <meshStandardMaterial color={fabricColor} roughness={0.9} />
      </mesh>

      {/* Pillows */}
      {isSingle ? (
        <mesh
          position={[0, plinthH + mattressH + 0.04, -depthM / 2 + headboardThick + 0.2]}
          rotation={[0.2, 0, 0]}
          castShadow
        >
          <boxGeometry args={[pillowW, 0.08, 0.26]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.9} />
        </mesh>
      ) : (
        <>
          <mesh
            position={[-widthM * 0.24, plinthH + mattressH + 0.04, -depthM / 2 + headboardThick + 0.2]}
            rotation={[0.2, 0, 0]}
            castShadow
          >
            <boxGeometry args={[pillowW, 0.08, 0.26]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.9} />
          </mesh>
          <mesh
            position={[widthM * 0.24, plinthH + mattressH + 0.04, -depthM / 2 + headboardThick + 0.2]}
            rotation={[0.2, 0, 0]}
            castShadow
          >
            <boxGeometry args={[pillowW, 0.08, 0.26]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.9} />
          </mesh>
        </>
      )}

      {/* Folded Duvet / Throw across lower bed */}
      <mesh
        position={[0, plinthH + mattressH + 0.015, depthM * 0.15]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[widthM * 0.97, 0.03, depthM * 0.52]} />
        <meshStandardMaterial color={accentColor} roughness={0.85} />
      </mesh>
    </group>
  );
}

export function BedBunkModel({ widthM, depthM, heightM, mainColor, fabricColor, accentColor }) {
  const postW = 0.055;
  const lowerMattressY = 0.32;
  const upperMattressY = heightM * 0.68;
  return (
    <group>
      {/* 4 Corner Posts */}
      {[
        [-widthM / 2 + postW / 2, -depthM / 2 + postW / 2],
        [widthM / 2 - postW / 2, -depthM / 2 + postW / 2],
        [-widthM / 2 + postW / 2, depthM / 2 - postW / 2],
        [widthM / 2 - postW / 2, depthM / 2 - postW / 2],
      ].map(([px, pz], idx) => (
        <mesh key={idx} position={[px, heightM / 2, pz]} castShadow receiveShadow>
          <boxGeometry args={[postW, heightM, postW]} />
          <meshStandardMaterial color={mainColor} roughness={0.7} />
        </mesh>
      ))}

      {/* Lower Bed Frame & Mattress */}
      <mesh position={[0, lowerMattressY - 0.08, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM - postW * 2, 0.12, depthM - postW * 2]} />
        <meshStandardMaterial color={mainColor} roughness={0.7} />
      </mesh>
      <mesh position={[0, lowerMattressY + 0.04, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM - postW * 2 - 0.04, 0.16, depthM - postW * 2 - 0.04]} />
        <meshStandardMaterial color={fabricColor} roughness={0.9} />
      </mesh>
      {/* Lower Pillow */}
      <mesh position={[0, lowerMattressY + 0.14, -depthM / 2 + 0.35]} castShadow>
        <boxGeometry args={[widthM * 0.65, 0.08, 0.32]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.8} />
      </mesh>

      {/* Upper Bed Frame & Mattress */}
      <mesh position={[0, upperMattressY - 0.08, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM - postW * 2, 0.12, depthM - postW * 2]} />
        <meshStandardMaterial color={mainColor} roughness={0.7} />
      </mesh>
      <mesh position={[0, upperMattressY + 0.04, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM - postW * 2 - 0.04, 0.16, depthM - postW * 2 - 0.04]} />
        <meshStandardMaterial color={fabricColor} roughness={0.9} />
      </mesh>
      {/* Upper Pillow */}
      <mesh position={[0, upperMattressY + 0.14, -depthM / 2 + 0.35]} castShadow>
        <boxGeometry args={[widthM * 0.65, 0.08, 0.32]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.8} />
      </mesh>

      {/* Upper Safety Guard Rails */}
      <mesh position={[0, upperMattressY + 0.22, depthM / 2 - postW / 2]} castShadow>
        <boxGeometry args={[widthM - postW * 2, 0.05, 0.025]} />
        <meshStandardMaterial color={mainColor} roughness={0.7} />
      </mesh>
      <mesh position={[0, upperMattressY + 0.22, -depthM / 2 + postW / 2]} castShadow>
        <boxGeometry args={[widthM - postW * 2, 0.05, 0.025]} />
        <meshStandardMaterial color={mainColor} roughness={0.7} />
      </mesh>

      {/* Ladder Rungs on Front Edge */}
      {[0.25, 0.5, 0.75, 1.0, 1.25].map((ly, i) => (
        <mesh key={i} position={[widthM / 2 - 0.15, ly, depthM / 2 + 0.02]} castShadow>
          <cylinderGeometry args={[0.015, 0.015, 0.28, 12]} rotation={[0, 0, Math.PI / 2]} />
          <meshStandardMaterial color={accentColor} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

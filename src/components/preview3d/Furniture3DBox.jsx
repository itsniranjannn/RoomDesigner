import { getFurnitureType, resolveItemDef } from '../../data/furnitureCatalog.js';
import { degToRad } from '../../engine/geometry.js';
import { resolveModel } from './models/index.js';

/**
 * Furniture3DBox.jsx
 * Professional architectural 3D furniture models composed of clean Three.js primitives.
 * Derived from 2D footprint data and category shapes.
 * Tables have real legs you can see under, beds have mattresses & headboards,
 * sofas have cushions & armrests.
 * Thin dispatcher: each shapeType is built by a module under ./models.
 */
export function Furniture3DBox({ item, roomWidthCm, roomDepthCm, isSelected }) {
  const def = resolveItemDef(item);
  if (!def) return null;

  const widthM = def.widthCm / 100;
  const depthM = def.depthCm / 100;
  // Models are drawn at the catalog height and stretched when the piece is resized,
  // so every model follows heightCm without handling it separately.
  const baseHeightM = (getFurnitureType(item.furnitureTypeId)?.heightCm || def.heightCm) / 100;
  const heightM = def.heightCm / 100;

  // Convert room cm coordinates (origin at top-left) to Three.js meters (origin centered on floor)
  const posX = (item.x - roomWidthCm / 2) / 100;
  const posZ = (item.y - roomDepthCm / 2) / 100;

  // Clockwise rotation around Y-axis in (X, Z)
  const rotY = -degToRad(item.rotationDeg || 0);

  const Model = resolveModel(def.shapeType);

  return (
    <group position={[posX, (item.elevationCm || 0) / 100, posZ]} rotation={[0, rotY, 0]}>
      <group scale={[1, heightM / baseHeightM, 1]}>
        <Model
          def={def}
          widthM={widthM}
          depthM={depthM}
          heightM={baseHeightM}
          mainColor={def.color}
          fabricColor={def.fabricColor || '#FAF6EE'}
          headboardColor={def.headboardColor || '#5A554E'}
          accentColor={def.accentColor || '#C4B8A5'}
          cushionColor={def.cushionColor || def.color}
          legColor={def.legColor || '#242321'}
          handleColor={def.handleColor || '#C4A869'}
          subColor={def.subColor || '#D4A359'}
        />
      </group>

      {/* Subtle floor-level selection halo in 3D (Himalayan Indigo) */}
      {isSelected && (
        <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[widthM + 0.08, depthM + 0.08]} />
          <meshBasicMaterial color="#22485E" transparent opacity={0.3} />
        </mesh>
      )}
    </group>
  );
}

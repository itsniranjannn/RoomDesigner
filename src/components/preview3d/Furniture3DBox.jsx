import React from 'react';
import { getFurnitureType } from '../../data/furnitureCatalog.js';
import { degToRad } from '../../engine/geometry.js';

/**
 * Furniture3DBox.jsx
 * Professional architectural 3D furniture models composed of clean Three.js primitives.
 * Derived from 2D footprint data and category shapes.
 * Tables have real legs you can see under, beds have mattresses & headboards,
 * sofas have cushions & armrests.
 */
export function Furniture3DBox({ item, roomWidthCm, roomDepthCm, isSelected, isColliding }) {
  const def = getFurnitureType(item.furnitureTypeId);
  if (!def) return null;

  const widthM = def.widthCm / 100;
  const depthM = def.depthCm / 100;
  const heightM = def.heightCm / 100;

  // Convert room cm coordinates (origin at top-left) to Three.js meters (origin centered on floor)
  const posX = (item.x - roomWidthCm / 2) / 100;
  const posZ = (item.y - roomDepthCm / 2) / 100;

  // Clockwise rotation around Y-axis in (X, Z)
  const rotY = -degToRad(item.rotationDeg || 0);

  const mainColor = def.color;
  const fabricColor = def.fabricColor || '#FAF6EE';
  const headboardColor = def.headboardColor || '#5A554E';
  const accentColor = def.accentColor || '#C4B8A5';
  const cushionColor = def.cushionColor || def.color;
  const legColor = def.legColor || '#242321';
  const handleColor = def.handleColor || '#C4A869';

  const render3DModel = () => {
    switch (def.shapeType) {
      case 'bed': {
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

      case 'sofa': {
        const armW = widthM * 0.12;
        const seatH = 0.42;
        const backH = 0.78;
        const backThick = depthM * 0.25;

        return (
          <group>
            {/* Seat Base */}
            <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
              <boxGeometry args={[widthM, 0.18, depthM]} />
              <meshStandardMaterial color={mainColor} roughness={0.8} />
            </mesh>

            {/* Plush Seat Cushions */}
            <mesh position={[0, seatH, backThick / 2]} castShadow receiveShadow>
              <boxGeometry args={[widthM - armW * 2, 0.14, depthM - backThick]} />
              <meshStandardMaterial color={cushionColor} roughness={0.85} />
            </mesh>

            {/* Backrest along -Z */}
            <mesh
              position={[0, backH / 2 + 0.1, -depthM / 2 + backThick / 2]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[widthM, backH - 0.1, backThick]} />
              <meshStandardMaterial color={mainColor} roughness={0.8} />
            </mesh>

            {/* Left Armrest */}
            <mesh position={[-widthM / 2 + armW / 2, 0.34, 0]} castShadow receiveShadow>
              <boxGeometry args={[armW, 0.42, depthM]} />
              <meshStandardMaterial color={mainColor} roughness={0.8} />
            </mesh>

            {/* Right Armrest */}
            <mesh position={[widthM / 2 - armW / 2, 0.34, 0]} castShadow receiveShadow>
              <boxGeometry args={[armW, 0.42, depthM]} />
              <meshStandardMaterial color={mainColor} roughness={0.8} />
            </mesh>

            {/* 4 Wooden / Steel Feet */}
            {[
              [-widthM / 2 + 0.06, -depthM / 2 + 0.06],
              [widthM / 2 - 0.06, -depthM / 2 + 0.06],
              [-widthM / 2 + 0.06, depthM / 2 - 0.06],
              [widthM / 2 - 0.06, depthM / 2 - 0.06],
            ].map(([fx, fz], idx) => (
              <mesh key={idx} position={[fx, 0.05, fz]} castShadow>
                <boxGeometry args={[0.05, 0.1, 0.05]} />
                <meshStandardMaterial color={legColor} roughness={0.5} />
              </mesh>
            ))}
          </group>
        );
      }

      case 'armchair': {
        const armW = widthM * 0.18;
        const backThick = depthM * 0.28;

        return (
          <group>
            {/* Seat Base */}
            <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
              <boxGeometry args={[widthM, 0.16, depthM]} />
              <meshStandardMaterial color={mainColor} roughness={0.65} />
            </mesh>

            {/* Seat Cushion */}
            <mesh position={[0, 0.36, backThick / 2]} castShadow receiveShadow>
              <boxGeometry args={[widthM - armW * 2, 0.14, depthM - backThick]} />
              <meshStandardMaterial color={cushionColor} roughness={0.7} />
            </mesh>

            {/* Backrest */}
            <mesh position={[0, 0.48, -depthM / 2 + backThick / 2]} castShadow receiveShadow>
              <boxGeometry args={[widthM, 0.52, backThick]} />
              <meshStandardMaterial color={mainColor} roughness={0.65} />
            </mesh>

            {/* Left & Right Armrests */}
            <mesh position={[-widthM / 2 + armW / 2, 0.34, 0]} castShadow receiveShadow>
              <boxGeometry args={[armW, 0.38, depthM]} />
              <meshStandardMaterial color={mainColor} roughness={0.65} />
            </mesh>
            <mesh position={[widthM / 2 - armW / 2, 0.34, 0]} castShadow receiveShadow>
              <boxGeometry args={[armW, 0.38, depthM]} />
              <meshStandardMaterial color={mainColor} roughness={0.65} />
            </mesh>

            {/* 4 Tapered Feet */}
            {[
              [-widthM / 2 + 0.08, -depthM / 2 + 0.08],
              [widthM / 2 - 0.08, -depthM / 2 + 0.08],
              [-widthM / 2 + 0.08, depthM / 2 - 0.08],
              [widthM / 2 - 0.08, depthM / 2 - 0.08],
            ].map(([fx, fz], idx) => (
              <mesh key={idx} position={[fx, 0.07, fz]} castShadow>
                <boxGeometry args={[0.04, 0.14, 0.04]} />
                <meshStandardMaterial color={legColor} roughness={0.5} />
              </mesh>
            ))}
          </group>
        );
      }

      case 'table': {
        // Dining Table: tabletop + 4 distinct legs
        const topH = 0.04;
        const tableH = 0.74;
        const legThick = 0.06;

        return (
          <group>
            {/* Tabletop */}
            <mesh position={[0, tableH - topH / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[widthM, topH, depthM]} />
              <meshStandardMaterial color={mainColor} roughness={0.65} />
            </mesh>

            {/* 4 Legs at corners */}
            {[
              [-widthM / 2 + 0.08, -depthM / 2 + 0.08],
              [widthM / 2 - 0.08, -depthM / 2 + 0.08],
              [-widthM / 2 + 0.08, depthM / 2 - 0.08],
              [widthM / 2 - 0.08, depthM / 2 - 0.08],
            ].map(([lx, lz], idx) => (
              <mesh key={idx} position={[lx, (tableH - topH) / 2, lz]} castShadow receiveShadow>
                <boxGeometry args={[legThick, tableH - topH, legThick]} />
                <meshStandardMaterial color={legColor} roughness={0.5} />
              </mesh>
            ))}
          </group>
        );
      }

      case 'desk': {
        const topH = 0.04;
        const deskH = 0.74;
        const pedestalW = widthM * 0.28;

        return (
          <group>
            {/* Desktop */}
            <mesh position={[0, deskH - topH / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[widthM, topH, depthM]} />
              <meshStandardMaterial color={mainColor} roughness={0.65} />
            </mesh>

            {/* Desk Pad */}
            <mesh position={[-0.05, deskH + 0.002, 0.05]} receiveShadow>
              <boxGeometry args={[widthM * 0.48, 0.004, depthM * 0.52]} />
              <meshStandardMaterial color="#323639" roughness={0.8} />
            </mesh>

            {/* Right Drawer Pedestal Unit */}
            <mesh
              position={[widthM / 2 - pedestalW / 2 - 0.02, (deskH - topH) / 2, 0]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[pedestalW, deskH - topH, depthM * 0.92]} />
              <meshStandardMaterial color={mainColor} roughness={0.7} />
            </mesh>

            {/* Left Steel Frame Legs */}
            <mesh
              position={[-widthM / 2 + 0.06, (deskH - topH) / 2, 0]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[0.05, deskH - topH, depthM * 0.88]} />
              <meshStandardMaterial color={legColor} roughness={0.4} />
            </mesh>
          </group>
        );
      }

      case 'coffee-table': {
        const topH = 0.035;
        const tableH = 0.42;

        return (
          <group>
            {/* Stone / Wood Top */}
            <mesh position={[0, tableH - topH / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[widthM, topH, depthM]} />
              <meshStandardMaterial color={mainColor} roughness={0.6} />
            </mesh>

            {/* 4 Wooden Legs */}
            {[
              [-widthM / 2 + 0.08, -depthM / 2 + 0.08],
              [widthM / 2 - 0.08, -depthM / 2 + 0.08],
              [-widthM / 2 + 0.08, depthM / 2 - 0.08],
              [widthM / 2 - 0.08, depthM / 2 - 0.08],
            ].map(([lx, lz], idx) => (
              <mesh key={idx} position={[lx, (tableH - topH) / 2, lz]} castShadow receiveShadow>
                <boxGeometry args={[0.045, tableH - topH, 0.045]} />
                <meshStandardMaterial color={legColor} roughness={0.6} />
              </mesh>
            ))}
          </group>
        );
      }

      case 'chair': {
        const seatH = 0.45;
        const totalH = 0.82;

        return (
          <group>
            {/* Seat Cushion */}
            <mesh position={[0, seatH, 0]} castShadow receiveShadow>
              <boxGeometry args={[widthM, 0.05, depthM]} />
              <meshStandardMaterial color={cushionColor} roughness={0.7} />
            </mesh>

            {/* Backrest */}
            <mesh
              position={[0, seatH + (totalH - seatH) / 2, -depthM / 2 + 0.02]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[widthM * 0.9, totalH - seatH, 0.03]} />
              <meshStandardMaterial color={mainColor} roughness={0.7} />
            </mesh>

            {/* 4 Chair Legs */}
            {[
              [-widthM / 2 + 0.04, -depthM / 2 + 0.04],
              [widthM / 2 - 0.04, -depthM / 2 + 0.04],
              [-widthM / 2 + 0.04, depthM / 2 - 0.04],
              [widthM / 2 - 0.04, depthM / 2 - 0.04],
            ].map(([lx, lz], idx) => (
              <mesh key={idx} position={[lx, seatH / 2, lz]} castShadow>
                <boxGeometry args={[0.03, seatH, 0.03]} />
                <meshStandardMaterial color={legColor} roughness={0.5} />
              </mesh>
            ))}
          </group>
        );
      }

      case 'nightstand': {
        const bodyH = 0.44;

        return (
          <group>
            {/* Cabinet Body */}
            <mesh position={[0, 0.08 + bodyH / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[widthM, bodyH, depthM]} />
              <meshStandardMaterial color={mainColor} roughness={0.7} />
            </mesh>

            {/* Brass Knob */}
            <mesh position={[0, 0.08 + bodyH / 2, depthM / 2 + 0.015]} castShadow>
              <sphereGeometry args={[0.012, 12, 12]} />
              <meshStandardMaterial color="#222222" roughness={0.3} metalness={0.7} />
            </mesh>

            {/* 4 Small Legs */}
            {[
              [-widthM / 2 + 0.04, -depthM / 2 + 0.04],
              [widthM / 2 - 0.04, -depthM / 2 + 0.04],
              [-widthM / 2 + 0.04, depthM / 2 - 0.04],
              [widthM / 2 - 0.04, depthM / 2 - 0.04],
            ].map(([lx, lz], idx) => (
              <mesh key={idx} position={[lx, 0.04, lz]} castShadow>
                <boxGeometry args={[0.03, 0.08, 0.03]} />
                <meshStandardMaterial color={legColor} roughness={0.5} />
              </mesh>
            ))}
          </group>
        );
      }

      case 'wardrobe': {
        const plinthH = 0.08;

        return (
          <group>
            {/* Recessed Plinth Base */}
            <mesh position={[0, plinthH / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[widthM * 0.96, plinthH, depthM * 0.96]} />
              <meshStandardMaterial color="#2B2117" roughness={0.8} />
            </mesh>

            {/* Main Cabinet Body */}
            <mesh position={[0, plinthH + (heightM - plinthH) / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[widthM, heightM - plinthH, depthM]} />
              <meshStandardMaterial color={mainColor} roughness={0.7} />
            </mesh>

            {/* Vertical Door Divider Grooves & Handles */}
            <mesh
              position={[0, plinthH + (heightM - plinthH) / 2, depthM / 2 + 0.005]}
              receiveShadow
            >
              <boxGeometry args={[0.005, heightM - plinthH, 0.005]} />
              <meshStandardMaterial color="#222222" roughness={0.5} />
            </mesh>

            {/* Long Vertical Brass Handles */}
            <mesh
              position={[-0.04, heightM * 0.5, depthM / 2 + 0.02]}
              castShadow
            >
              <boxGeometry args={[0.012, 0.28, 0.015]} />
              <meshStandardMaterial color={handleColor} roughness={0.3} metalness={0.6} />
            </mesh>
            <mesh
              position={[0.04, heightM * 0.5, depthM / 2 + 0.02]}
              castShadow
            >
              <boxGeometry args={[0.012, 0.28, 0.015]} />
              <meshStandardMaterial color={handleColor} roughness={0.3} metalness={0.6} />
            </mesh>
          </group>
        );
      }

      case 'bookshelf': {
        const frameThick = 0.03;
        const numShelves = 4;
        const shelfSpacing = (heightM - frameThick * 2) / numShelves;

        return (
          <group>
            {/* Left Side */}
            <mesh position={[-widthM / 2 + frameThick / 2, heightM / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[frameThick, heightM, depthM]} />
              <meshStandardMaterial color={mainColor} roughness={0.7} />
            </mesh>

            {/* Right Side */}
            <mesh position={[widthM / 2 - frameThick / 2, heightM / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[frameThick, heightM, depthM]} />
              <meshStandardMaterial color={mainColor} roughness={0.7} />
            </mesh>

            {/* Back Board */}
            <mesh position={[0, heightM / 2, -depthM / 2 + 0.01]} castShadow receiveShadow>
              <boxGeometry args={[widthM, heightM, 0.015]} />
              <meshStandardMaterial color="#3D2A1C" roughness={0.8} />
            </mesh>

            {/* Shelves */}
            {Array.from({ length: numShelves + 1 }).map((_, idx) => (
              <mesh
                key={idx}
                position={[0, frameThick / 2 + idx * shelfSpacing, 0]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[widthM - frameThick * 2, frameThick, depthM]} />
                <meshStandardMaterial color={mainColor} roughness={0.7} />
              </mesh>
            ))}
          </group>
        );
      }

      case 'rug': {
        const border1W = widthM * 0.86;
        const border1D = depthM * 0.88;
        const border2W = widthM * 0.74;
        const border2D = depthM * 0.78;
        const medRadius = Math.min(widthM, depthM) * 0.22;

        return (
          <group position={[0, 0.003, 0]}>
            {/* Outer Deep Crimson Wool Field */}
            <mesh receiveShadow position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[widthM, depthM]} />
              <meshStandardMaterial color={mainColor || '#8B1E1E'} roughness={0.96} />
            </mesh>
            {/* Outer Navy Indigo Border Inlay */}
            <mesh receiveShadow position={[0, 0.0005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[border1W, border1D]} />
              <meshStandardMaterial color={def.accentColor || '#1B2A4A'} roughness={0.94} />
            </mesh>
            {/* Inner Crimson Center Field */}
            <mesh receiveShadow position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[border2W, border2D]} />
              <meshStandardMaterial color={mainColor || '#8B1E1E'} roughness={0.96} />
            </mesh>
            {/* Traditional Gold Central Mandala Ring */}
            <mesh receiveShadow position={[0, 0.0015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[medRadius * 0.65, medRadius, 24]} />
              <meshStandardMaterial color={def.subColor || '#D4A359'} roughness={0.8} />
            </mesh>
            {/* Central Diamond Lotus Motif */}
            <mesh receiveShadow position={[0, 0.002, 0]} rotation={[-Math.PI / 2, Math.PI / 4, 0]}>
              <planeGeometry args={[medRadius * 0.7, medRadius * 0.7]} />
              <meshStandardMaterial color={def.subColor || '#D4A359'} roughness={0.8} />
            </mesh>
            {/* Fringes at North & South edges */}
            {[-depthM / 2, depthM / 2].map((fz, idx) => (
              <mesh key={idx} receiveShadow position={[0, 0.0005, fz]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[widthM * 0.96, 0.04]} />
                <meshStandardMaterial color="#FAF6EE" roughness={0.95} />
              </mesh>
            ))}
          </group>
        );
      }

      case 'chest-drawers': {
        const bodyH = heightM - 0.08;
        return (
          <group>
            <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
              <boxGeometry args={[widthM * 0.96, 0.08, depthM * 0.96]} />
              <meshStandardMaterial color={legColor} roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.08 + bodyH / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[widthM, bodyH, depthM]} />
              <meshStandardMaterial color={mainColor} roughness={0.7} />
            </mesh>
            {[0.28, 0.56, 0.82].map((tierY, idx) => (
              <mesh key={idx} position={[0, tierY, depthM / 2 + 0.015]} castShadow>
                <boxGeometry args={[widthM * 0.35, 0.02, 0.02]} />
                <meshStandardMaterial color={handleColor} roughness={0.3} metalness={0.6} />
              </mesh>
            ))}
          </group>
        );
      }

      case 'table-round': {
        const radius = Math.min(widthM, depthM) / 2;
        const topH = 0.04;
        const tableH = 0.74;
        return (
          <group>
            <mesh position={[0, tableH - topH / 2, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[radius, radius, topH, 32]} />
              <meshStandardMaterial color={mainColor} roughness={0.65} />
            </mesh>
            <mesh position={[0, (tableH - topH) / 2, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.08, 0.16, tableH - topH, 16]} />
              <meshStandardMaterial color={legColor} roughness={0.5} />
            </mesh>
            <mesh position={[0, 0.015, 0]} receiveShadow>
              <cylinderGeometry args={[radius * 0.65, radius * 0.7, 0.03, 32]} />
              <meshStandardMaterial color={legColor} roughness={0.5} />
            </mesh>
          </group>
        );
      }

      case 'desk-chair': {
        const seatH = 0.48;
        return (
          <group>
            <mesh position={[0, 0.06, 0]} castShadow>
              <cylinderGeometry args={[0.28, 0.28, 0.03, 5]} />
              <meshStandardMaterial color={legColor} roughness={0.4} />
            </mesh>
            <mesh position={[0, seatH / 2, 0]} castShadow>
              <cylinderGeometry args={[0.03, 0.03, seatH - 0.06, 12]} />
              <meshStandardMaterial color="#666666" metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[0, seatH, 0]} castShadow receiveShadow>
              <boxGeometry args={[widthM * 0.75, 0.06, depthM * 0.75]} />
              <meshStandardMaterial color={cushionColor} roughness={0.8} />
            </mesh>
            <mesh position={[0, seatH + 0.25, -depthM * 0.32]} castShadow receiveShadow>
              <boxGeometry args={[widthM * 0.7, 0.45, 0.03]} />
              <meshStandardMaterial color={mainColor} roughness={0.7} />
            </mesh>
          </group>
        );
      }

      case 'kitchen-island': {
        return (
          <group>
            <mesh position={[0, 0.44, -depthM * 0.05]} castShadow receiveShadow>
              <boxGeometry args={[widthM * 0.94, 0.88, depthM * 0.78]} />
              <meshStandardMaterial color={def.subColor || '#4E5F55'} roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.90, 0]} castShadow receiveShadow>
              <boxGeometry args={[widthM, 0.05, depthM]} />
              <meshStandardMaterial color={mainColor} roughness={0.4} metalness={0.1} />
            </mesh>
          </group>
        );
      }

      case 'plant': {
        const potRadius = Math.min(widthM, depthM) * 0.28;
        const potH = 0.38;
        return (
          <group>
            <mesh position={[0, potH / 2, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[potRadius, potRadius * 0.8, potH, 20]} />
              <meshStandardMaterial color={def.subColor || '#D8CFBF'} roughness={0.7} />
            </mesh>
            <mesh position={[0, potH + 0.35, 0]} castShadow>
              <sphereGeometry args={[widthM * 0.42, 16, 16]} />
              <meshStandardMaterial color={mainColor} roughness={0.85} />
            </mesh>
            <mesh position={[0, potH + 0.55, 0]} castShadow>
              <sphereGeometry args={[widthM * 0.32, 14, 14]} />
              <meshStandardMaterial color="#4A6855" roughness={0.85} />
            </mesh>
          </group>
        );
      }

      case 'lamp': {
        const baseR = Math.min(widthM, depthM) * 0.35;
        return (
          <group>
            <mesh position={[0, 0.02, 0]} castShadow>
              <cylinderGeometry args={[baseR, baseR, 0.03, 24]} />
              <meshStandardMaterial color={mainColor} roughness={0.4} metalness={0.5} />
            </mesh>
            <mesh position={[0, heightM / 2, 0]} castShadow>
              <cylinderGeometry args={[0.015, 0.015, heightM, 12]} />
              <meshStandardMaterial color={mainColor} roughness={0.4} metalness={0.5} />
            </mesh>
            <mesh position={[0, heightM - 0.15, 0]} castShadow>
              <cylinderGeometry args={[baseR * 0.85, baseR * 1.1, 0.3, 24]} />
              <meshStandardMaterial color="#FAF6EE" roughness={0.9} />
            </mesh>
          </group>
        );
      }

      case 'side-table': {
        const radius = Math.min(widthM, depthM) / 2;
        return (
          <group>
            {/* Fluted Pedestal Column Base */}
            <mesh position={[0, (heightM - 0.03) / 2, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[radius * 0.45, radius * 0.65, heightM - 0.03, 24]} />
              <meshStandardMaterial color={legColor} roughness={0.6} />
            </mesh>
            {/* Travertine Stone Tabletop */}
            <mesh position={[0, heightM - 0.015, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[radius, radius, 0.03, 32]} />
              <meshStandardMaterial color={mainColor} roughness={0.5} />
            </mesh>
          </group>
        );
      }

      case 'ottoman': {
        return (
          <group>
            {/* Recessed Plinth Base */}
            <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
              <boxGeometry args={[widthM * 0.92, 0.08, depthM * 0.92]} />
              <meshStandardMaterial color={legColor} roughness={0.8} />
            </mesh>
            {/* Plush Tufted Cushion Body */}
            <mesh position={[0, 0.08 + (heightM - 0.08) / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[widthM, heightM - 0.08, depthM]} />
              <meshStandardMaterial color={cushionColor} roughness={0.85} />
            </mesh>
            {/* Surface Tufting Buttons */}
            {[-widthM * 0.25, widthM * 0.25].map((bx, idx) => (
              <mesh key={idx} position={[bx, heightM + 0.005, 0]}>
                <sphereGeometry args={[0.02, 12, 12]} />
                <meshStandardMaterial color={legColor} roughness={0.9} />
              </mesh>
            ))}
          </group>
        );
      }

      case 'bed-bunk': {
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

      case 'vanity-dresser': {
        const mirrorRadius = widthM * 0.32;
        const bodyH = 0.75;
        return (
          <group>
            {/* Vanity Cabinet Body */}
            <mesh position={[0, 0.15 + (bodyH - 0.15) / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[widthM, bodyH - 0.15, depthM]} />
              <meshStandardMaterial color={mainColor} roughness={0.7} />
            </mesh>
            {/* 4 Tapered Legs */}
            {[
              [-widthM / 2 + 0.08, -depthM / 2 + 0.08],
              [widthM / 2 - 0.08, -depthM / 2 + 0.08],
              [-widthM / 2 + 0.08, depthM / 2 - 0.08],
              [widthM / 2 - 0.08, depthM / 2 - 0.08],
            ].map(([lx, lz], idx) => (
              <mesh key={idx} position={[lx, 0.075, lz]} castShadow>
                <boxGeometry args={[0.035, 0.15, 0.035]} />
                <meshStandardMaterial color={legColor} roughness={0.5} />
              </mesh>
            ))}
            {/* Drawer Handles */}
            <mesh position={[-widthM * 0.22, bodyH - 0.12, depthM / 2 + 0.015]} castShadow>
              <boxGeometry args={[0.1, 0.02, 0.02]} />
              <meshStandardMaterial color={handleColor} roughness={0.3} metalness={0.8} />
            </mesh>
            <mesh position={[widthM * 0.22, bodyH - 0.12, depthM / 2 + 0.015]} castShadow>
              <boxGeometry args={[0.1, 0.02, 0.02]} />
              <meshStandardMaterial color={handleColor} roughness={0.3} metalness={0.8} />
            </mesh>
            {/* Mirror Frame Stems & Round Glass */}
            <mesh position={[0, bodyH + mirrorRadius * 0.95, -depthM / 2 + 0.04]} castShadow>
              <cylinderGeometry args={[mirrorRadius, mirrorRadius, 0.025, 32]} rotation={[Math.PI / 2, 0, 0]} />
              <meshStandardMaterial color={handleColor} roughness={0.4} metalness={0.6} />
            </mesh>
            <mesh position={[0, bodyH + mirrorRadius * 0.95, -depthM / 2 + 0.055]}>
              <cylinderGeometry args={[mirrorRadius * 0.92, mirrorRadius * 0.92, 0.01, 32]} rotation={[Math.PI / 2, 0, 0]} />
              <meshStandardMaterial color="#B0D3E2" roughness={0.05} metalness={0.9} />
            </mesh>
          </group>
        );
      }

      case 'bar-stool': {
        const seatR = Math.min(widthM, depthM) / 2;
        const seatH = 0.68;
        return (
          <group>
            {/* 4 Tall Slender Stool Legs */}
            {[
              [-seatR * 0.65, -seatR * 0.65],
              [seatR * 0.65, -seatR * 0.65],
              [-seatR * 0.65, seatR * 0.65],
              [seatR * 0.65, seatR * 0.65],
            ].map(([lx, lz], idx) => (
              <mesh key={idx} position={[lx, seatH / 2, lz]} castShadow>
                <cylinderGeometry args={[0.015, 0.02, seatH, 12]} />
                <meshStandardMaterial color={legColor} roughness={0.5} />
              </mesh>
            ))}
            {/* Circular Footrest Ring */}
            <mesh position={[0, 0.28, 0]} castShadow>
              <torusGeometry args={[seatR * 0.75, 0.015, 12, 24]} rotation={[Math.PI / 2, 0, 0]} />
              <meshStandardMaterial color={legColor} roughness={0.5} />
            </mesh>
            {/* Round Leather Seat Pad */}
            <mesh position={[0, seatH, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[seatR, seatR, 0.06, 24]} />
              <meshStandardMaterial color={cushionColor} roughness={0.7} />
            </mesh>
            {/* Low Curved Backrest Rim */}
            <mesh position={[0, seatH + 0.14, -seatR * 0.65]} castShadow>
              <boxGeometry args={[seatR * 1.2, 0.08, 0.025]} />
              <meshStandardMaterial color={mainColor} roughness={0.6} />
            </mesh>
          </group>
        );
      }

      case 'sideboard': {
        const bodyH = heightM - 0.16;
        return (
          <group>
            {/* 4 Brass Pin Legs */}
            {[
              [-widthM / 2 + 0.1, -depthM / 2 + 0.08],
              [widthM / 2 - 0.1, -depthM / 2 + 0.08],
              [-widthM / 2 + 0.1, depthM / 2 - 0.08],
              [widthM / 2 - 0.1, depthM / 2 - 0.08],
            ].map(([lx, lz], idx) => (
              <mesh key={idx} position={[lx, 0.08, lz]} castShadow>
                <cylinderGeometry args={[0.015, 0.02, 0.16, 12]} />
                <meshStandardMaterial color={legColor} roughness={0.4} metalness={0.6} />
              </mesh>
            ))}
            {/* Buffet Cabinet Body */}
            <mesh position={[0, 0.16 + bodyH / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[widthM, bodyH, depthM]} />
              <meshStandardMaterial color={mainColor} roughness={0.7} />
            </mesh>
            {/* Vertical Door Divider Grooves & Brass Pulls */}
            {[-widthM * 0.28, 0, widthM * 0.28].map((hx, idx) => (
              <mesh key={idx} position={[hx, 0.16 + bodyH * 0.55, depthM / 2 + 0.015]} castShadow>
                <boxGeometry args={[0.02, 0.15, 0.02]} />
                <meshStandardMaterial color={handleColor} roughness={0.3} metalness={0.8} />
              </mesh>
            ))}
          </group>
        );
      }

      case 'kitchen-counter': {
        const topThick = 0.04;
        const bodyH = heightM - topThick;
        return (
          <group>
            {/* Base Cabinet Plinth & Body */}
            <mesh position={[0, bodyH / 2, -0.02]} castShadow receiveShadow>
              <boxGeometry args={[widthM, bodyH, depthM - 0.04]} />
              <meshStandardMaterial color={def.subColor || '#38423B'} roughness={0.8} />
            </mesh>
            {/* Quartz Countertop Slab */}
            <mesh position={[0, heightM - topThick / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[widthM, topThick, depthM]} />
              <meshStandardMaterial color={mainColor} roughness={0.4} />
            </mesh>
            {/* Inset Stainless Double Basin Sink */}
            <mesh position={[-widthM * 0.22, heightM + 0.005, 0]} castShadow>
              <boxGeometry args={[widthM * 0.44, 0.015, depthM * 0.65]} />
              <meshStandardMaterial color="#9AA3AA" roughness={0.3} metalness={0.8} />
            </mesh>
            <mesh position={[-widthM * 0.32, heightM + 0.006, 0]}>
              <boxGeometry args={[widthM * 0.18, 0.016, depthM * 0.55]} />
              <meshStandardMaterial color="#6E767C" roughness={0.3} metalness={0.8} />
            </mesh>
            <mesh position={[-widthM * 0.12, heightM + 0.006, 0]}>
              <boxGeometry args={[widthM * 0.18, 0.016, depthM * 0.55]} />
              <meshStandardMaterial color="#6E767C" roughness={0.3} metalness={0.8} />
            </mesh>
            {/* Gooseneck Chrome Faucet */}
            <mesh position={[-widthM * 0.22, heightM + 0.14, -depthM * 0.24]} castShadow>
              <cylinderGeometry args={[0.015, 0.015, 0.28, 12]} />
              <meshStandardMaterial color="#CCCCCC" metalness={0.9} roughness={0.15} />
            </mesh>
          </group>
        );
      }

      case 'kitchen-stove': {
        return (
          <group>
            {/* Stainless Oven Body */}
            <mesh position={[0, heightM / 2 - 0.03, 0]} castShadow receiveShadow>
              <boxGeometry args={[widthM, heightM - 0.06, depthM]} />
              <meshStandardMaterial color={def.subColor || '#52575C'} roughness={0.5} metalness={0.6} />
            </mesh>
            {/* Black Oven Glass Door Front */}
            <mesh position={[0, heightM * 0.42, depthM / 2 + 0.005]}>
              <boxGeometry args={[widthM * 0.82, heightM * 0.55, 0.01]} />
              <meshStandardMaterial color="#111111" roughness={0.1} />
            </mesh>
            {/* Oven Handle */}
            <mesh position={[0, heightM * 0.68, depthM / 2 + 0.03]} castShadow>
              <boxGeometry args={[widthM * 0.7, 0.02, 0.03]} />
              <meshStandardMaterial color="#E0E0E0" metalness={0.8} roughness={0.2} />
            </mesh>
            {/* Cooktop Surface Grate Plate */}
            <mesh position={[0, heightM - 0.015, 0]} castShadow>
              <boxGeometry args={[widthM, 0.03, depthM]} />
              <meshStandardMaterial color="#1C1C1C" roughness={0.8} />
            </mesh>
            {/* 4 Cast-iron Burners */}
            {[
              [-widthM * 0.26, -depthM * 0.24],
              [widthM * 0.26, -depthM * 0.24],
              [-widthM * 0.26, depthM * 0.24],
              [widthM * 0.26, depthM * 0.24],
            ].map(([bx, bz], idx) => (
              <mesh key={idx} position={[bx, heightM + 0.01, bz]} castShadow>
                <cylinderGeometry args={[0.075, 0.085, 0.02, 16]} />
                <meshStandardMaterial color="#111111" roughness={0.9} />
              </mesh>
            ))}
          </group>
        );
      }

      case 'kitchen-fridge': {
        return (
          <group>
            {/* Stainless Fridge Cabinet */}
            <mesh position={[0, heightM / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[widthM, heightM, depthM]} />
              <meshStandardMaterial color={mainColor} roughness={0.4} metalness={0.5} />
            </mesh>
            {/* French Door Seam */}
            <mesh position={[0, heightM * 0.62, depthM / 2 + 0.005]}>
              <boxGeometry args={[0.008, heightM * 0.68, 0.01]} />
              <meshStandardMaterial color="#222222" />
            </mesh>
            {/* Lower Freezer Drawer Seam */}
            <mesh position={[0, heightM * 0.28, depthM / 2 + 0.005]}>
              <boxGeometry args={[widthM * 0.94, 0.008, 0.01]} />
              <meshStandardMaterial color="#222222" />
            </mesh>
            {/* Handles */}
            <mesh position={[-0.04, heightM * 0.6, depthM / 2 + 0.025]} castShadow>
              <cylinderGeometry args={[0.012, 0.012, 0.65, 12]} />
              <meshStandardMaterial color="#222222" roughness={0.3} metalness={0.8} />
            </mesh>
            <mesh position={[0.04, heightM * 0.6, depthM / 2 + 0.025]} castShadow>
              <cylinderGeometry args={[0.012, 0.012, 0.65, 12]} />
              <meshStandardMaterial color="#222222" roughness={0.3} metalness={0.8} />
            </mesh>
            <mesh position={[0, heightM * 0.25, depthM / 2 + 0.025]} castShadow>
              <boxGeometry args={[widthM * 0.6, 0.02, 0.03]} />
              <meshStandardMaterial color="#222222" roughness={0.3} metalness={0.8} />
            </mesh>
          </group>
        );
      }

      case 'dining-nook': {
        const benchH = 0.45;
        const seatD = 0.42;
        return (
          <group>
            {/* L-Bench Plinth Base & Cushion */}
            <mesh position={[0, benchH / 2, -depthM / 2 + seatD / 2]} castShadow receiveShadow>
              <boxGeometry args={[widthM, benchH, seatD]} />
              <meshStandardMaterial color={cushionColor} roughness={0.85} />
            </mesh>
            <mesh position={[-widthM / 2 + seatD / 2, benchH / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[seatD, benchH, depthM]} />
              <meshStandardMaterial color={cushionColor} roughness={0.85} />
            </mesh>
            {/* Backrest along walls */}
            <mesh position={[0, benchH + 0.2, -depthM / 2 + 0.04]} castShadow>
              <boxGeometry args={[widthM, 0.38, 0.08]} />
              <meshStandardMaterial color={mainColor} roughness={0.7} />
            </mesh>
            <mesh position={[-widthM / 2 + 0.04, benchH + 0.2, 0]} castShadow>
              <boxGeometry args={[0.08, 0.38, depthM]} />
              <meshStandardMaterial color={mainColor} roughness={0.7} />
            </mesh>
          </group>
        );
      }

      case 'pantry-cabinet': {
        return (
          <group>
            {/* Tall Cabinet Body */}
            <mesh position={[0, heightM / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[widthM, heightM, depthM]} />
              <meshStandardMaterial color={mainColor} roughness={0.75} />
            </mesh>
            {/* Center Door Division */}
            <mesh position={[0, heightM / 2, depthM / 2 + 0.005]}>
              <boxGeometry args={[0.008, heightM * 0.94, 0.01]} />
              <meshStandardMaterial color="#1C1C1C" />
            </mesh>
            {/* Long Brass Bar Handles */}
            <mesh position={[-0.04, heightM * 0.5, depthM / 2 + 0.025]} castShadow>
              <cylinderGeometry args={[0.01, 0.01, 0.35, 12]} />
              <meshStandardMaterial color={handleColor} roughness={0.3} metalness={0.8} />
            </mesh>
            <mesh position={[0.04, heightM * 0.5, depthM / 2 + 0.025]} castShadow>
              <cylinderGeometry args={[0.01, 0.01, 0.35, 12]} />
              <meshStandardMaterial color={handleColor} roughness={0.3} metalness={0.8} />
            </mesh>
          </group>
        );
      }

      case 'rug-runner': {
        return (
          <group position={[0, 0.003, 0]}>
            <mesh receiveShadow position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[widthM, depthM]} />
              <meshStandardMaterial color={mainColor || '#1E2D42'} roughness={0.96} />
            </mesh>
            <mesh receiveShadow position={[0, 0.0005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[widthM * 0.82, depthM * 0.94]} />
              <meshStandardMaterial color={def.subColor || '#C49746'} roughness={0.8} />
            </mesh>
            <mesh receiveShadow position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[widthM * 0.72, depthM * 0.92]} />
              <meshStandardMaterial color={mainColor || '#1E2D42'} roughness={0.96} />
            </mesh>
            {/* 3 Diamond Motifs */}
            {[-depthM * 0.3, 0, depthM * 0.3].map((dz, idx) => (
              <mesh key={idx} receiveShadow position={[0, 0.0015, dz]} rotation={[-Math.PI / 2, Math.PI / 4, 0]}>
                <planeGeometry args={[widthM * 0.35, widthM * 0.35]} />
                <meshStandardMaterial color={def.subColor || '#C49746'} roughness={0.8} />
              </mesh>
            ))}
            {/* End Fringes */}
            {[-depthM / 2, depthM / 2].map((fz, idx) => (
              <mesh key={idx} receiveShadow position={[0, 0.0005, fz]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[widthM * 0.94, 0.03]} />
                <meshStandardMaterial color="#FAF6EE" roughness={0.95} />
              </mesh>
            ))}
          </group>
        );
      }

      case 'wall-mirror': {
        const frameThick = 0.04;
        return (
          <group rotation={[0.08, 0, 0]}>
            {/* Leaning Mirror Frame */}
            <mesh position={[0, heightM / 2, 0]} castShadow>
              <boxGeometry args={[widthM, heightM, frameThick]} />
              <meshStandardMaterial color={mainColor} roughness={0.6} />
            </mesh>
            {/* High-Reflective Silver Mirror Glass */}
            <mesh position={[0, heightM / 2, frameThick / 2 + 0.002]}>
              <planeGeometry args={[widthM - 0.1, heightM - 0.12]} />
              <meshStandardMaterial color="#B0D3E2" roughness={0.05} metalness={0.95} />
            </mesh>
            {/* Rear Easel Stand */}
            <mesh position={[0, heightM * 0.45, -0.15]} rotation={[-0.22, 0, 0]}>
              <boxGeometry args={[widthM * 0.4, heightM * 0.85, 0.02]} />
              <meshStandardMaterial color={legColor} roughness={0.6} />
            </mesh>
          </group>
        );
      }

      case 'credenza': {
        return (
          <group>
            {/* Credenza Cabinet Body */}
            <mesh position={[0, 0.12 + (heightM - 0.12) / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[widthM, heightM - 0.12, depthM]} />
              <meshStandardMaterial color={mainColor} roughness={0.7} />
            </mesh>

            {/* 4 Angled Small Legs */}
            {[
              [-widthM / 2 + 0.1, -depthM / 2 + 0.08],
              [widthM / 2 - 0.1, -depthM / 2 + 0.08],
              [-widthM / 2 + 0.1, depthM / 2 - 0.08],
              [widthM / 2 - 0.1, depthM / 2 - 0.08],
            ].map(([lx, lz], idx) => (
              <mesh key={idx} position={[lx, 0.06, lz]} castShadow>
                <boxGeometry args={[0.035, 0.12, 0.035]} />
                <meshStandardMaterial color={legColor} roughness={0.5} />
              </mesh>
            ))}
          </group>
        );
      }

      default: {
        return (
          <mesh position={[0, heightM / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[widthM, heightM, depthM]} />
            <meshStandardMaterial color={mainColor} roughness={0.7} />
          </mesh>
        );
      }
    }
  };

  return (
    <group position={[posX, 0, posZ]} rotation={[0, rotY, 0]}>
      {render3DModel()}

      {/* Subtle floor-level selection halo in 3D (no wireframe box) */}
      {isSelected && (
        <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[widthM + 0.08, depthM + 0.08]} />
          <meshBasicMaterial color="#4A5D52" transparent opacity={0.25} />
        </mesh>
      )}
    </group>
  );
}

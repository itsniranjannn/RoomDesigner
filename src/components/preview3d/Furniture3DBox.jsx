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
  const subColor = def.subColor || '#D4A359';

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
            {/* Drawer Brass Handle */}
            <mesh
              position={[widthM / 2 - pedestalW / 2 - 0.02, deskH * 0.55, depthM * 0.46 + 0.01]}
              castShadow
            >
              <boxGeometry args={[0.1, 0.016, 0.02]} />
              <meshStandardMaterial color="#C49746" metalness={0.8} roughness={0.25} />
            </mesh>

            {/* Left Hollow Architectural Steel Sled Loop Frame (Front leg, back leg, floor runner, top rail) */}
            <group position={[-widthM / 2 + 0.06, 0, 0]}>
              {/* Front Leg */}
              <mesh position={[0, (deskH - topH) / 2, depthM * 0.42]} castShadow>
                <boxGeometry args={[0.035, deskH - topH, 0.035]} />
                <meshStandardMaterial color={legColor} roughness={0.4} metalness={0.6} />
              </mesh>
              {/* Back Leg */}
              <mesh position={[0, (deskH - topH) / 2, -depthM * 0.42]} castShadow>
                <boxGeometry args={[0.035, deskH - topH, 0.035]} />
                <meshStandardMaterial color={legColor} roughness={0.4} metalness={0.6} />
              </mesh>
              {/* Floor Runner */}
              <mesh position={[0, 0.018, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.035, 0.035, depthM * 0.86]} />
                <meshStandardMaterial color={legColor} roughness={0.4} metalness={0.6} />
              </mesh>
            </group>
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
        const legThick = 0.032;

        return (
          <group>
            {/* Cane / Leather Woven Seat Cushion */}
            <mesh position={[0, seatH, 0]} castShadow receiveShadow>
              <boxGeometry args={[widthM, 0.045, depthM]} />
              <meshStandardMaterial color={cushionColor} roughness={0.7} />
            </mesh>

            {/* Solid Timber Backrest Top Rail */}
            <mesh
              position={[0, seatH + (totalH - seatH) * 0.75, -depthM / 2 + 0.02]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[widthM * 0.92, (totalH - seatH) * 0.45, 0.025]} />
              <meshStandardMaterial color={mainColor} roughness={0.65} />
            </mesh>

            {/* Vertical Backrest Support Spindles connecting seat to back rail */}
            {[-widthM * 0.32, -widthM * 0.16, 0, widthM * 0.16, widthM * 0.32].map((sx, idx) => (
              <mesh
                key={idx}
                position={[sx, seatH + (totalH - seatH) * 0.4, -depthM / 2 + 0.02]}
                castShadow
              >
                <cylinderGeometry args={[0.008, 0.008, (totalH - seatH) * 0.75, 10]} />
                <meshStandardMaterial color={mainColor} roughness={0.65} />
              </mesh>
            ))}

            {/* 4 Solid Grounded Chair Legs */}
            {[
              [-widthM / 2 + 0.045, -depthM / 2 + 0.045],
              [widthM / 2 - 0.045, -depthM / 2 + 0.045],
              [-widthM / 2 + 0.045, depthM / 2 - 0.045],
              [widthM / 2 - 0.045, depthM / 2 - 0.045],
            ].map(([lx, lz], idx) => (
              <mesh key={idx} position={[lx, (seatH - 0.022) / 2, lz]} castShadow>
                <cylinderGeometry args={[legThick * 0.45, legThick * 0.55, seatH - 0.022, 12]} />
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
        const numDoors = widthM > 1.4 ? 3 : 2;
        const doorW = widthM / numDoors;

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

            {/* Vertical Door Divider Grooves */}
            {Array.from({ length: numDoors - 1 }).map((_, idx) => {
              const gx = -widthM / 2 + (idx + 1) * doorW;
              return (
                <mesh
                  key={`groove-${idx}`}
                  position={[gx, plinthH + (heightM - plinthH) / 2, depthM / 2 + 0.005]}
                  receiveShadow
                >
                  <boxGeometry args={[0.006, heightM - plinthH, 0.005]} />
                  <meshStandardMaterial color="#1C1A17" roughness={0.5} />
                </mesh>
              );
            })}

            {/* Vertical Architectural Brass Handles for each door panel */}
            {Array.from({ length: numDoors }).map((_, idx) => {
              const hx = -widthM / 2 + idx * doorW + doorW / 2;
              return (
                <mesh
                  key={`handle-${idx}`}
                  position={[hx, heightM * 0.5, depthM / 2 + 0.02]}
                  castShadow
                >
                  <boxGeometry args={[0.012, 0.32, 0.018]} />
                  <meshStandardMaterial color={handleColor} roughness={0.3} metalness={0.75} />
                </mesh>
              );
            })}
          </group>
        );
      }

      case 'bookshelf': {
        const frameThick = 0.03;
        const numShelves = 4;
        const shelfSpacing = (heightM - frameThick * 2) / numShelves;
        const shelfW = widthM - frameThick * 2;

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
                <boxGeometry args={[shelfW, frameThick, depthM]} />
                <meshStandardMaterial color={mainColor} roughness={0.7} />
              </mesh>
            ))}

            {/* Shelf 1 Books: Terracotta & Olive Cloth Volumes */}
            <mesh position={[-shelfW * 0.22, frameThick + 0.11, 0.02]} castShadow>
              <boxGeometry args={[0.22, 0.22, depthM * 0.7]} />
              <meshStandardMaterial color="#8B2635" roughness={0.8} />
            </mesh>
            <mesh position={[-shelfW * 0.05, frameThick + 0.1, 0.02]} castShadow>
              <boxGeometry args={[0.1, 0.2, depthM * 0.68]} />
              <meshStandardMaterial color="#22485E" roughness={0.8} />
            </mesh>

            {/* Shelf 2 Books: Brass Bookends & Warm Lokta Spines */}
            <mesh position={[shelfW * 0.15, frameThick + shelfSpacing + 0.12, 0.02]} castShadow>
              <boxGeometry args={[0.28, 0.24, depthM * 0.72]} />
              <meshStandardMaterial color="#C49746" roughness={0.5} />
            </mesh>
            <mesh position={[shelfW * 0.32, frameThick + shelfSpacing + 0.08, 0.02]} castShadow>
              <boxGeometry args={[0.04, 0.16, depthM * 0.6]} />
              <meshStandardMaterial color="#1A1615" roughness={0.4} metalness={0.6} />
            </mesh>

            {/* Shelf 3: Ceramic Sculptural Vessel & Stacked Folios */}
            <mesh position={[-shelfW * 0.25, frameThick + shelfSpacing * 2 + 0.09, 0]} castShadow>
              <cylinderGeometry args={[0.07, 0.05, 0.18, 16]} />
              <meshStandardMaterial color="#ECE5D8" roughness={0.6} />
            </mesh>
            <mesh position={[0.05, frameThick + shelfSpacing * 2 + 0.04, 0.02]} castShadow>
              <boxGeometry args={[0.24, 0.08, depthM * 0.75]} />
              <meshStandardMaterial color="#4A5D52" roughness={0.85} />
            </mesh>
          </group>
        );
      }

      case 'rug': {
        const rugThick = 0.012;
        const b1W = widthM * 0.86;
        const b1D = depthM * 0.88;
        const b2W = widthM * 0.74;
        const b2D = depthM * 0.78;
        const medRadius = Math.min(widthM, depthM) * 0.22;
        const subCol = def.subColor || '#D4A359';
        const accCol = def.accentColor || '#1B2A4A';
        const mainCol = mainColor || '#8B1E1E';
        return (
          <group position={[0, rugThick / 2, 0]}>
            {/* Main crimson base */}
            <mesh receiveShadow>
              <boxGeometry args={[widthM, rugThick, depthM]} />
              <meshStandardMaterial color={mainCol} roughness={0.96} />
            </mesh>
            {/* Navy border band */}
            <mesh receiveShadow position={[0, 0.0006, 0]}>
              <boxGeometry args={[b1W, rugThick + 0.0012, b1D]} />
              <meshStandardMaterial color={accCol} roughness={0.94} />
            </mesh>
            {/* Inner crimson field */}
            <mesh receiveShadow position={[0, 0.0012, 0]}>
              <boxGeometry args={[b2W, rugThick + 0.0024, b2D]} />
              <meshStandardMaterial color={mainCol} roughness={0.96} />
            </mesh>
            {/* 4 corner gold diamonds - rotationOrder="ZXY" ensures plane lies completely flat on floor before 45-deg diamond spin */}
            {[
              [-b2W / 2 + 0.18, -b2D / 2 + 0.18],
              [b2W / 2 - 0.18, -b2D / 2 + 0.18],
              [-b2W / 2 + 0.18, b2D / 2 - 0.18],
              [b2W / 2 - 0.18, b2D / 2 - 0.18],
            ].map(([cx, cz], idx) => (
              <mesh
                key={`rug-cor-${idx}`}
                receiveShadow
                position={[cx, rugThick / 2 + 0.003, cz]}
                rotation={[-Math.PI / 2, 0, Math.PI / 4]}
                rotationOrder="ZXY"
              >
                <planeGeometry args={[0.16, 0.16]} />
                <meshStandardMaterial color={subCol} roughness={0.8} />
              </mesh>
            ))}
            {/* Central navy medallion disc */}
            <mesh receiveShadow position={[0, rugThick / 2 + 0.0032, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[medRadius, 32]} />
              <meshStandardMaterial color={accCol} roughness={0.92} />
            </mesh>
            {/* Gold mandala ring */}
            <mesh receiveShadow position={[0, rugThick / 2 + 0.0036, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[medRadius * 0.72, medRadius * 0.92, 32]} />
              <meshStandardMaterial color={subCol} roughness={0.8} />
            </mesh>
            {/* Gold diamond lotus motif - rotationOrder="ZXY" keeps diamond perfectly flat on medallion */}
            <mesh
              receiveShadow
              position={[0, rugThick / 2 + 0.004, 0]}
              rotation={[-Math.PI / 2, 0, Math.PI / 4]}
              rotationOrder="ZXY"
            >
              <planeGeometry args={[medRadius * 0.65, medRadius * 0.65]} />
              <meshStandardMaterial color={subCol} roughness={0.8} />
            </mesh>
            {/* Center crimson core */}
            <mesh receiveShadow position={[0, rugThick / 2 + 0.0044, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[medRadius * 0.22, 24]} />
              <meshStandardMaterial color={mainCol} roughness={0.9} />
            </mesh>
            {/* Fringes north & south - nested flush within rug depth */}
            {[-depthM / 2 + 0.015, depthM / 2 - 0.015].map((fz, idx) => (
              <mesh key={`rug-fr-${idx}`} receiveShadow position={[0, 0.001, fz]}>
                <boxGeometry args={[widthM * 0.96, 0.004, 0.03]} />
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

      case 'lamp': {
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
            {/* Dual Brass Mirror Mounting Support Uprights from dresser top */}
            <mesh position={[-mirrorRadius * 0.55, bodyH + mirrorRadius * 0.55, -depthM / 2 + 0.04]} castShadow>
              <cylinderGeometry args={[0.012, 0.014, mirrorRadius * 1.1, 12]} />
              <meshStandardMaterial color={handleColor} metalness={0.85} roughness={0.25} />
            </mesh>
            <mesh position={[mirrorRadius * 0.55, bodyH + mirrorRadius * 0.55, -depthM / 2 + 0.04]} castShadow>
              <cylinderGeometry args={[0.012, 0.014, mirrorRadius * 1.1, 12]} />
              <meshStandardMaterial color={handleColor} metalness={0.85} roughness={0.25} />
            </mesh>

            {/* Circular Mirror Outer Brass Frame Bezel (standing upright vertically) */}
            <mesh position={[0, bodyH + mirrorRadius * 0.95, -depthM / 2 + 0.04]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[mirrorRadius, mirrorRadius, 0.024, 32]} />
              <meshStandardMaterial color={handleColor} roughness={0.35} metalness={0.8} />
            </mesh>
            {/* Luminous Silver-Ice Mirror Glass facing +Z into room */}
            <mesh position={[0, bodyH + mirrorRadius * 0.95, -depthM / 2 + 0.053]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[mirrorRadius * 0.93, mirrorRadius * 0.93, 0.006, 32]} />
              <meshStandardMaterial color="#E8F4F8" roughness={0.15} metalness={0.1} />
            </mesh>
            {/* Mirror Specular Diagonal Reflection Strip */}
            <mesh position={[-mirrorRadius * 0.15, bodyH + mirrorRadius * 1.05, -depthM / 2 + 0.058]} rotation={[0, 0, -0.45]}>
              <planeGeometry args={[mirrorRadius * 0.9, 0.03]} />
              <meshBasicMaterial color="#FFFFFF" transparent opacity={0.85} />
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
        const runnerThick = 0.012; // 1.2cm plush runner pile
        const b1W = widthM * 0.82;
        const b1D = depthM * 0.94;
        const b2W = widthM * 0.72;
        const b2D = depthM * 0.92;
        const subCol = def.subColor || '#C49746';
        const accCol = def.accentColor || '#8A2020';
        const mainCol = mainColor || '#1E2D42';

        return (
          <group position={[0, runnerThick / 2, 0]}>
            {/* Main Outer Indigo Blue Wool Pile */}
            <mesh receiveShadow position={[0, 0, 0]}>
              <boxGeometry args={[widthM, runnerThick, depthM]} />
              <meshStandardMaterial color={mainCol} roughness={0.96} />
            </mesh>
            {/* Outer Gold Border Ribbon */}
            <mesh receiveShadow position={[0, 0.0004, 0]}>
              <boxGeometry args={[b1W, runnerThick + 0.0008, b1D]} />
              <meshStandardMaterial color={subCol} roughness={0.8} />
            </mesh>
            {/* Inner Indigo Runner Field */}
            <mesh receiveShadow position={[0, 0.0008, 0]}>
              <boxGeometry args={[b2W, runnerThick + 0.0016, b2D]} />
              <meshStandardMaterial color={mainCol} roughness={0.96} />
            </mesh>
            {/* Repeating Center Diamond Medallions along runner */}
            {[-depthM * 0.35, -depthM * 0.12, depthM * 0.12, depthM * 0.35].map((dz, idx) => (
              <group key={`run-d-${idx}`} position={[0, runnerThick / 2 + 0.003, dz]}>
                {/* Gold Diamond Outer - rotationOrder="ZXY" ensures plane lies completely flat on floor before 45-deg diamond spin */}
                <mesh receiveShadow rotation={[-Math.PI / 2, 0, Math.PI / 4]} rotationOrder="ZXY">
                  <planeGeometry args={[widthM * 0.38, widthM * 0.38]} />
                  <meshStandardMaterial color={subCol} roughness={0.8} />
                </mesh>
                {/* Ruby Crimson Inner Diamond */}
                <mesh receiveShadow position={[0, 0.0006, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 4]} rotationOrder="ZXY">
                  <planeGeometry args={[widthM * 0.26, widthM * 0.26]} />
                  <meshStandardMaterial color={accCol} roughness={0.85} />
                </mesh>
                {/* Center Lokta White Bead */}
                <mesh receiveShadow position={[0, 0.0012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.02, 0.02, 0.002, 16]} />
                  <meshStandardMaterial color="#FAF6EE" roughness={0.9} />
                </mesh>
              </group>
            ))}
            {/* End Fringes at North & South - contained within runner footprint */}
            {[-depthM / 2 + 0.015, depthM / 2 - 0.015].map((fz, idx) => (
              <mesh key={`run-fr-${idx}`} receiveShadow position={[0, 0.001, fz]}>
                <boxGeometry args={[widthM * 0.94, 0.004, 0.025]} />
                <meshStandardMaterial color="#FAF6EE" roughness={0.95} />
              </mesh>
            ))}
          </group>
        );
      }

      case 'wall-mirror': {
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

      // ==========================================
      // NEPALI HOUSEHOLD PIECES
      // ==========================================
      case 'nepali-dhaka-rug': {
        const tile = 0.28;
        const cols = Math.max(4, Math.floor(widthM / tile));
        const rows = Math.max(4, Math.floor(depthM / tile));
        return (
          <group>
            <mesh position={[0, heightM / 2, 0]} receiveShadow>
              <boxGeometry args={[widthM, heightM, depthM]} />
              <meshStandardMaterial color={mainColor} roughness={0.95} />
            </mesh>
            {Array.from({ length: cols * rows }).map((_, i) => (
              <mesh key={i} position={[(i % cols + 0.5) * widthM / cols - widthM / 2, heightM + 0.002, (Math.floor(i / cols) + 0.5) * depthM / rows - depthM / 2]} rotation={[-Math.PI / 2, 0, Math.PI / 4]} receiveShadow>
                <planeGeometry args={[0.12, 0.12]} />
                <meshStandardMaterial color={i % 2 ? accentColor : subColor} roughness={0.9} />
              </mesh>
            ))}
          </group>
        );
      }

      case 'nepali-chowki': {
        return (
          <group>
            <mesh position={[0, heightM - 0.05, 0]} castShadow receiveShadow><boxGeometry args={[widthM, 0.1, depthM]} /><meshStandardMaterial color={mainColor} roughness={0.65} /></mesh>
            {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => <mesh key={i} position={[x * (widthM / 2 - 0.07), (heightM - 0.1) / 2, z * (depthM / 2 - 0.07)]} castShadow><boxGeometry args={[0.07, heightM - 0.1, 0.07]} /><meshStandardMaterial color={mainColor} roughness={0.7} /></mesh>)}
            <mesh position={[0, heightM + 0.003, 0]} receiveShadow><boxGeometry args={[widthM * 0.72, 0.015, depthM * 0.58]} /><meshStandardMaterial color={accentColor} roughness={0.55} /></mesh>
          </group>
        );
      }

      case 'nepali-patuka-chest': {
        return (
          <group>
            <mesh position={[0, heightM / 2, 0]} castShadow receiveShadow><boxGeometry args={[widthM, heightM, depthM]} /><meshStandardMaterial color={mainColor} roughness={0.7} /></mesh>
            <mesh position={[0, heightM + 0.012, 0]} castShadow><boxGeometry args={[widthM * 1.02, 0.04, depthM * 1.02]} /><meshStandardMaterial color={subColor} roughness={0.65} /></mesh>
            <mesh position={[0, heightM * 0.55, depthM / 2 + 0.006]} castShadow><boxGeometry args={[0.025, heightM * 0.5, 0.01]} /><meshStandardMaterial color={accentColor} metalness={0.6} roughness={0.35} /></mesh>
            <mesh position={[0, heightM * 0.53, depthM / 2 + 0.012]} castShadow><sphereGeometry args={[0.035, 12, 8]} /><meshStandardMaterial color={accentColor} metalness={0.65} roughness={0.3} /></mesh>
          </group>
        );
      }

      case 'nepali-brass-diya': {
        return (
          <group>
            <mesh position={[0, 0.035, 0]} castShadow><cylinderGeometry args={[widthM * 0.42, widthM * 0.5, 0.07, 24]} /><meshStandardMaterial color={mainColor} metalness={0.8} roughness={0.28} /></mesh>
            <mesh position={[0, 0.1, 0]} castShadow><cylinderGeometry args={[widthM * 0.12, widthM * 0.18, heightM * 0.45, 16]} /><meshStandardMaterial color={mainColor} metalness={0.8} roughness={0.28} /></mesh>
            <mesh position={[0, heightM * 0.35, 0]} castShadow><sphereGeometry args={[widthM * 0.2, 16, 8]} /><meshStandardMaterial color={mainColor} metalness={0.85} roughness={0.25} /></mesh>
            <mesh position={[0.02, heightM * 0.62, 0]} castShadow><coneGeometry args={[0.05, 0.12, 12]} /><meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.4} /></mesh>
          </group>
        );
      }

      case 'tv': {
        return (
          <group>
            <mesh position={[0, heightM * 0.41, 0]} castShadow receiveShadow><boxGeometry args={[widthM, heightM * 0.82, 0.06]} /><meshStandardMaterial color={mainColor} roughness={0.3} /></mesh>
            <mesh position={[0, heightM * 0.41, 0.035]}><boxGeometry args={[widthM * 0.92, heightM * 0.7, 0.008]} /><meshStandardMaterial color="#243A4C" roughness={0.2} metalness={0.1} /></mesh>
            <mesh position={[0, 0.02, 0]} castShadow><boxGeometry args={[widthM * 0.28, 0.04, 0.16]} /><meshStandardMaterial color={mainColor} roughness={0.4} /></mesh>
          </group>
        );
      }
      case 'nepali-pirka': {
        // Traditional low Sal wood stool with carved plank top & twin angled cleats
        const plankH = 0.035;
        const cleatH = heightM - plankH;
        return (
          <group>
            {/* Top Solid Plank */}
            <mesh position={[0, heightM - plankH / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[widthM, plankH, depthM]} />
              <meshStandardMaterial color={mainColor} roughness={0.65} />
            </mesh>
            {/* Left Cleat Runner */}
            <mesh position={[-widthM / 2 + 0.06, cleatH / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.04, cleatH, depthM - 0.04]} />
              <meshStandardMaterial color="#422517" roughness={0.7} />
            </mesh>
            {/* Right Cleat Runner */}
            <mesh position={[widthM / 2 - 0.06, cleatH / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.04, cleatH, depthM - 0.04]} />
              <meshStandardMaterial color="#422517" roughness={0.7} />
            </mesh>
          </group>
        );
      }

      case 'nepali-charpai': {
        // Handwoven Khat / Charpai daybed with turned wooden corner posts & woven rope webbing
        const legR = 0.04;
        const legH = heightM;
        const frameThick = 0.06;
        const webH = heightM - 0.04;
        return (
          <group>
            {/* 4 Turned Corner Timber Legs */}
            {[
              [-widthM / 2 + legR, -depthM / 2 + legR],
              [widthM / 2 - legR, -depthM / 2 + legR],
              [-widthM / 2 + legR, depthM / 2 - legR],
              [widthM / 2 - legR, depthM / 2 - legR],
            ].map(([lx, lz], idx) => (
              <mesh key={idx} position={[lx, legH / 2, lz]} castShadow receiveShadow>
                <cylinderGeometry args={[legR, legR * 1.1, legH, 16]} />
                <meshStandardMaterial color={mainColor} roughness={0.75} />
              </mesh>
            ))}
            {/* Mortise & Tenon Side Rails */}
            <mesh position={[0, heightM - frameThick / 2, -depthM / 2 + 0.03]} castShadow>
              <boxGeometry args={[widthM - 0.08, frameThick, 0.05]} />
              <meshStandardMaterial color={mainColor} roughness={0.7} />
            </mesh>
            <mesh position={[0, heightM - frameThick / 2, depthM / 2 - 0.03]} castShadow>
              <boxGeometry args={[widthM - 0.08, frameThick, 0.05]} />
              <meshStandardMaterial color={mainColor} roughness={0.7} />
            </mesh>
            <mesh position={[-widthM / 2 + 0.03, heightM - frameThick / 2, 0]} castShadow>
              <boxGeometry args={[0.05, frameThick, depthM - 0.08]} />
              <meshStandardMaterial color={mainColor} roughness={0.7} />
            </mesh>
            <mesh position={[widthM / 2 - 0.03, heightM - frameThick / 2, 0]} castShadow>
              <boxGeometry args={[0.05, frameThick, depthM - 0.08]} />
              <meshStandardMaterial color={mainColor} roughness={0.7} />
            </mesh>
            {/* Woven Jute Rope Webbing Surface */}
            <mesh position={[0, webH, 0]} castShadow receiveShadow>
              <boxGeometry args={[widthM - 0.12, 0.02, depthM - 0.12]} />
              <meshStandardMaterial color={fabricColor} roughness={0.9} />
            </mesh>
            {/* Cylindrical Bolster Roll at Headrest */}
            <mesh position={[-widthM / 2 + 0.22, heightM + 0.08, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.09, 0.09, depthM - 0.16, 16]} />
              <meshStandardMaterial color={cushionColor} roughness={0.8} />
            </mesh>
          </group>
        );
      }

      case 'nepali-gadda': {
        // Floor mattress seating with fabric folds and twin cylindrical takiya bolsters
        const matH = 0.14;
        const bolsterR = 0.11;
        return (
          <group>
            {/* Quilted Cotton Floor Mattress */}
            <mesh position={[0, matH / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[widthM, matH, depthM]} />
              <meshStandardMaterial color={mainColor} roughness={0.85} />
            </mesh>
            {/* Left Cylindrical Takiya Bolster */}
            <mesh position={[-widthM / 2 + bolsterR + 0.04, matH + bolsterR, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[bolsterR, bolsterR, depthM - 0.1, 16]} />
              <meshStandardMaterial color={cushionColor} roughness={0.8} />
            </mesh>
            {/* Right Cylindrical Takiya Bolster */}
            <mesh position={[widthM / 2 - bolsterR - 0.04, matH + bolsterR, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[bolsterR, bolsterR, depthM - 0.1, 16]} />
              <meshStandardMaterial color={cushionColor} roughness={0.8} />
            </mesh>
          </group>
        );
      }

      case 'nepali-dhoka-divider': {
        // 3-panel carved Jali screen with architectural open lattice cutouts and brass hinge knuckles
        const panelW = widthM / 3;
        const frameThick = 0.045;
        const stileW = 0.04;
        const railH = 0.06;
        const latticeH = heightM - railH * 2;
        const latticeW = panelW - stileW * 2;

        return (
          <group>
            {[0, 1, 2].map((idx) => {
              const px = -widthM / 2 + panelW / 2 + idx * panelW;
              const angle = (idx - 1) * 0.16; // Organic zigzag folding
              return (
                <group key={idx} position={[px, 0, 0]} rotation={[0, angle, 0]}>
                  {/* Left Stile */}
                  <mesh position={[-panelW / 2 + stileW / 2, heightM / 2, 0]} castShadow receiveShadow>
                    <boxGeometry args={[stileW, heightM, frameThick]} />
                    <meshStandardMaterial color={mainColor} roughness={0.7} />
                  </mesh>
                  {/* Right Stile */}
                  <mesh position={[panelW / 2 - stileW / 2, heightM / 2, 0]} castShadow receiveShadow>
                    <boxGeometry args={[stileW, heightM, frameThick]} />
                    <meshStandardMaterial color={mainColor} roughness={0.7} />
                  </mesh>
                  {/* Bottom Rail / Plinth */}
                  <mesh position={[0, railH / 2, 0]} castShadow receiveShadow>
                    <boxGeometry args={[latticeW, railH, frameThick]} />
                    <meshStandardMaterial color={mainColor} roughness={0.7} />
                  </mesh>
                  {/* Top Crown Rail */}
                  <mesh position={[0, heightM - railH / 2, 0]} castShadow receiveShadow>
                    <boxGeometry args={[latticeW, railH, frameThick]} />
                    <meshStandardMaterial color={mainColor} roughness={0.7} />
                  </mesh>
                  {/* Middle Lock Rail */}
                  <mesh position={[0, heightM * 0.42, 0]} castShadow receiveShadow>
                    <boxGeometry args={[latticeW, 0.04, frameThick]} />
                    <meshStandardMaterial color={mainColor} roughness={0.7} />
                  </mesh>

                  {/* Architectural Jali Fretwork: Multiple Vertical & Diagonal Cutout Slats */}
                  {[-latticeW * 0.3, -latticeW * 0.1, latticeW * 0.1, latticeW * 0.3].map((sx, si) => (
                    <mesh key={`v-slat-${si}`} position={[sx, heightM / 2, 0]} castShadow>
                      <boxGeometry args={[0.016, latticeH - 0.02, 0.02]} />
                      <meshStandardMaterial color={def.subColor || '#5C3524'} roughness={0.65} />
                    </mesh>
                  ))}
                  {/* Horizontal Cross Muntins */}
                  {[heightM * 0.22, heightM * 0.62, heightM * 0.82].map((sy, hi) => (
                    <mesh key={`h-slat-${hi}`} position={[0, sy, 0]} castShadow>
                      <boxGeometry args={[latticeW - 0.01, 0.016, 0.02]} />
                      <meshStandardMaterial color={def.subColor || '#5C3524'} roughness={0.65} />
                    </mesh>
                  ))}

                  {/* Brass Hinges on Adjacent Edges */}
                  {idx < 2 && [0.35, 0.85, 1.45].map((hy, hi) => (
                    <mesh key={`hinge-${hi}`} position={[panelW / 2, hy, 0]} castShadow>
                      <cylinderGeometry args={[0.012, 0.012, 0.04, 12]} />
                      <meshStandardMaterial color={accentColor} metalness={0.85} roughness={0.25} />
                    </mesh>
                  ))}
                </group>
              );
            })}
          </group>
        );
      }

      case 'nepali-puja-mandir': {
        // Traditional tiered wooden shrine with authentic pagoda roofs, columns, and Kalasha/Gajur finial
        const baseH = 0.22;
        const columnH = 0.44;
        const tier1H = 0.14;
        const tier2H = 0.12;
        return (
          <group>
            {/* Lower Base Cabinet Plinth */}
            <mesh position={[0, baseH / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[widthM, baseH, depthM]} />
              <meshStandardMaterial color={mainColor} roughness={0.7} />
            </mesh>
            {/* Incense Drawer Front Inset */}
            <mesh position={[0, baseH / 2, depthM / 2 + 0.005]} castShadow>
              <boxGeometry args={[widthM * 0.75, baseH * 0.65, 0.012]} />
              <meshStandardMaterial color="#422213" roughness={0.6} />
            </mesh>
            {/* Twin Brass Drawer Knobs */}
            <mesh position={[-widthM * 0.2, baseH / 2, depthM / 2 + 0.02]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.012, 0.012, 0.018, 12]} />
              <meshStandardMaterial color={accentColor} metalness={0.9} roughness={0.2} />
            </mesh>
            <mesh position={[widthM * 0.2, baseH / 2, depthM / 2 + 0.02]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.012, 0.012, 0.018, 12]} />
              <meshStandardMaterial color={accentColor} metalness={0.9} roughness={0.2} />
            </mesh>

            {/* Sanctum Floor with Crimson Velvet Cloth */}
            <mesh position={[0, baseH + 0.006, 0]}>
              <boxGeometry args={[widthM - 0.04, 0.012, depthM - 0.04]} />
              <meshStandardMaterial color={def.subColor || '#8B2635'} roughness={0.85} />
            </mesh>
            {/* Deep Enclosed Back Wall */}
            <mesh position={[0, baseH + columnH / 2, -depthM / 2 + 0.025]} castShadow>
              <boxGeometry args={[widthM - 0.04, columnH, 0.04]} />
              <meshStandardMaterial color="#3D1F12" roughness={0.7} />
            </mesh>
            {/* Left Wall Wing */}
            <mesh position={[-widthM / 2 + 0.025, baseH + columnH / 2, 0]} castShadow>
              <boxGeometry args={[0.04, columnH, depthM - 0.05]} />
              <meshStandardMaterial color="#3D1F12" roughness={0.7} />
            </mesh>
            {/* Right Wall Wing */}
            <mesh position={[widthM / 2 - 0.025, baseH + columnH / 2, 0]} castShadow>
              <boxGeometry args={[0.04, columnH, depthM - 0.05]} />
              <meshStandardMaterial color="#3D1F12" roughness={0.7} />
            </mesh>

            {/* Twin Turned Front Columns with Capital Blocks */}
            {[-widthM / 2 + 0.07, widthM / 2 - 0.07].map((cx, ci) => (
              <group key={`col-${ci}`} position={[cx, baseH, depthM / 2 - 0.07]}>
                {/* Column Base */}
                <mesh position={[0, 0.02, 0]} castShadow>
                  <boxGeometry args={[0.06, 0.04, 0.06]} />
                  <meshStandardMaterial color="#542E1B" roughness={0.65} />
                </mesh>
                {/* Turned Column Shaft */}
                <mesh position={[0, columnH / 2, 0]} castShadow>
                  <cylinderGeometry args={[0.022, 0.026, columnH - 0.08, 16]} />
                  <meshStandardMaterial color="#6B3820" roughness={0.6} />
                </mesh>
                {/* Carved Bracket Capital */}
                <mesh position={[0, columnH - 0.02, 0]} castShadow>
                  <boxGeometry args={[0.07, 0.04, 0.07]} />
                  <meshStandardMaterial color="#542E1B" roughness={0.65} />
                </mesh>
              </group>
            ))}

            {/* Lower Tier Pagoda Roof Eave (Flared outward) */}
            <mesh position={[0, baseH + columnH + tier1H / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[widthM + 0.14, tier1H, depthM + 0.14]} />
              <meshStandardMaterial color="#30180D" roughness={0.65} />
            </mesh>
            {/* Flared Eave Cornice Molding */}
            <mesh position={[0, baseH + columnH + tier1H, 0]} castShadow>
              <boxGeometry args={[widthM + 0.18, 0.025, depthM + 0.18]} />
              <meshStandardMaterial color={accentColor} metalness={0.75} roughness={0.3} />
            </mesh>

            {/* Upper Tier Pagoda Roof (Stepped inwards with pitched slope) */}
            <mesh position={[0, baseH + columnH + tier1H + tier2H / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[widthM * 0.72, tier2H, depthM * 0.72]} />
              <meshStandardMaterial color="#2B140A" roughness={0.65} />
            </mesh>

            {/* Ornate Patan Brass Gajur / Kalasha Finial Assemblage */}
            <group position={[0, baseH + columnH + tier1H + tier2H, 0]}>
              {/* Stepped Brass Base Plinth */}
              <mesh position={[0, 0.015, 0]} castShadow>
                <cylinderGeometry args={[0.065, 0.08, 0.03, 16]} />
                <meshStandardMaterial color={accentColor} metalness={0.9} roughness={0.2} />
              </mesh>
              {/* Sacred Kalasha Spherical Urn */}
              <mesh position={[0, 0.055, 0]} castShadow>
                <sphereGeometry args={[0.038, 16, 16]} />
                <meshStandardMaterial color={accentColor} metalness={0.92} roughness={0.18} />
              </mesh>
              {/* Pointed Spire Cone (Gajur Tip) */}
              <mesh position={[0, 0.12, 0]} castShadow>
                <coneGeometry args={[0.024, 0.11, 16]} />
                <meshStandardMaterial color={accentColor} metalness={0.94} roughness={0.15} />
              </mesh>
            </group>
          </group>
        );
      }

      case 'nepali-lota-display': {
        // Turned wooden tripod stand with polished brass Karuwa vessel
        const standH = heightM - 0.28;
        return (
          <group>
            {/* Tripod Stand Top Disc */}
            <mesh position={[0, standH, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[widthM / 2, widthM / 2, 0.03, 24]} />
              <meshStandardMaterial color={mainColor} roughness={0.7} />
            </mesh>
            {/* 3 Turned Legs */}
            {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((rad, idx) => {
              const lx = (widthM / 2 - 0.05) * Math.cos(rad);
              const lz = (widthM / 2 - 0.05) * Math.sin(rad);
              return (
                <mesh key={idx} position={[lx, standH / 2, lz]} rotation={[0.08 * Math.sin(rad), 0, -0.08 * Math.cos(rad)]} castShadow>
                  <cylinderGeometry args={[0.02, 0.025, standH, 12]} />
                  <meshStandardMaterial color={mainColor} roughness={0.7} />
                </mesh>
              );
            })}
            {/* Polished Brass Karuwa Vessel Body */}
            <mesh position={[0, standH + 0.1, 0]} castShadow>
              <sphereGeometry args={[0.09, 20, 20]} />
              <meshStandardMaterial color={accentColor} metalness={0.9} roughness={0.2} />
            </mesh>
            {/* Karuwa Neck & Fluted Rim */}
            <mesh position={[0, standH + 0.21, 0]} castShadow>
              <cylinderGeometry args={[0.035, 0.025, 0.08, 16]} />
              <meshStandardMaterial color={accentColor} metalness={0.9} roughness={0.2} />
            </mesh>
            {/* Karuwa Curved Spout */}
            <mesh position={[0.07, standH + 0.15, 0]} rotation={[0, 0, -0.6]} castShadow>
              <cylinderGeometry args={[0.012, 0.018, 0.12, 12]} />
              <meshStandardMaterial color={accentColor} metalness={0.9} roughness={0.2} />
            </mesh>
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
    <group position={[posX, (item.elevationCm || 0) / 100, posZ]} rotation={[0, rotY, 0]}>
      {render3DModel()}

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

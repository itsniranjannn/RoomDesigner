import React from 'react';

/**
 * Room3DWalls.jsx
 * Architectural walls supporting both Cutaway (maquette section) and Full-Height modes.
 *
 * Core Guarantees:
 * - 1:1 Physical Parity with 2D: Wall offsets and orientations match 2D drafting coordinates exactly.
 * - Multi-Opening Support: Any wall can contain multiple doors and windows simultaneously without clipping or dropping.
 * - Continuous sage pine coping caps (#4A5D52) along all perimeter wall segments and lintels.
 * - Interior architectural timber baseboard trim (#B8976C) along the room floor perimeter.
 * - Authentic window assemblies with timber sill, casing, translucent glazing, mullions, and top lintels.
 * - Authentic door assemblies with timber threshold, posts, header jamb, 3D swung door leaf (inward swing),
 *   bronze hardware handle, and top lintels.
 */
export function Room3DWalls({ room, isFullHeight = false }) {
  const { widthCm, depthCm, doors = [], windows = [] } = room;
  const widthM = widthCm / 100;
  const depthM = depthCm / 100;

  // Cutaway wall height: 0.45m (architectural dollhouse maquette)
  // Full-height wall height: 2.4m
  const wallHeightM = isFullHeight ? 2.4 : 0.45;
  const wallThickM = 0.14;
  const capHeightM = 0.04;
  const capThickM = wallThickM + 0.03; // Overhang on coping cap

  const wallColor = '#E5DFD4'; // Warm plaster tone
  const wallCapColor = '#4A5D52'; // Sage pine architectural coping cap
  const floorColor = '#EDE5D8'; // Warm natural oak/linen floor
  const woodTrimColor = '#B8976C'; // Architectural timber trim
  const baseboardH = 0.08; // 8cm interior baseboard

  const halfW = widthM / 2;
  const halfD = depthM / 2;
  const halfH = wallHeightM / 2;

  // Window heights
  const winSillH = isFullHeight ? 0.9 : 0.18;
  const winHeadH = isFullHeight ? 2.0 : wallHeightM;
  const winFrameH = Math.max(0.12, winHeadH - winSillH);

  // Door heights
  const doorLeafH = isFullHeight ? 2.0 : Math.min(2.0, wallHeightM);
  const handleH = isFullHeight ? 0.95 : doorLeafH * 0.58;

  /**
   * Renders a perimeter wall with arbitrary openings (doors and windows),
   * ensuring 1:1 mathematical alignment with 2D drafting coordinates.
   */
  const renderWall = (wallName) => {
    const isHorizontal = wallName === 'top' || wallName === 'bottom';
    const wallLengthM = isHorizontal ? widthM : depthM;

    // Fixed wall center in 3D
    let wallCenterX = 0;
    let wallCenterZ = 0;
    let normalDirX = 0; // Direction pointing INTO the room
    let normalDirZ = 0;

    if (wallName === 'top') {
      wallCenterZ = -halfD - wallThickM / 2;
      normalDirZ = 1; // into room towards +Z
    } else if (wallName === 'bottom') {
      wallCenterZ = halfD + wallThickM / 2;
      normalDirZ = -1; // into room towards -Z
    } else if (wallName === 'left') {
      wallCenterX = -halfW - wallThickM / 2;
      normalDirX = 1; // into room towards +X
    } else if (wallName === 'right') {
      wallCenterX = halfW + wallThickM / 2;
      normalDirX = -1; // into room towards -X
    }

    // Collect all openings on this wall
    const rawOpenings = [
      ...(windows || []).filter((w) => (w.wall || 'top') === wallName).map((w) => ({ ...w, type: 'window' })),
      ...(doors || []).filter((d) => (d.wall || 'bottom') === wallName).map((d) => ({ ...d, type: 'door' })),
    ];

    // Normalize and sort openings by offset along the wall
    const wallOpenings = rawOpenings
      .map((op) => {
        const offsetM = (Number.isFinite(op.offsetCm) ? op.offsetCm : 60) / 100;
        const widthM = (Number.isFinite(op.widthCm) ? op.widthCm : (op.type === 'door' ? 90 : 120)) / 100;
        return {
          ...op,
          offsetM: Math.max(0.1, Math.min(wallLengthM - 0.2, offsetM)),
          widthM: Math.max(0.4, Math.min(wallLengthM - offsetM - 0.1, widthM)),
        };
      })
      .sort((a, b) => a.offsetM - b.offsetM);

    // Compute solid wall segments between openings
    const segments = [];
    let cursor = 0;

    for (const op of wallOpenings) {
      if (op.offsetM > cursor + 0.03) {
        segments.push({ start: cursor, end: op.offsetM });
      }
      cursor = Math.max(cursor, op.offsetM + op.widthM);
    }
    if (cursor < wallLengthM - 0.03) {
      segments.push({ start: cursor, end: wallLengthM });
    }

    // Helper to compute world position for a point along the wall at offset `alongM`
    const getPointOnWall = (alongM) => {
      if (isHorizontal) {
        // alongM runs West to East: 0 is -halfW, wallLengthM is +halfW
        return {
          x: -halfW + alongM,
          z: wallCenterZ,
        };
      }
      // alongM runs North to South: 0 is -halfD, wallLengthM is +halfD
      return {
        x: wallCenterX,
        z: -halfD + alongM,
      };
    };

    return (
      <group key={wallName}>
        {/* ======================================================== */}
        {/* SOLID WALL SEGMENTS */}
        {/* ======================================================== */}
        {segments.map((seg, idx) => {
          const segLen = seg.end - seg.start;
          const segMidAlong = seg.start + segLen / 2;
          const pt = getPointOnWall(segMidAlong);

          const geomArgs = isHorizontal
            ? [segLen, wallHeightM, wallThickM]
            : [wallThickM, wallHeightM, segLen];

          const capArgs = isHorizontal
            ? [segLen + 0.01, capHeightM, capThickM]
            : [capThickM, capHeightM, segLen + 0.01];

          // Baseboard on interior side facing room
          const baseboardPos = isHorizontal
            ? [pt.x, baseboardH / 2, pt.z + normalDirZ * (wallThickM / 2 + 0.006)]
            : [pt.x + normalDirX * (wallThickM / 2 + 0.006), baseboardH / 2, pt.z];

          const baseboardArgs = isHorizontal
            ? [segLen, baseboardH, 0.012]
            : [0.012, baseboardH, segLen];

          return (
            <group key={`seg-${idx}`}>
              {/* Plaster Wall Segment */}
              <mesh castShadow receiveShadow position={[pt.x, halfH, pt.z]}>
                <boxGeometry args={geomArgs} />
                <meshStandardMaterial color={wallColor} roughness={0.85} />
              </mesh>

              {/* Sage Pine Coping Cap on Top */}
              <mesh position={[pt.x, wallHeightM + capHeightM / 2, pt.z]} castShadow>
                <boxGeometry args={capArgs} />
                <meshStandardMaterial color={wallCapColor} roughness={0.6} />
              </mesh>

              {/* Timber Baseboard along Floor */}
              <mesh position={baseboardPos}>
                <boxGeometry args={baseboardArgs} />
                <meshStandardMaterial color={woodTrimColor} roughness={0.7} />
              </mesh>
            </group>
          );
        })}

        {/* ======================================================== */}
        {/* OPENINGS (WINDOWS AND DOORS) */}
        {/* ======================================================== */}
        {wallOpenings.map((op) => {
          const openMidAlong = op.offsetM + op.widthM / 2;
          const pt = getPointOnWall(openMidAlong);

          if (op.type === 'window') {
            // Wall under sill
            const underSillArgs = isHorizontal
              ? [op.widthM, winSillH, wallThickM]
              : [wallThickM, winSillH, op.widthM];

            // Baseboard under sill
            const baseboardUnderSillPos = isHorizontal
              ? [pt.x, Math.min(baseboardH, winSillH) / 2, pt.z + normalDirZ * (wallThickM / 2 + 0.006)]
              : [pt.x + normalDirX * (wallThickM / 2 + 0.006), Math.min(baseboardH, winSillH) / 2, pt.z];
            const baseboardUnderSillArgs = isHorizontal
              ? [op.widthM, Math.min(baseboardH, winSillH), 0.012]
              : [0.012, Math.min(baseboardH, winSillH), op.widthM];

            // Window Sill
            const sillPos = isHorizontal
              ? [pt.x, winSillH + 0.015, pt.z + normalDirZ * 0.01]
              : [pt.x + normalDirX * 0.01, winSillH + 0.015, pt.z];
            const sillArgs = isHorizontal
              ? [op.widthM + 0.06, 0.03, wallThickM + 0.04]
              : [wallThickM + 0.04, 0.03, op.widthM + 0.06];

            // Hollow Window Frame (Jambs + Head)
            const frameThick = 0.04; // 4cm timber frame border
            const frameDepth = wallThickM + 0.01;
            const glassW = Math.max(0.2, op.widthM - frameThick * 2);
            const glassH = Math.max(0.2, winFrameH - frameThick);

            // Left / Start Jamb
            const jamb1Pos = isHorizontal
              ? [pt.x - op.widthM / 2 + frameThick / 2, winSillH + winFrameH / 2, pt.z]
              : [pt.x, winSillH + winFrameH / 2, pt.z - op.widthM / 2 + frameThick / 2];
            const jamb1Args = isHorizontal
              ? [frameThick, winFrameH, frameDepth]
              : [frameDepth, winFrameH, frameThick];

            // Right / End Jamb
            const jamb2Pos = isHorizontal
              ? [pt.x + op.widthM / 2 - frameThick / 2, winSillH + winFrameH / 2, pt.z]
              : [pt.x, winSillH + winFrameH / 2, pt.z + op.widthM / 2 - frameThick / 2];
            const jamb2Args = isHorizontal
              ? [frameThick, winFrameH, frameDepth]
              : [frameDepth, winFrameH, frameThick];

            // Head (top frame bar)
            const headPos = isHorizontal
              ? [pt.x, winSillH + winFrameH - frameThick / 2, pt.z]
              : [pt.x, winSillH + winFrameH - frameThick / 2, pt.z];
            const headArgs = isHorizontal
              ? [op.widthM, frameThick, frameDepth]
              : [frameDepth, frameThick, op.widthM];

            // Translucent Glass Pane centered in frame
            const glassPos = [pt.x, winSillH + winFrameH / 2, pt.z];
            const glassArgs = isHorizontal
              ? [glassW, glassH, 0.015]
              : [0.015, glassH, glassW];

            // Window Mullions (vertical and horizontal crossbars)
            const vertMullionArgs = isHorizontal
              ? [0.025, glassH, 0.028]
              : [0.028, glassH, 0.025];
            const horizMullionArgs = isHorizontal
              ? [glassW, 0.02, 0.028]
              : [0.028, 0.02, glassW];

            // Lintel (full-height mode)
            const lintelArgs = isHorizontal
              ? [op.widthM, wallHeightM - winHeadH, wallThickM]
              : [wallThickM, wallHeightM - winHeadH, op.widthM];
            const capOverWinArgs = isHorizontal
              ? [op.widthM + 0.01, capHeightM, capThickM]
              : [capThickM, capHeightM, op.widthM + 0.01];

            return (
              <group key={`win-${op.id}`}>
                {/* Wall under sill */}
                <mesh castShadow receiveShadow position={[pt.x, winSillH / 2, pt.z]}>
                  <boxGeometry args={underSillArgs} />
                  <meshStandardMaterial color={wallColor} roughness={0.85} />
                </mesh>

                {/* Baseboard under sill */}
                <mesh position={baseboardUnderSillPos}>
                  <boxGeometry args={baseboardUnderSillArgs} />
                  <meshStandardMaterial color={woodTrimColor} roughness={0.7} />
                </mesh>

                {/* Timber Window Sill */}
                <mesh position={sillPos} castShadow>
                  <boxGeometry args={sillArgs} />
                  <meshStandardMaterial color={woodTrimColor} roughness={0.6} />
                </mesh>

                {/* Left Window Jamb Frame */}
                <mesh position={jamb1Pos} castShadow>
                  <boxGeometry args={jamb1Args} />
                  <meshStandardMaterial color={woodTrimColor} roughness={0.6} />
                </mesh>

                {/* Right Window Jamb Frame */}
                <mesh position={jamb2Pos} castShadow>
                  <boxGeometry args={jamb2Args} />
                  <meshStandardMaterial color={woodTrimColor} roughness={0.6} />
                </mesh>

                {/* Top Window Head Frame */}
                <mesh position={headPos} castShadow>
                  <boxGeometry args={headArgs} />
                  <meshStandardMaterial color={woodTrimColor} roughness={0.6} />
                </mesh>

                {/* Translucent Window Glass Pane */}
                <mesh position={glassPos}>
                  <boxGeometry args={glassArgs} />
                  <meshStandardMaterial
                    color="#A3D2E2"
                    transparent
                    opacity={0.35}
                    roughness={0.05}
                    metalness={0.1}
                  />
                </mesh>

                {/* Architectural Mullions */}
                <mesh position={glassPos}>
                  <boxGeometry args={vertMullionArgs} />
                  <meshStandardMaterial color="#FFFFFF" roughness={0.4} />
                </mesh>
                <mesh position={glassPos}>
                  <boxGeometry args={horizMullionArgs} />
                  <meshStandardMaterial color="#FFFFFF" roughness={0.4} />
                </mesh>

                {/* Lintel Wall above Window in Full-Height Mode */}
                {isFullHeight && (
                  <group position={[pt.x, (wallHeightM + winHeadH) / 2, pt.z]}>
                    <mesh castShadow receiveShadow>
                      <boxGeometry args={lintelArgs} />
                      <meshStandardMaterial color={wallColor} roughness={0.85} />
                    </mesh>
                    <mesh position={[0, (wallHeightM - winHeadH) / 2 + capHeightM / 2, 0]} castShadow>
                      <boxGeometry args={capOverWinArgs} />
                      <meshStandardMaterial color={wallCapColor} roughness={0.6} />
                    </mesh>
                  </group>
                )}
              </group>
            );
          }

          // Door opening
          const doorPostH = isFullHeight ? 2.04 : wallHeightM;
          const startPt = getPointOnWall(op.offsetM);
          const endPt = getPointOnWall(op.offsetM + op.widthM);

          // Door threshold
          const threshArgs = isHorizontal
            ? [op.widthM, 0.012, wallThickM + 0.02]
            : [wallThickM + 0.02, 0.012, op.widthM];

          // Jamb posts
          const postArgs = isHorizontal
            ? [0.04, doorPostH, wallThickM + 0.01]
            : [wallThickM + 0.01, doorPostH, 0.04];
          const post1Pos = isHorizontal
            ? [startPt.x + 0.02, doorPostH / 2, pt.z]
            : [pt.x, doorPostH / 2, startPt.z + 0.02];
          const post2Pos = isHorizontal
            ? [endPt.x - 0.02, doorPostH / 2, pt.z]
            : [pt.x, doorPostH / 2, endPt.z - 0.02];

          // Header jamb
          const headerPos = [pt.x, isFullHeight ? 2.02 : wallHeightM, pt.z];
          const headerArgs = isHorizontal
            ? [op.widthM, 0.04, wallThickM + 0.01]
            : [wallThickM + 0.01, 0.04, op.widthM];

          // Top lintel in full-height mode
          const doorLintelArgs = isHorizontal
            ? [op.widthM, wallHeightM - 2.04, wallThickM]
            : [wallThickM, wallHeightM - 2.04, op.widthM];
          const doorCapArgs = isHorizontal
            ? [op.widthM + 0.01, capHeightM, capThickM]
            : [capThickM, capHeightM, op.widthM + 0.01];

          // 3D Door Leaf inward swing geometry
          // Hinge is mounted near startPt
          let hingeX = startPt.x;
          let hingeZ = startPt.z;
          let leafRotY = 0;
          let leafMeshOffset = [0, doorLeafH / 2, 0];
          let handleOffset = [0, handleH, 0];

          if (wallName === 'top') {
            hingeX = startPt.x + 0.02;
            hingeZ = pt.z + wallThickM / 2;
            leafRotY = -Math.PI / 2.8; // swings into room (+Z)
            leafMeshOffset = [op.widthM * 0.48, doorLeafH / 2, 0];
            handleOffset = [op.widthM * 0.85, handleH, 0.025];
          } else if (wallName === 'bottom') {
            hingeX = startPt.x + 0.02;
            hingeZ = pt.z - wallThickM / 2;
            leafRotY = Math.PI / 2.8; // swings into room (-Z)
            leafMeshOffset = [op.widthM * 0.48, doorLeafH / 2, 0];
            handleOffset = [op.widthM * 0.85, handleH, -0.025];
          } else if (wallName === 'left') {
            hingeX = pt.x + wallThickM / 2;
            hingeZ = startPt.z + 0.02;
            leafRotY = Math.PI / 2 + Math.PI / 2.8; // swings into room (+X)
            leafMeshOffset = [op.widthM * 0.48, doorLeafH / 2, 0];
            handleOffset = [op.widthM * 0.85, handleH, 0.025];
          } else if (wallName === 'right') {
            hingeX = pt.x - wallThickM / 2;
            hingeZ = startPt.z + 0.02;
            leafRotY = Math.PI / 2 - Math.PI / 2.8; // swings into room (-X)
            leafMeshOffset = [op.widthM * 0.48, doorLeafH / 2, 0];
            handleOffset = [op.widthM * 0.85, handleH, -0.025];
          }

          return (
            <group key={`door-${op.id}`}>
              {/* Floor Timber Threshold */}
              <mesh position={[pt.x, 0.006, pt.z]}>
                <boxGeometry args={threshArgs} />
                <meshStandardMaterial color={woodTrimColor} roughness={0.7} />
              </mesh>

              {/* Left & Right Door Frame Posts */}
              <mesh position={post1Pos}>
                <boxGeometry args={postArgs} />
                <meshStandardMaterial color={woodTrimColor} roughness={0.6} />
              </mesh>
              <mesh position={post2Pos}>
                <boxGeometry args={postArgs} />
                <meshStandardMaterial color={woodTrimColor} roughness={0.6} />
              </mesh>

              {/* Header Jamb */}
              <mesh position={headerPos}>
                <boxGeometry args={headerArgs} />
                <meshStandardMaterial color={woodTrimColor} roughness={0.6} />
              </mesh>

              {/* Swung Open 3D Door Leaf (Hinge-mounted, swings inward into room) */}
              <group position={[hingeX, 0, hingeZ]} rotation={[0, leafRotY, 0]}>
                <mesh position={leafMeshOffset} castShadow>
                  <boxGeometry args={[op.widthM * 0.96, doorLeafH, 0.035]} />
                  <meshStandardMaterial color="#FAF6EE" roughness={0.5} />
                </mesh>
                {/* Bronze Door Handle */}
                <mesh position={handleOffset} castShadow>
                  <boxGeometry args={[0.08, 0.02, 0.04]} />
                  <meshStandardMaterial color="#1C1A17" roughness={0.3} metalness={0.8} />
                </mesh>
              </group>

              {/* Lintel Wall above Door in Full-Height Mode */}
              {isFullHeight && (
                <group position={[pt.x, (wallHeightM + 2.04) / 2, pt.z]}>
                  <mesh castShadow receiveShadow>
                    <boxGeometry args={doorLintelArgs} />
                    <meshStandardMaterial color={wallColor} roughness={0.85} />
                  </mesh>
                  <mesh position={[0, (wallHeightM - 2.04) / 2 + capHeightM / 2, 0]} castShadow>
                    <boxGeometry args={doorCapArgs} />
                    <meshStandardMaterial color={wallCapColor} roughness={0.6} />
                  </mesh>
                </group>
              )}

              {/* Coping Cap in Cutaway Mode */}
              {!isFullHeight && (
                <mesh position={[pt.x, wallHeightM + capHeightM / 2, pt.z]} castShadow>
                  <boxGeometry args={doorCapArgs} />
                  <meshStandardMaterial color={wallCapColor} roughness={0.6} />
                </mesh>
              )}
            </group>
          );
        })}
      </group>
    );
  };

  return (
    <group>
      {/* Warm Architectural Floor Plane */}
      <mesh receiveShadow position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[widthM, depthM]} />
        <meshStandardMaterial color={floorColor} roughness={0.8} />
      </mesh>

      {/* Subtle floor plank division lines */}
      <group position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        {Array.from({ length: Math.floor(widthM / 0.45) }).map((_, idx) => {
          const px = -halfW + (idx + 1) * 0.45;
          return (
            <mesh key={idx} position={[px, 0, 0]}>
              <planeGeometry args={[0.003, depthM * 0.98]} />
              <meshBasicMaterial color="#DDD3C4" />
            </mesh>
          );
        })}
      </group>

      {/* 4 Architectural Perimeter Walls */}
      {renderWall('top')}
      {renderWall('bottom')}
      {renderWall('left')}
      {renderWall('right')}
    </group>
  );
}

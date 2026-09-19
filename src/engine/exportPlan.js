/**
 * exportPlan.js
 * Generates an architectural high-resolution 2D floor plan PNG export.
 * Renders cleanly at a fixed canonical top-down orientation without
 * interactive drag handles, hover halos, or selection outlines.
 */

import { getFurnitureType } from '../data/furnitureCatalog.js';

export async function exportRoomPlanAsPNG(room) {
  if (!room) return;

  const roomWidth = room.widthCm || 500;
  const roomDepth = room.depthCm || 400;
  const wallThickness = 14;

  // Margin around the room for dimensions and title stamp
  const marginCm = 45;
  const totalWidthCm = roomWidth + marginCm * 2;
  const totalDepthCm = roomDepth + marginCm * 2;

  // Render resolution: longest edge ~2400px
  const targetLongEdge = 2400;
  const scale = targetLongEdge / Math.max(totalWidthCm, totalDepthCm);
  const canvasWidth = Math.round(totalWidthCm * scale);
  const canvasHeight = Math.round(totalDepthCm * scale);

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // High-quality image rendering settings
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. Background Sheet (Architectural linen)
  ctx.fillStyle = '#F7F3EC';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Set coordinate transform to work in room cm centered inside canvas
  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(marginCm, marginCm);

  // 2. Floor background fill
  ctx.fillStyle = '#FBF9F5';
  ctx.fillRect(0, 0, roomWidth, roomDepth);

  // 3. Subtle grid lines (50cm architectural grid)
  ctx.strokeStyle = '#E8E1D5';
  ctx.lineWidth = 0.6;
  ctx.setLineDash([2, 4]);

  for (let x = 50; x < roomWidth; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, roomDepth);
    ctx.stroke();
  }
  for (let y = 50; y < roomDepth; y += 50) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(roomWidth, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // 4. Perimeter Walls (Pine #4A5D52 with solid outline #1C1A17)
  ctx.fillStyle = '#4A5D52';
  // Top wall
  ctx.fillRect(-wallThickness / 2, -wallThickness / 2, roomWidth + wallThickness, wallThickness);
  // Bottom wall
  ctx.fillRect(-wallThickness / 2, roomDepth - wallThickness / 2, roomWidth + wallThickness, wallThickness);
  // Left wall
  ctx.fillRect(-wallThickness / 2, -wallThickness / 2, wallThickness, roomDepth + wallThickness);
  // Right wall
  ctx.fillRect(roomWidth - wallThickness / 2, -wallThickness / 2, wallThickness, roomDepth + wallThickness);

  // Inner boundary line
  ctx.strokeStyle = '#1C1A17';
  ctx.lineWidth = 2.4;
  ctx.strokeRect(0, 0, roomWidth, roomDepth);

  // 5. Windows
  const windows = room.windows || [];
  windows.forEach((win) => {
    const wall = win.wall || 'top';
    const isHorizontal = wall === 'top' || wall === 'bottom';
    const wallLen = isHorizontal ? roomWidth : roomDepth;
    const winOffset = Number.isFinite(win.offsetCm) ? win.offsetCm : Math.round(wallLen / 2 - 60);
    const winWidth = Number.isFinite(win.widthCm) ? win.widthCm : 120;

    const wx = isHorizontal ? winOffset : (wall === 'left' ? -wallThickness / 2 : roomWidth - wallThickness / 2);
    const wy = isHorizontal ? (wall === 'top' ? -wallThickness / 2 : roomDepth - wallThickness / 2) : winOffset;
    const ww = isHorizontal ? winWidth : wallThickness;
    const wh = isHorizontal ? wallThickness : winWidth;

    // Clear wall cutout
    ctx.fillStyle = '#F7F3EC';
    ctx.fillRect(wx - 0.5, wy - 0.5, ww + 1, wh + 1);

    // Glass pane fill
    ctx.fillStyle = 'rgba(163, 210, 226, 0.4)';
    ctx.fillRect(wx, wy, ww, wh);

    // Glazing lines
    ctx.strokeStyle = '#3D7B8F';
    ctx.lineWidth = 1.2;
    if (isHorizontal) {
      ctx.beginPath();
      ctx.moveTo(wx, wy + wh * 0.35);
      ctx.lineTo(wx + ww, wy + wh * 0.35);
      ctx.moveTo(wx, wy + wh * 0.65);
      ctx.lineTo(wx + ww, wy + wh * 0.65);
      ctx.stroke();

      // End jambs
      ctx.strokeStyle = '#1C1A17';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.lineTo(wx, wy + wh);
      ctx.moveTo(wx + ww, wy);
      ctx.lineTo(wx + ww, wy + wh);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(wx + ww * 0.35, wy);
      ctx.lineTo(wx + ww * 0.35, wy + wh);
      ctx.moveTo(wx + ww * 0.65, wy);
      ctx.lineTo(wx + ww * 0.65, wy + wh);
      ctx.stroke();

      // End jambs
      ctx.strokeStyle = '#1C1A17';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.lineTo(wx + ww, wy);
      ctx.moveTo(wx, wy + wh);
      ctx.lineTo(wx + ww, wy + wh);
      ctx.stroke();
    }
  });

  // 6. Doors & Swing Arcs
  const doors = room.doors || [];
  doors.forEach((door) => {
    const wall = door.wall || 'bottom';
    const isHorizontal = wall === 'top' || wall === 'bottom';
    const wallLen = isHorizontal ? roomWidth : roomDepth;
    const doorOffset = Number.isFinite(door.offsetCm) ? door.offsetCm : Math.round(wallLen / 2 - 45);
    const doorWidth = Number.isFinite(door.widthCm) ? door.widthCm : 90;

    const dx = isHorizontal ? doorOffset : (wall === 'left' ? -wallThickness / 2 : roomWidth - wallThickness / 2);
    const dy = isHorizontal ? (wall === 'top' ? -wallThickness / 2 : roomDepth - wallThickness / 2) : doorOffset;
    const dw = isHorizontal ? doorWidth : wallThickness;
    const dh = isHorizontal ? wallThickness : doorWidth;

    // Cutout
    ctx.fillStyle = '#F7F3EC';
    ctx.fillRect(dx, dy, dw, dh);

    // Door threshold
    ctx.fillStyle = '#E8DEC8';
    ctx.strokeStyle = '#634E32';
    ctx.lineWidth = 1;
    ctx.fillRect(dx, dy, dw, dh);
    ctx.strokeRect(dx, dy, dw, dh);

    // Swing arc (dashed) & leaf line (solid)
    ctx.save();
    ctx.strokeStyle = '#A89F90';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 3]);

    const isOutward = door.swingDirection === 'outward';

    if (wall === 'bottom') {
      if (isOutward) {
        // Outward swing (+Y)
        ctx.beginPath();
        ctx.arc(dx, roomDepth, doorWidth, 0, Math.PI / 2, false);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.strokeStyle = '#1C1A17';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(dx, roomDepth);
        ctx.lineTo(dx, roomDepth + doorWidth);
        ctx.stroke();
      } else {
        // Inward swing (-Y)
        ctx.beginPath();
        ctx.arc(dx, roomDepth, doorWidth, -Math.PI / 2, 0, false);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.strokeStyle = '#1C1A17';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(dx, roomDepth);
        ctx.lineTo(dx, roomDepth - doorWidth);
        ctx.stroke();
      }
    } else if (wall === 'top') {
      if (isOutward) {
        // Outward swing (-Y)
        ctx.beginPath();
        ctx.arc(dx, 0, doorWidth, -Math.PI / 2, 0, false);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.strokeStyle = '#1C1A17';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(dx, 0);
        ctx.lineTo(dx, -doorWidth);
        ctx.stroke();
      } else {
        // Inward swing (+Y)
        ctx.beginPath();
        ctx.arc(dx, 0, doorWidth, 0, Math.PI / 2, false);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.strokeStyle = '#1C1A17';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(dx, 0);
        ctx.lineTo(dx, doorWidth);
        ctx.stroke();
      }
    } else if (wall === 'left') {
      if (isOutward) {
        // Outward swing (-X)
        ctx.beginPath();
        ctx.arc(0, dy, doorWidth, Math.PI / 2, Math.PI, false);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.strokeStyle = '#1C1A17';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(0, dy);
        ctx.lineTo(-doorWidth, dy);
        ctx.stroke();
      } else {
        // Inward swing (+X)
        ctx.beginPath();
        ctx.arc(0, dy, doorWidth, 0, Math.PI / 2, false);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.strokeStyle = '#1C1A17';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(0, dy);
        ctx.lineTo(doorWidth, dy);
        ctx.stroke();
      }
    } else if (wall === 'right') {
      if (isOutward) {
        // Outward swing (+X)
        ctx.beginPath();
        ctx.arc(roomWidth, dy, doorWidth, 0, Math.PI / 2, false);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.strokeStyle = '#1C1A17';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(roomWidth, dy);
        ctx.lineTo(roomWidth + doorWidth, dy);
        ctx.stroke();
      } else {
        // Inward swing (-X)
        ctx.beginPath();
        ctx.arc(roomWidth, dy, doorWidth, Math.PI / 2, Math.PI, false);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.strokeStyle = '#1C1A17';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(roomWidth, dy);
        ctx.lineTo(roomWidth - doorWidth, dy);
        ctx.stroke();
      }
    }
    ctx.restore();
  });

  // 7. Placed Furniture Pieces
  const placed = room.placedFurniture || [];
  placed.forEach((item) => {
    const def = getFurnitureType(item.furnitureTypeId);
    if (!def) return;

    const w = def.widthCm;
    const d = def.depthCm;
    const rot = ((item.rotationDeg || 0) * Math.PI) / 180;

    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate(rot);

    // Furniture body fill
    ctx.fillStyle = def.color || '#C4B8A5';
    ctx.strokeStyle = '#1C1A17';
    ctx.lineWidth = 1.6;

    // Rounded rectangle
    const rx = -w / 2;
    const ry = -d / 2;
    const radius = 3;

    ctx.beginPath();
    ctx.moveTo(rx + radius, ry);
    ctx.lineTo(rx + w - radius, ry);
    ctx.quadraticCurveTo(rx + w, ry, rx + w, ry + radius);
    ctx.lineTo(rx + w, ry + d - radius);
    ctx.quadraticCurveTo(rx + w, ry + d, rx + w - radius, ry + d);
    ctx.lineTo(rx + radius, ry + d);
    ctx.quadraticCurveTo(rx, ry + d, rx, ry + d - radius);
    ctx.lineTo(rx, ry + radius);
    ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner upholstery / surface detail
    if (def.shapeType === 'rug') {
      const b1 = Math.min(18, w * 0.08);
      const b2 = Math.min(28, w * 0.12);
      const medR = Math.min(w, d) * 0.22;
      // Traditional double border
      ctx.fillStyle = def.accentColor || '#1B2A4A';
      ctx.fillRect(rx + b1, ry + b1, w - b1 * 2, d - b1 * 2);
      ctx.fillStyle = def.color || '#8B1E1E';
      ctx.fillRect(rx + b2, ry + b2, w - b2 * 2, d - b2 * 2);
      // Center Medallion
      ctx.beginPath();
      ctx.arc(0, 0, medR, 0, Math.PI * 2);
      ctx.fillStyle = def.accentColor || '#1B2A4A';
      ctx.fill();
      ctx.strokeStyle = def.subColor || '#D4A359';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (def.shapeType === 'rug-runner') {
      const b1 = Math.min(10, w * 0.12);
      ctx.fillStyle = def.subColor || '#C49746';
      ctx.fillRect(rx + b1, ry + b1, w - b1 * 2, d - b1 * 2);
      ctx.fillStyle = def.color || '#1E2D42';
      ctx.fillRect(rx + b1 + 3, ry + b1 + 3, w - (b1 + 3) * 2, d - (b1 + 3) * 2);
    } else {
      ctx.fillStyle = def.fabricColor || 'rgba(255, 255, 255, 0.45)';
      ctx.fillRect(rx + 4, ry + 4, w - 8, d - 8);
    }

    ctx.restore();
  });

  // 7b. Smart Architectural Label Placement (Avoids overlaps, adds leader lines for small items)
  // Track occupied text label bounding boxes to guarantee zero text-on-text overlap
  const placedLabelBoxes = [];

  const isBoxOverlapping = (b1, b2, pad = 3) => {
    return !(
      b1.x + b1.w + pad < b2.x ||
      b2.x + b2.w + pad < b1.x ||
      b1.y + b1.h + pad < b2.y ||
      b2.y + b2.h + pad < b1.y
    );
  };

  ctx.font = '600 8.5px "Space Grotesk", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  placed.forEach((item) => {
    const def = getFurnitureType(item.furnitureTypeId);
    if (!def) return;

    // Skip text label on rugs to keep traditional decorative mandala / runner patterns pristine
    if (def.shapeType === 'rug' || def.shapeType === 'rug-runner') {
      return;
    }

    const text = def.name;
    const textMetrics = ctx.measureText(text);
    const textW = textMetrics.width;
    const textH = 10;

    const w = def.widthCm;
    const d = def.depthCm;
    const rot = ((item.rotationDeg || 0) * Math.PI) / 180;

    // Check if piece is large enough to comfortably fit text inside with margin
    const minInnerDim = Math.min(w, d);
    const fitsInside = textW <= w - 16 && textH <= d - 12 && minInnerDim >= 55;

    // Candidate 1: Inside center
    const centerBox = {
      x: item.x - textW / 2,
      y: item.y - textH / 2,
      w: textW,
      h: textH,
    };

    let placedPos = null;

    if (fitsInside) {
      // Check if center collides with any already placed label
      const hasConflict = placedLabelBoxes.some((box) => isBoxOverlapping(centerBox, box));
      if (!hasConflict) {
        placedPos = {
          x: item.x,
          y: item.y,
          box: centerBox,
          isInside: true,
        };
      }
    }

    // Candidate 2: Offset outside shape with a clean leader line
    if (!placedPos) {
      const radius = Math.max(w, d) / 2 + 14;
      // Try 8 directional candidate offsets (Top, Bottom, Right, Left, Diagonals)
      const candidateAngles = [
        -Math.PI / 2, // North
        Math.PI / 2,  // South
        0,            // East
        Math.PI,      // West
        -Math.PI / 4, // North-East
        -Math.PI * 0.75, // North-West
        Math.PI / 4,  // South-East
        Math.PI * 0.75, // South-West
      ];

      for (const angle of candidateAngles) {
        const cx = item.x + Math.cos(angle) * radius;
        const cy = item.y + Math.sin(angle) * radius;

        // Ensure label stays reasonably inside or near room boundary
        if (cx - textW / 2 < -15 || cx + textW / 2 > roomWidth + 15) continue;
        if (cy - textH / 2 < -15 || cy + textH / 2 > roomDepth + 15) continue;

        const candBox = {
          x: cx - textW / 2,
          y: cy - textH / 2,
          w: textW,
          h: textH,
        };

        const hasConflict = placedLabelBoxes.some((box) => isBoxOverlapping(candBox, box, 4));
        if (!hasConflict) {
          placedPos = {
            x: cx,
            y: cy,
            box: candBox,
            isInside: false,
            anchorX: item.x,
            anchorY: item.y,
          };
          break;
        }
      }
    }

    if (placedPos) {
      placedLabelBoxes.push(placedPos.box);

      if (!placedPos.isInside) {
        // Draw subtle architectural leader line from item center to label pill
        ctx.save();
        ctx.strokeStyle = '#8C8275';
        ctx.lineWidth = 0.8;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(placedPos.anchorX, placedPos.anchorY);
        ctx.lineTo(placedPos.x, placedPos.y);
        ctx.stroke();

        // Small leader line anchor dot on the item
        ctx.setLineDash([]);
        ctx.fillStyle = '#8C8275';
        ctx.beginPath();
        ctx.arc(placedPos.anchorX, placedPos.anchorY, 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Pill background behind offset label for maximum readability
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.strokeStyle = '#D4CEBF';
        ctx.lineWidth = 0.75;
        const padX = 5;
        const padY = 2.5;
        ctx.beginPath();
        ctx.roundRect(
          placedPos.box.x - padX,
          placedPos.box.y - padY,
          placedPos.box.w + padX * 2,
          placedPos.box.h + padY * 2,
          3
        );
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // Draw crisp label text
      ctx.fillStyle = '#1C1A17';
      ctx.fillText(text, placedPos.x, placedPos.y);
    }
  });

  // 8. Architectural Dimension Strings
  ctx.font = '500 11px "Space Grotesk", sans-serif';
  ctx.fillStyle = '#5E5A52';
  ctx.strokeStyle = '#5E5A52';
  ctx.lineWidth = 1;

  // Horizontal dimension along top
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(roomWidth, -18);
  ctx.moveTo(0, -23);
  ctx.lineTo(0, -13);
  ctx.moveTo(roomWidth, -23);
  ctx.lineTo(roomWidth, -13);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`${(roomWidth / 100).toFixed(2)} m (${roomWidth} cm)`, roomWidth / 2, -22);

  // Vertical dimension along left
  ctx.beginPath();
  ctx.moveTo(-18, 0);
  ctx.lineTo(-18, roomDepth);
  ctx.moveTo(-23, 0);
  ctx.lineTo(-13, 0);
  ctx.moveTo(-23, roomDepth);
  ctx.lineTo(-13, roomDepth);
  ctx.stroke();

  ctx.save();
  ctx.translate(-24, roomDepth / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`${(roomDepth / 100).toFixed(2)} m (${roomDepth} cm)`, 0, 0);
  ctx.restore();

  // 9. Title block in bottom right corner
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.font = '600 14px "Fraunces", Georgia, serif';
  ctx.fillStyle = '#1C1A17';
  ctx.fillText(room.name || 'Floor Plan', roomWidth, roomDepth + 32);

  ctx.font = '400 9.5px "Space Grotesk", sans-serif';
  ctx.fillStyle = '#78736B';
  ctx.fillText(
    `${(roomWidth / 100).toFixed(2)}m × ${(roomDepth / 100).toFixed(2)}m · Scale 1:50 · Room Layout Planner`,
    roomWidth,
    roomDepth + 44
  );

  ctx.restore();

  // Trigger download as PNG
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(false);
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeRoomName = (room.name || 'Room')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_');
      link.download = `${safeRoomName}-floorplan.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      resolve(true);
    }, 'image/png');
  });
}


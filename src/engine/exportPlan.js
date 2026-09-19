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

    if (wall === 'bottom') {
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
    } else if (wall === 'top') {
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
    } else if (wall === 'left') {
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
    } else if (wall === 'right') {
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
    ctx.fillStyle = def.fabricColor || 'rgba(255, 255, 255, 0.45)';
    ctx.fillRect(rx + 4, ry + 4, w - 8, d - 8);

    // Name label
    ctx.fillStyle = '#1C1A17';
    ctx.font = '600 9px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.name, 0, 0);

    ctx.restore();
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

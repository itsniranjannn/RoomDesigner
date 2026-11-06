/**
 * testPhotos.js
 * Synthetic "product photos" drawn straight into RGBA arrays (no canvas, no files), for tests that run
 * the photo pipeline end to end: a bed, a sofa and an armchair, each as front, side, top and
 * three-quarter pictures on a white backdrop, plus a multi-view sheet. Shapes are plain, but they have
 * the outline of the real thing (a tall narrow headboard over a wide low body, arms either side of a seat).
 */

/** A drawing surface: white backdrop with faint noise like a render, and a few fill helpers. */
export function surface(width, height, background = [255, 255, 255]) {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let p = 0; p < width * height; p++) {
    rgba.set([...background, 255], p * 4);
  }
  const put = (x, y, c) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = (Math.floor(y) * width + Math.floor(x)) * 4;
    // A little grain, so a flat colour behaves like a photographed one
    const g = ((Math.floor(x) * 7 + Math.floor(y) * 13) % 5) - 2;
    rgba[i] = c[0] + g;
    rgba[i + 1] = c[1] + g;
    rgba[i + 2] = c[2] + g;
    rgba[i + 3] = 255;
  };
  const api = {
    width,
    height,
    rgba,
    rect(x, y, w, h, c) {
      for (let yy = Math.round(y); yy < Math.round(y + h); yy++)
        for (let xx = Math.round(x); xx < Math.round(x + w); xx++) put(xx, yy, c);
      return api;
    },
    /** Filled polygon from [x, y] points. */
    poly(points, c) {
      const ys = points.map((p) => p[1]);
      for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
        const xs = [];
        for (let i = 0; i < points.length; i++) {
          const [x0, y0] = points[i];
          const [x1, y1] = points[(i + 1) % points.length];
          if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y))
            xs.push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0));
        }
        xs.sort((a, b) => a - b);
        for (let k = 0; k + 1 < xs.length; k += 2)
          for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) put(x, y, c);
      }
      return api;
    },
    ellipse(cx, cy, rx, ry, c) {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
          if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) put(x, y, c);
      return api;
    },
    /** Copies another surface in at (x, y); its white backdrop is copied too (it matches the sheet's). */
    paste(other, x, y) {
      for (let yy = 0; yy < other.height; yy++)
        for (let xx = 0; xx < other.width; xx++) {
          const i = (yy * other.width + xx) * 4;
          const o = ((y + yy) * width + x + xx) * 4;
          if (o < 0 || x + xx >= width || y + yy >= height) continue;
          rgba[o] = other.rgba[i];
          rgba[o + 1] = other.rgba[i + 1];
          rgba[o + 2] = other.rgba[i + 2];
          rgba[o + 3] = 255;
        }
      return api;
    },
  };
  return api;
}

export const BED_COLORS = {
  head: [170, 161, 154],
  base: [172, 163, 156],
  duvet: [112, 104, 98],
  sheet: [236, 235, 233],
  pillow: [246, 245, 243],
};

/**
 * A bed, the way a product sheet shows it: a taupe headboard narrower than the base, white pillows, a white
 * sheet and a dark duvet that hangs over the sides.
 * @param {'front'|'side'|'top'|'threeQuarter'} view
 */
export function bedPhoto(view, colors = BED_COLORS) {
  const { head, base, duvet, sheet, pillow } = colors;
  if (view === 'front') {
    const s = surface(230, 150);
    s.rect(40, 10, 150, 80, head); // headboard, narrower than the bed
    s.rect(52, 62, 52, 22, pillow).rect(110, 62, 52, 22, pillow); // pillows against it
    s.rect(34, 80, 162, 14, sheet);
    s.poly(
      [
        [30, 90],
        [200, 90],
        [206, 132],
        [24, 132],
      ],
      duvet
    );
    s.rect(30, 130, 170, 14, base);
    return s;
  }
  if (view === 'side') {
    const s = surface(290, 150);
    s.rect(8, 10, 24, 132, head); // tall headboard
    s.rect(32, 88, 250, 54, base);
    s.rect(32, 70, 112, 20, sheet);
    s.ellipse(52, 60, 22, 14, pillow).ellipse(74, 66, 24, 12, pillow);
    s.poly(
      [
        [144, 72],
        [282, 90],
        [282, 120],
        [144, 120],
      ],
      duvet
    );
    return s;
  }
  if (view === 'top') {
    const s = surface(190, 214);
    s.rect(8, 6, 174, 22, head); // headboard seen from above, a strip across the top
    s.rect(18, 28, 154, 180, sheet);
    // soft shadows under the pillows and the bolster, as a render has
    s.ellipse(54, 56, 37, 21, [150, 150, 150]).ellipse(140, 56, 37, 21, [150, 150, 150]);
    s.ellipse(95, 86, 27, 13, [150, 150, 150]);
    s.ellipse(52, 52, 36, 20, pillow).ellipse(138, 52, 36, 20, pillow);
    s.ellipse(95, 82, 26, 12, pillow); // bolster in front of them
    s.rect(10, 100, 170, 104, duvet);
    s.rect(14, 204, 162, 8, base);
    return s;
  }
  // three quarters: the headboard stands at the back left, the body runs away to the right
  const s = surface(290, 146);
  s.rect(6, 6, 150, 82, head);
  s.poly(
    [
      [6, 88],
      [156, 70],
      [282, 96],
      [282, 128],
      [24, 140],
      [6, 130],
    ],
    base
  );
  s.poly(
    [
      [40, 86],
      [150, 74],
      [278, 98],
      [150, 118],
    ],
    duvet
  );
  s.ellipse(70, 74, 24, 12, pillow).ellipse(112, 70, 24, 12, pillow);
  return s;
}

export const SOFA_COLORS = { body: [64, 110, 150], cushion: [78, 126, 168], leg: [150, 110, 70] };

/**
 * A three-seat sofa: back and arms the same height, cushions between, slim legs.
 * @param {'front'|'side'|'top'} view
 */
export function sofaPhoto(view, colors = SOFA_COLORS) {
  const { body, cushion, leg } = colors;
  if (view === 'front') {
    const s = surface(260, 110);
    s.rect(18, 8, 224, 50, body); // back
    s.rect(4, 22, 36, 62, body).rect(220, 22, 36, 62, body); // arms
    s.rect(40, 54, 180, 26, cushion);
    s.rect(40, 80, 180, 4, body);
    for (const x of [26, 224]) s.rect(x, 86, 10, 18, leg).rect(x + 10, 86, 1, 1, leg);
    return s;
  }
  if (view === 'side') {
    const s = surface(100, 110);
    s.rect(4, 8, 26, 76, body);
    s.rect(4, 44, 92, 40, body);
    s.rect(30, 38, 62, 12, cushion);
    s.rect(10, 86, 10, 18, leg).rect(78, 86, 10, 18, leg);
    return s;
  }
  const s = surface(240, 110);
  s.rect(4, 4, 232, 30, body).rect(4, 4, 34, 100, body).rect(202, 4, 34, 100, body);
  s.rect(40, 34, 162, 66, cushion);
  return s;
}

export const CHAIR_COLORS = { body: [152, 90, 52], cushion: [168, 112, 70] };

/** An armchair: squarish, with a back and both arms. */
export function armchairPhoto(view, colors = CHAIR_COLORS) {
  const { body, cushion } = colors;
  if (view === 'front') {
    const s = surface(110, 110);
    s.rect(14, 6, 82, 56, body);
    s.rect(4, 36, 24, 58, body).rect(82, 36, 24, 58, body);
    s.rect(24, 58, 62, 24, cushion);
    s.rect(10, 94, 12, 10, [40, 30, 22]).rect(88, 94, 12, 10, [40, 30, 22]);
    return s;
  }
  const s = surface(110, 110);
  s.rect(4, 6, 28, 88, body);
  s.rect(4, 50, 100, 44, body);
  s.rect(32, 44, 66, 12, cushion);
  s.rect(8, 94, 12, 10, [40, 30, 22]).rect(88, 94, 12, 10, [40, 30, 22]);
  return s;
}

/** A dining table seen from the front: a top of the given thickness (px) on four slim legs. */
export function tablePhoto(thickness = 8, top = [190, 150, 105], leg = [120, 85, 55]) {
  const s = surface(240, 130);
  s.rect(6, 12, 228, thickness, top);
  s.rect(16, 12 + thickness, 12, 100 - thickness, leg).rect(
    212,
    12 + thickness,
    12,
    100 - thickness,
    leg
  );
  return s;
}

/**
 * A product sheet: the views of one piece laid out on a white page in two rows, front and side above, the
 * plan view and the three-quarter view below (the layout of a typical bed sheet).
 * @returns {{ rgba: Uint8ClampedArray, width: number, height: number }}
 */
export function productSheet(views, width = 640, height = 470) {
  const s = surface(width, height);
  const [front, side, top, three] = views;
  if (front) s.paste(front, 40, 24);
  if (side) s.paste(side, 330, 24);
  if (top) s.paste(top, 50, 220);
  if (three) s.paste(three, 330, 250);
  return s;
}

/**
 * A photo taken in a room, for the scene cut-out: a lit wall with a picture frame, a darker floor with a rug, and
 * furniture standing on it, plus a plant and a lamp as clutter. `layout` picks what is in the picture: a teal sofa
 * between two copies of an armchair with a gap between them, or a wooden bed with a tall headboard.
 * @param {'sofaAndChairs'|'bedroomBed'} layout
 */
export function lifestyleScene(layout = 'sofaAndChairs') {
  const w = 480;
  const h = 400;
  const s = surface(w, h, [214, 200, 184]);
  s.rect(0, 0, w, 250, [208, 192, 172]);
  s.rect(0, 0, 40, 250, [190, 172, 150]);
  s.rect(170, 40, 120, 90, [90, 78, 70]);
  s.rect(176, 46, 108, 78, [170, 150, 120]);
  s.rect(0, 250, w, 150, [118, 102, 92]);
  s.rect(60, 330, 360, 60, [180, 160, 140]);
  if (layout === 'sofaAndChairs') {
    s.rect(150, 200, 180, 70, [34, 98, 96]);
    s.rect(138, 218, 24, 62, [30, 88, 86]);
    s.rect(318, 218, 24, 62, [30, 88, 86]);
    s.rect(150, 256, 180, 24, [40, 112, 108]);
    s.rect(146, 278, 188, 8, [110, 70, 40]);
    s.rect(150, 286, 8, 20, [90, 56, 30]);
    s.rect(322, 286, 8, 20, [90, 56, 30]);
    const chair = (x) => {
      s.rect(x, 226, 62, 44, [36, 100, 98]);
      s.rect(x - 6, 246, 12, 40, [120, 80, 50]);
      s.rect(x + 56, 246, 12, 40, [120, 80, 50]);
      s.rect(x, 262, 62, 20, [44, 116, 112]);
      s.rect(x - 4, 284, 8, 24, [90, 56, 30]);
      s.rect(x + 58, 284, 8, 24, [90, 56, 30]);
    };
    chair(62);
    chair(358);
    s.ellipse(18, 190, 18, 40, [60, 110, 50]);
    s.rect(14, 190, 8, 70, [100, 70, 40]);
    s.rect(446, 130, 6, 120, [60, 56, 52]);
    s.ellipse(449, 126, 16, 12, [236, 220, 170]);
  } else {
    s.rect(130, 60, 220, 120, [150, 76, 40]);
    s.rect(150, 80, 180, 80, [120, 60, 36]);
    s.rect(140, 160, 200, 40, [232, 226, 214]);
    s.rect(118, 196, 244, 70, [146, 74, 40]);
    s.rect(124, 266, 22, 22, [100, 50, 26]);
    s.rect(334, 266, 22, 22, [100, 50, 26]);
  }
  return s;
}

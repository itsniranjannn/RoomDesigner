/** Minimal PNG decoder (8-bit RGB or RGBA, no interlace) and box downscale, for running the photo pipeline in node. */
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { unzlibSync } = require('fflate');

export function decodePng(file) {
  const b = fs.readFileSync(file);
  let p = 8,
    w = 0,
    h = 0,
    ct = 0,
    bd = 0;
  const idat = [];
  while (p < b.length) {
    const len = b.readUInt32BE(p),
      type = b.toString('ascii', p + 4, p + 8);
    const data = b.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      bd = data[8];
      ct = data[9];
    } else if (type === 'IDAT') idat.push(data);
    p += 12 + len;
  }
  if (bd !== 8 || (ct !== 2 && ct !== 6)) throw new Error('unsupported png');
  const raw = unzlibSync(Buffer.concat(idat));
  const bpp = ct === 6 ? 4 : 3,
    stride = w * bpp;
  const out = new Uint8ClampedArray(w * h * 4);
  let prev = new Uint8Array(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const line = new Uint8Array(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? line[i - bpp] : 0,
        up = prev[i],
        c = i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      if (f === 1) v += a;
      else if (f === 2) v += up;
      else if (f === 3) v += (a + up) >> 1;
      else if (f === 4) {
        const pa = Math.abs(up - c),
          pb = Math.abs(a - c),
          pc = Math.abs(a + up - 2 * c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c;
      }
      line[i] = v & 255;
    }
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      out[o] = line[x * bpp];
      out[o + 1] = line[x * bpp + 1];
      out[o + 2] = line[x * bpp + 2];
      out[o + 3] = bpp === 4 ? line[x * bpp + 3] : 255;
    }
    prev = line;
  }
  return { rgba: out, width: w, height: h };
}

/** box-average downscale to maxDim long side (approximates the canvas resize) */
export function shrink(img, maxDim) {
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  if (scale === 1) return img;
  const w = Math.max(1, Math.round(img.width * scale)),
    h = Math.max(1, Math.round(img.height * scale));
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const y0 = Math.floor(y / scale),
      y1 = Math.max(y0 + 1, Math.min(img.height, Math.floor((y + 1) / scale)));
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor(x / scale),
        x1 = Math.max(x0 + 1, Math.min(img.width, Math.floor((x + 1) / scale)));
      let r = 0,
        g = 0,
        bl = 0,
        n = 0;
      for (let yy = y0; yy < y1; yy++)
        for (let xx = x0; xx < x1; xx++) {
          const i = (yy * img.width + xx) * 4;
          r += img.rgba[i];
          g += img.rgba[i + 1];
          bl += img.rgba[i + 2];
          n++;
        }
      const o = (y * w + x) * 4;
      out[o] = r / n;
      out[o + 1] = g / n;
      out[o + 2] = bl / n;
      out[o + 3] = 255;
    }
  }
  return { rgba: out, width: w, height: h };
}

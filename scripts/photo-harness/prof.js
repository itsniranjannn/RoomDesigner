import { decodePng } from './png.js';
const img = decodePng(process.argv[2]);
const { rgba, width: w, height: h } = img;
const rows = [];
for (let y = 1; y < h; y++) {
  let strong = 0,
    sum = 0;
  for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4,
      j = ((y - 1) * w + x) * 4;
    const d =
      Math.abs(rgba[i] - rgba[j]) +
      Math.abs(rgba[i + 1] - rgba[j + 1]) +
      Math.abs(rgba[i + 2] - rgba[j + 2]);
    sum += d;
    if (d > 60) strong++;
  }
  rows.push([y, (sum / w).toFixed(1), (strong / w).toFixed(2)]);
}
rows.sort((a, b) => b[1] - a[1]);
console.log(
  rows
    .slice(0, 8)
    .map((r) => r.join(':'))
    .join('  ')
);

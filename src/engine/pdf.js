/**
 * pdf.js
 * Minimal single-page PDF writer that embeds one JPEG image (no dependencies).
 */

const enc = new TextEncoder();

/**
 * @param {Uint8Array} jpegBytes - JPEG file bytes
 * @param {number} imgW - image width in px
 * @param {number} imgH - image height in px
 * @param {{ pageWidthPt: number, pageHeightPt: number, drawWidthPt: number, drawHeightPt: number }} [layout]
 *   - a page size and the size the image is drawn at (centred), for true-scale prints
 * @returns {Uint8Array} PDF file bytes (A4 with the orientation chosen from the image aspect by default)
 */
export function jpegToPdf(jpegBytes, imgW, imgH, layout) {
  const landscape = imgW >= imgH;
  const pageW = layout ? layout.pageWidthPt : landscape ? 842 : 595;
  const pageH = layout ? layout.pageHeightPt : landscape ? 595 : 842;
  const margin = 28;
  const fit = Math.min((pageW - margin * 2) / imgW, (pageH - margin * 2) / imgH);
  const drawW = layout ? layout.drawWidthPt : imgW * fit;
  const drawH = layout ? layout.drawHeightPt : imgH * fit;
  const x = (pageW - drawW) / 2;
  const y = (pageH - drawH) / 2;

  const chunks = [];
  const offsets = [];
  let length = 0;
  const push = (data) => {
    const bytes = typeof data === 'string' ? enc.encode(data) : data;
    chunks.push(bytes);
    length += bytes.length;
  };
  const startObject = (n) => {
    offsets[n] = length;
    push(`${n} 0 obj\n`);
  };

  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  startObject(1);
  push('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  startObject(2);
  push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  startObject(3);
  push(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] ` +
      '/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n'
  );
  startObject(4);
  push(
    `<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
  );
  push(jpegBytes);
  push('\nendstream\nendobj\n');

  const content = `q ${drawW.toFixed(2)} 0 0 ${drawH.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /Im0 Do Q`;
  startObject(5);
  push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`);

  const xrefStart = length;
  let xref = 'xref\n0 6\n0000000000 65535 f \n';
  for (let n = 1; n <= 5; n++) xref += `${String(offsets[n]).padStart(10, '0')} 00000 n \n`;
  push(xref);
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`);

  const out = new Uint8Array(length);
  let pos = 0;
  for (const c of chunks) {
    out.set(c, pos);
    pos += c.length;
  }
  return out;
}

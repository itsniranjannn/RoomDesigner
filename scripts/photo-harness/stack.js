import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { decodePng } from './png.js';
const [root, file] = process.argv.slice(2);
const m = await import(pathToFileURL(path.join(root, 'src/engine/stacked.js')).href);
const img = decodePng(file);
console.log(JSON.stringify(m.detectStackedPhotos(img.rgba, img.width, img.height)));

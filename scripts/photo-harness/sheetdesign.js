import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { decodePng, shrink } from './png.js';
const [root, file] = process.argv.slice(2);
const kit = await import(pathToFileURL(path.join(root, 'src/engine/photoTestKit.js')).href);
const img = shrink(decodePng(file), 1800);
const { design } = kit.build(kit.fromSheet(img).photos, { sheet: true });
console.log(design.type, JSON.stringify(design.traits), JSON.stringify(design.palette));

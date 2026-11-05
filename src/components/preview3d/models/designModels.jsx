/**
 * 3D model for photo-made furniture: the type, palette and traits read from the photos
 * (see engine/design.js) drive the same builders the catalog uses, so a piece made from photos has
 * the same materials and detail as a built-in one, and resizing, recolouring and stacking behave alike.
 */
import * as THREE from 'three';
import { Box, Pad, Cyl, Pillow, pillowRestY, shade, clamp, corners } from './shared.jsx';
import { Mattress, Duvet } from './bed.jsx';
import { Upholstered, ChairModel, BarStoolModel, LoungeChairModel } from './seating.jsx';
import {
  LeggedTable,
  TableRoundModel,
  CoffeeTableModel,
  DeskModel,
  NightstandModel,
} from './tables.jsx';
import { WardrobeModel, BookshelfModel, SideboardModel } from './storage.jsx';
import {
  CornerSofaDesign,
  TubChairDesign,
  OttomanDesign,
  DaybedDesign,
  ShelvingDesign,
  SideboardDesign,
  StoolDesign,
  Headboard,
} from './designShapes.jsx';

/** Distance between two hex colours (0-441). */
function colourDistance(a, b) {
  const x = new THREE.Color(a);
  const y = new THREE.Color(b);
  return Math.hypot(x.r - y.r, x.g - y.g, x.b - y.b) * 255;
}

/**
 * Palette for drawing: when the body colour was changed, every slot that was the same material as the body
 * (close to it in colour) follows it, keeping its relative lightness; contrasting slots stay as photographed.
 */
export function effectivePalette(design, mainColor) {
  const base = design.palette.body;
  const out = { ...design.palette };
  if (!mainColor || mainColor.toLowerCase() === base.toLowerCase()) return out;
  const hslOf = (c) => new THREE.Color(c).getHSL({ h: 0, s: 0, l: 0 });
  const baseL = hslOf(base).l;
  out.body = mainColor;
  for (const key of Object.keys(out)) {
    if (key === 'body') continue;
    if (colourDistance(out[key], base) < 70) {
      const dl = hslOf(out[key]).l - baseL;
      out[key] = shade(mainColor, Math.max(-0.3, Math.min(0.3, dl)));
    }
  }
  return out;
}

/** Upholstered platform bed: padded base and tall headboard, mattress, duvet and pillows. */
export function PlatformBedModel({ widthM, depthM, heightM, palette, traits }) {
  const hb = 0.1;
  const legs = !!traits.legs;
  const footH = legs ? 0.1 : 0;
  const mattressH = 0.22;
  const bodyTop = (traits.bodyFrac ?? 0.55) * heightM;
  const frameH = clamp(bodyTop - mattressH - 0.06, 0.16 + footH, 0.45);
  const mattressTop = frameH + mattressH;
  const mattressD = depthM - hb - 0.02;
  const mattressZ = hb / 2 + 0.01;
  const body = palette.body;
  const linen = palette.pillow ? shade(palette.pillow, 0.02) : '#F4F1EA';
  const duvet = palette.accent || '#b8aa98';
  const edge = shade(body, -0.1);
  const n = clamp(Math.round(traits.pillows ?? 2), 1, 4);
  const pillowZ = -depthM / 2 + hb + 0.22;
  const pillowW = Math.min(0.75, (widthM * 0.9) / n - 0.03);
  const sleepers = Array.from({ length: n }, (_, i) => {
    const x = (i - (n - 1) / 2) * (pillowW + 0.04);
    const size = [pillowW, 0.13, 0.4];
    const rotation = [0.22, 0, 0];
    return {
      key: `p${i}`,
      size,
      rotation,
      position: [x, pillowRestY(size, rotation, mattressTop), pillowZ],
    };
  });
  const lumbar = (() => {
    const size = [Math.min(0.55, widthM * 0.3), 0.1, 0.24];
    const rotation = [0.3, 0, 0];
    return {
      size,
      rotation,
      position: [0, pillowRestY(size, rotation, mattressTop), pillowZ + 0.26],
    };
  })();
  return (
    <group>
      {/* Padded base, with a recessed shadow gap above the floor (or short feet) */}
      <Pad
        position={[0, footH + (frameH - footH) / 2 + 0.01, hb / 2]}
        size={[widthM, frameH - footH - 0.02, depthM - hb]}
        radius={0.035}
        color={body}
        roughness={0.92}
      />
      <Box
        position={[0, frameH - 0.03, hb / 2]}
        size={[widthM + 0.004, 0.006, depthM - hb + 0.004]}
        color={edge}
        roughness={0.9}
        castShadow={false}
      />
      {legs ? (
        corners(widthM, depthM, 0.07).map(([x, z], i) => (
          <Cyl
            key={i}
            position={[x, footH / 2, z]}
            radiusTop={0.03}
            radiusBottom={0.02}
            height={footH}
            color={shade(body, -0.3)}
            roughness={0.55}
            segments={12}
          />
        ))
      ) : (
        <Box
          position={[0, 0.02, hb / 2]}
          size={[widthM - 0.1, 0.04, depthM - hb - 0.1]}
          color="#1B1714"
          roughness={0.95}
        />
      )}

      {/* Tall headboard, the full width of the bed, in the style read from the photos */}
      <Headboard
        style={traits.head ?? (traits.channels ? 'channel' : 'panel')}
        widthM={widthM}
        depthM={depthM}
        heightM={heightM}
        footH={footH}
        mattressTop={mattressTop}
        hb={hb}
        body={body}
      />

      <Mattress widthM={widthM} depthM={mattressD} y={frameH} z={mattressZ} fabricColor={linen} />
      <Duvet
        widthM={widthM}
        mattressTop={mattressTop}
        z0={mattressZ - mattressD / 2 + mattressD * 0.4}
        z1={mattressZ + mattressD / 2 - 0.005}
        accentColor={duvet}
        fabricColor={linen}
        throwBlanket={false}
      />
      {sleepers.map((p) => (
        <Pillow
          key={p.key}
          position={p.position}
          size={p.size}
          color={linen}
          rotation={p.rotation}
        />
      ))}
      {n >= 2 && (
        <Pillow
          position={lumbar.position}
          size={lumbar.size}
          color={linen}
          rotation={lumbar.rotation}
        />
      )}
    </group>
  );
}

/** Photo-made piece from its design record: a catalog model parameterised by the photos. */
export function DesignModel({ def, design, widthM, depthM, heightM, mainColor }) {
  const palette = effectivePalette(design, mainColor);
  const traits = design.traits || {};
  const common = {
    def,
    widthM,
    depthM,
    heightM,
    mainColor: palette.body,
    subColor: palette.accent || shade(palette.body, -0.08),
    cushionColor: palette.cushion || palette.body,
    legColor: palette.leg || '#2a2622',
    handleColor: '#C4A869',
  };
  // Leg thickness measured from the photo (a fraction of the width), kept within sensible limits
  const legThick = traits.legFrac ? clamp(traits.legFrac * widthM, 0.03, 0.1) : 0.06;
  const shape = { widthM, depthM, heightM, palette, traits };
  let model;
  switch (design.type) {
    case 'bed':
      model = (
        <PlatformBedModel
          widthM={widthM}
          depthM={depthM}
          heightM={heightM}
          palette={palette}
          traits={traits}
        />
      );
      break;
    case 'sofa':
      model = (
        <Upholstered
          {...common}
          armRatio={traits.arm ?? 0.1}
          seats={traits.seats || 3}
          roughness={0.85}
          scatter={widthM > 1.5}
          roll={!!traits.roll}
          tufted={!!traits.tufted}
          taper={!!traits.taper}
          longSeat={!!traits.longSeat}
        />
      );
      break;
    case 'armchair':
      model = (
        <Upholstered
          {...common}
          armRatio={traits.arm ?? 0.17}
          seats={1}
          seatH={0.42}
          armH={0.58}
          roughness={0.7}
          scatter
          roll={!!traits.roll}
          tufted={!!traits.tufted}
          taper={!!traits.taper}
        />
      );
      break;
    case 'lounge':
      model = (
        <LoungeChairModel
          widthM={widthM}
          depthM={depthM}
          heightM={heightM}
          mainColor={palette.body}
          cushionColor={palette.cushion || palette.body}
          slats={traits.slats || 3}
        />
      );
      break;
    case 'chair':
      model = <ChairModel {...common} backStyle={traits.back || 'slat'} />;
      break;
    case 'stool':
      // Stools read before the seat, back and footrest options existed keep their original look
      model =
        traits.seat === undefined ? (
          <BarStoolModel {...common} />
        ) : (
          <StoolDesign
            widthM={widthM}
            depthM={depthM}
            heightM={heightM}
            palette={palette}
            traits={traits}
          />
        );
      break;
    case 'corner-sofa':
      model = <CornerSofaDesign {...shape} />;
      break;
    case 'tub-chair':
      model = <TubChairDesign {...shape} />;
      break;
    case 'ottoman':
      model = <OttomanDesign {...shape} />;
      break;
    case 'daybed':
      model = <DaybedDesign {...shape} />;
      break;
    case 'etagere':
      model = <ShelvingDesign {...shape} />;
      break;
    case 'table':
      model = (
        <LeggedTable
          widthM={widthM}
          depthM={depthM}
          heightM={heightM}
          topH={0.035}
          topColor={palette.body}
          apronColor={common.subColor}
          legColor={common.legColor}
          legThick={legThick}
          inset={0.07}
          roundLegs={!!traits.roundLegs}
        />
      );
      break;
    case 'table-round':
      model = <TableRoundModel {...common} />;
      break;
    case 'coffee-table':
      model = <CoffeeTableModel {...common} />;
      break;
    case 'desk':
      model = <DeskModel {...common} />;
      break;
    case 'wardrobe':
      model = <WardrobeModel {...common} doors={traits.doors} />;
      break;
    case 'bookshelf':
      model = <BookshelfModel {...common} shelves={traits.shelves} />;
      break;
    case 'nightstand':
      model = <NightstandModel {...common} drawers={traits.drawers || 2} />;
      break;
    default:
      model =
        traits.front === undefined ? (
          <SideboardModel {...common} />
        ) : (
          <SideboardDesign {...shape} />
        );
  }
  return model;
}

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
import {
  ClassicHeadboard,
  SleighFootboard,
  BunFeet,
  ClassicSeat,
  ClassicTable,
} from './classicShapes.jsx';

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

/**
 * Upholstered bed from its design record: headboard (style, width, colour), base (solid, on feet, storage
 * drawers or skirted), footboard, mattress with its sheet, duvet with fold-back and throw, and the pillows
 * (a row or two tiers, with or without a bolster in front).
 */
export function PlatformBedModel({ widthM, depthM, heightM, palette, traits }) {
  const hb = 0.1;
  const legs = !!traits.legs && !traits.skirt;
  const bun = traits.legs === 2 && legs;
  const footH = legs ? (bun ? 0.13 : 0.1) : 0;
  const classicHead = !!traits.crest || !!traits.framed;
  const mattressH = 0.22;
  const bodyTop = (traits.bodyFrac ?? 0.55) * heightM;
  const frameH = clamp(bodyTop - mattressH - 0.06, 0.16 + footH, 0.45);
  const mattressTop = frameH + mattressH;
  const footboard = !!traits.foot;
  const sleigh = traits.foot === 2;
  const footT = footboard ? (sleigh ? 0.09 : 0.06) : 0;
  const mattressD = depthM - hb - 0.02 - footT;
  const mattressZ = hb / 2 + 0.01 - footT / 2;
  const head = palette.body;
  const base = palette.base || head;
  const pillowColor = palette.pillow ? shade(palette.pillow, 0.02) : '#F4F1EA';
  const sheet = palette.sheet || pillowColor;
  const duvet = palette.accent || '#b8aa98';
  const edge = shade(base, -0.1);
  const n = clamp(Math.round(traits.pillows ?? 2), 1, 4);
  const lumbarOn = traits.lumbar === undefined ? n >= 2 : !!traits.lumbar;
  const tiers = !!traits.tiers;
  const headWidth = widthM * clamp(traits.headW ?? 1, 0.7, 1.15);
  const pillowZ = -depthM / 2 + hb + (tiers ? 0.26 : 0.22);
  const pillowW = Math.min(0.75, (widthM * 0.9) / n - 0.03);
  const lay = (key, size, rotation, x, z) => ({
    key,
    size,
    rotation,
    position: [x, pillowRestY(size, rotation, mattressTop), z],
  });
  const back = Array.from({ length: n }, (_, i) => {
    const x = (i - (n - 1) / 2) * (pillowW + 0.04);
    // Two tiers: the back row stands up as square euro pillows
    return tiers
      ? lay(`p${i}`, [pillowW * 0.92, 0.16, 0.5], [0.5, 0, 0], x, pillowZ)
      : lay(`p${i}`, [pillowW, 0.13, 0.4], [0.22, 0, 0], x, pillowZ);
  });
  const front = tiers
    ? Array.from({ length: n }, (_, i) =>
        lay(
          `f${i}`,
          [pillowW * 0.78, 0.11, 0.3],
          [0.2, 0, 0],
          (i - (n - 1) / 2) * (pillowW * 0.78 + 0.05),
          pillowZ + 0.32
        )
      )
    : [];
  const lumbar = lay(
    'lumbar',
    [Math.min(0.55, widthM * 0.3), 0.1, 0.24],
    [0.3, 0, 0],
    0,
    pillowZ + (tiers ? 0.55 : 0.26)
  );
  const sideLen = depthM - hb - footT;
  const baseZ = hb / 2 - footT / 2;
  return (
    <group>
      {/* Padded base, with a recessed shadow gap above the floor (or short feet) */}
      <Pad
        position={[0, footH + (frameH - footH) / 2 + 0.01, baseZ]}
        size={[widthM, frameH - footH - 0.02, sideLen]}
        radius={0.035}
        color={base}
        roughness={0.92}
      />
      <Box
        position={[0, frameH - 0.03, baseZ]}
        size={[widthM + 0.004, 0.006, sideLen + 0.004]}
        color={edge}
        roughness={0.9}
        castShadow={false}
      />
      {bun ? (
        <BunFeet widthM={widthM} depthM={depthM} color={shade(base, -0.05)} radius={0.065} />
      ) : legs ? (
        corners(widthM, depthM, 0.07).map(([x, z], i) => (
          <Cyl
            key={i}
            position={[x, footH / 2, z]}
            radiusTop={0.03}
            radiusBottom={0.02}
            height={footH}
            color={shade(base, -0.3)}
            roughness={0.55}
            segments={12}
          />
        ))
      ) : traits.skirt ? (
        <BedSkirt widthM={widthM} depthM={sideLen} z={baseZ} height={frameH} color={base} />
      ) : (
        <Box
          position={[0, 0.02, baseZ]}
          size={[widthM - 0.1, 0.04, sideLen - 0.1]}
          color="#1B1714"
          roughness={0.95}
        />
      )}
      {traits.store && !traits.skirt && (
        <StorageDrawers
          widthM={widthM}
          depthM={sideLen}
          z={baseZ}
          frameH={frameH}
          footH={footH}
          color={base}
        />
      )}

      {/* Tall headboard in the style, width and colour read from the photos */}
      {classicHead ? (
        <ClassicHeadboard
          widthM={headWidth}
          depthM={depthM}
          heightM={heightM}
          footH={footH}
          mattressTop={mattressTop}
          hb={hb}
          wood={head}
          panel={palette.panel || shade(head, -0.18)}
          crest={traits.crest || 0}
          tufted={traits.head === 'tufted'}
          framed={!!traits.framed}
        />
      ) : (
        <Headboard
          style={traits.head ?? (traits.channels ? 'channel' : 'panel')}
          widthM={headWidth}
          depthM={depthM}
          heightM={heightM}
          footH={footH}
          mattressTop={mattressTop}
          hb={hb}
          body={head}
        />
      )}
      {footboard && sleigh && (
        <SleighFootboard
          widthM={widthM + 0.02}
          z={depthM / 2 - footT / 2}
          footH={footH}
          topY={mattressTop + 0.14}
          thick={footT}
          wood={base}
        />
      )}
      {footboard && !sleigh && (
        <Pad
          position={[0, footH + (mattressTop + 0.1 - footH) / 2, depthM / 2 - footT / 2]}
          size={[widthM + 0.02, mattressTop + 0.1 - footH, footT]}
          radius={0.03}
          color={head}
          roughness={0.92}
        />
      )}

      <Mattress widthM={widthM} depthM={mattressD} y={frameH} z={mattressZ} fabricColor={sheet} />
      <Duvet
        widthM={widthM}
        mattressTop={mattressTop}
        z0={mattressZ - mattressD / 2 + mattressD * 0.4}
        z1={mattressZ + mattressD / 2 - 0.005}
        accentColor={duvet}
        fabricColor={sheet}
        throwBlanket={!!traits.throw}
        fold={traits.fold !== 0}
      />
      {[...back, ...front].map((p) => (
        <Pillow
          key={p.key}
          position={p.position}
          size={p.size}
          color={pillowColor}
          rotation={p.rotation}
        />
      ))}
      {lumbarOn && (
        <Pillow
          position={lumbar.position}
          size={lumbar.size}
          color={pillowColor}
          rotation={lumbar.rotation}
        />
      )}
    </group>
  );
}

/** A skirt of gathered fabric hanging from the mattress base to the floor, with its pleats. */
function BedSkirt({ widthM, depthM, z, height, color }) {
  const line = shade(color, -0.12);
  const pleatsX = Math.max(4, Math.round(widthM / 0.16));
  const pleatsZ = Math.max(6, Math.round(depthM / 0.16));
  return (
    <group name="bed-skirt">
      <Box
        position={[0, height / 2 - 0.01, z]}
        size={[widthM + 0.02, height - 0.02, depthM + 0.02]}
        color={color}
        roughness={0.98}
      />
      {Array.from({ length: pleatsX - 1 }).map((_, i) => (
        <Box
          key={`f${i}`}
          position={[
            -widthM / 2 + (widthM * (i + 1)) / pleatsX,
            height / 2 - 0.01,
            z + depthM / 2 + 0.012,
          ]}
          size={[0.006, height - 0.04, 0.004]}
          color={line}
          castShadow={false}
        />
      ))}
      {[-1, 1].flatMap((s) =>
        Array.from({ length: pleatsZ - 1 }).map((_, i) => (
          <Box
            key={`s${s}-${i}`}
            position={[
              (s * (widthM + 0.02)) / 2 + s * 0.002,
              height / 2 - 0.01,
              z - depthM / 2 + (depthM * (i + 1)) / pleatsZ,
            ]}
            size={[0.004, height - 0.04, 0.006]}
            color={line}
            castShadow={false}
          />
        ))
      )}
    </group>
  );
}

/** Drawer fronts with pulls along both sides of the base (storage bed). */
function StorageDrawers({ widthM, depthM, z, frameH, footH, color }) {
  const h = Math.max(0.08, frameH - footH - 0.1);
  const len = depthM * 0.4;
  const groove = shade(color, -0.2);
  return (
    <group name="bed-drawers">
      {[-1, 1].flatMap((s) =>
        [-1, 1].map((k) => (
          <group
            key={`${s}${k}`}
            position={[(s * widthM) / 2, footH + frameH / 2 - 0.02, z + k * depthM * 0.23]}
          >
            <Box
              position={[s * 0.003, 0, 0]}
              size={[0.008, h, len]}
              color={shade(color, 0.04)}
              castShadow={false}
            />
            <Box
              position={[s * 0.006, 0, 0]}
              size={[0.004, 0.012, len * 0.35]}
              color="#C4A869"
              castShadow={false}
            />
            <Box
              position={[s * 0.004, -h / 2 - 0.004, 0]}
              size={[0.006, 0.004, len]}
              color={groove}
              castShadow={false}
            />
          </group>
        ))
      )}
    </group>
  );
}

/** Props for the classic (exposed-frame) seat from a sofa or armchair record. */
function classicSeat(palette, traits, widthM, depthM, heightM, defaultSeats) {
  const armchair = defaultSeats === 1;
  return {
    widthM,
    depthM,
    heightM,
    seats: traits.seats || defaultSeats,
    armRatio: traits.arm ?? (armchair ? 0.17 : 0.1),
    wood: palette.frame || palette.leg || '#4b2e1b',
    fabric: palette.body,
    cushion: palette.cushion || palette.body,
    trim: traits.trim ? palette.trim || '#c9a24a' : null,
    scatterColor: palette.scatter || shade(palette.cushion || palette.body, 0.1),
    scatter: traits.scat ?? (armchair ? 1 : widthM > 1.5 ? 2 : 0),
    frame: traits.frame || 1,
    legs: traits.cab ? 'cabriole' : 'tapered',
    cane: !!traits.cane,
    roll: !!traits.roll,
    tufted: !!traits.tufted,
    pattern: !!traits.pat,
    seatH: armchair ? 0.42 : 0.44,
    armH: armchair ? 0.58 : 0.62,
  };
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
    armColor: palette.arm || palette.body,
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
      model =
        traits.frame || traits.cane ? (
          <ClassicSeat {...classicSeat(palette, traits, widthM, depthM, heightM, 3)} />
        ) : (
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
      model =
        traits.frame || traits.cane ? (
          <ClassicSeat {...classicSeat(palette, traits, widthM, depthM, heightM, 1)} />
        ) : (
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
          topH={(traits.topH ?? 3.5) / 100}
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
      model =
        traits.trim || traits.cab ? (
          <ClassicTable
            widthM={widthM}
            depthM={depthM}
            heightM={heightM}
            topColor={palette.body}
            wood={palette.frame || shade(palette.body, -0.08)}
            trim={palette.trim}
            legs={traits.cab ? 'cabriole' : 'turned'}
          />
        ) : (
          <CoffeeTableModel {...common} />
        );
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

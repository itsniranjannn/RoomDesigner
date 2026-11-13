/**
 * 3D model for photo-made furniture: the type, palette and traits read from the photos
 * (see engine/design.js) drive the same builders the catalog uses, so a piece made from photos has
 * the same materials and detail as a built-in one, and resizing, recolouring and stacking behave alike.
 */
import { Box, Pad, Cyl, Pillow, pillowRestY, shade, clamp, corners } from './shared.jsx';
import { Mattress, Duvet } from './bed.jsx';
import { Upholstered, ChairModel, BarStoolModel, LoungeChairModel } from './seating.jsx';
import { ChannelSeat } from './channelSeat.jsx';
import {
  LeggedTable,
  TableRoundModel,
  CoffeeTableModel,
  DeskModel,
  NightstandModel,
} from './tables.jsx';
import { WardrobeModel, BookshelfModel, SideboardModel } from './storage.jsx';
import { WardrobeDesign, DeskDesign } from './designCasework.jsx';
import {
  CornerSofaDesign,
  TubChairDesign,
  OttomanDesign,
  DaybedDesign,
  ShelvingDesign,
  SideboardDesign,
  StoolDesign,
  Headboard,
  metalFinish,
} from './designShapes.jsx';
import {
  CASTER_H,
  MetalBedFrame,
  GuardRails,
  Caster,
  postCorners,
  BedBaseDrawers,
  metalFrameLevels,
} from './metalBed.jsx';
import {
  ClassicHeadboard,
  SleighFootboard,
  BunFeet,
  ClassicSeat,
  ClassicTable,
} from './classicShapes.jsx';
import { effectivePalette, colourDistance } from './designPalette.js';
import { deskLegThick } from './designLayout.js';

// One recolour rule for the 3D models and the plan symbols
export { effectivePalette };

/**
 * Bed from its design record: headboard (style, width, colour), base (solid, on feet, storage drawers or
 * skirted), footboard, mattress with its sheet, duvet with fold-back and throw, and the pillows (a row or two
 * tiers, with or without a bolster in front). A tube metal bed has bent head and foot rails with spindles
 * instead of the upholstered headboard and base; guard rails and castors can go on either kind.
 */
export function PlatformBedModel({ widthM, depthM, heightM, palette, traits, photo = palette }) {
  const metal = !!traits.metal;
  const hb = metal ? 0.05 : 0.1;
  const legs = !metal && !!traits.legs && !traits.skirt;
  const bun = traits.legs === 2 && legs;
  // Castors lift the whole bed; a skirt down to the floor would hide them, so it has none
  const casterH = traits.casters && (metal || !traits.skirt) ? CASTER_H : 0;
  const legH = legs ? (bun ? 0.13 : 0.1) : 0;
  const footH = legH + casterH;
  const classicHead = !!traits.crest || !!traits.framed;
  const mattressH = 0.22;
  const bodyTop = (traits.bodyFrac ?? 0.55) * heightM;
  const frameH = clamp(bodyTop - mattressH - 0.06, 0.16 + footH, 0.45);
  const mattressTop = frameH + mattressH;
  const footboard = !!traits.foot;
  const sleigh = traits.foot === 2;
  const footT = metal ? 0.04 : footboard ? (sleigh ? 0.09 : 0.06) : 0;
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
  // Storage drawers sit flush in a base a little narrower than the mattress, so their pulls stay inside
  const store = !metal && !!traits.store && !traits.skirt;
  const baseW = store ? widthM - 0.06 : widthM;
  // A tube frame has a box spring when the photographed headboard colour is clearly not the metal's; a recolour
  // repaints it but never adds or removes it (the photographed palette decides)
  const fabricBase = metal && !!photo.base && colourDistance(photo.body, photo.base) > 60;
  const levels = metalFrameLevels(frameH, fabricBase);
  // With guard rails the duvet is tucked in clear of the rail posts; on a tube frame it hangs inside the posts
  const duvetW = traits.rails ? widthM - 0.06 : metal ? widthM - 0.03 : widthM;
  const legsAndFeet = bun ? (
    <BunFeet widthM={widthM} depthM={depthM} color={shade(base, -0.05)} radius={0.065} />
  ) : legs ? (
    corners(widthM, depthM, 0.07).map(([x, z], i) => (
      <Cyl
        key={i}
        position={[x, legH / 2, z]}
        radiusTop={0.03}
        radiusBottom={0.02}
        height={legH}
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
  );
  const casterFinish = metalFinish(metal ? base : '#9a9c9e');
  return (
    <group>
      {metal ? (
        <MetalBedFrame
          widthM={widthM}
          depthM={depthM}
          heightM={heightM}
          frameH={frameH}
          mattressTop={mattressTop}
          footTop={footboard ? Math.max(mattressTop + 0.2, heightM * 0.82) : mattressTop + 0.16}
          bottom={casterH}
          color={base}
          fabric={fabricBase ? head : null}
        />
      ) : (
        <>
          {/* Padded base, with a recessed shadow gap above the floor (or short feet) */}
          <Pad
            position={[0, footH + (frameH - footH) / 2 + 0.01, baseZ]}
            size={[baseW, frameH - footH - 0.02, sideLen]}
            radius={0.035}
            color={base}
            roughness={0.92}
          />
          <Box
            position={[0, frameH - 0.03, baseZ]}
            size={[baseW + 0.004, 0.006, sideLen + 0.004]}
            color={edge}
            roughness={0.9}
            castShadow={false}
          />
          {casterH ? <group position={[0, casterH, 0]}>{legsAndFeet}</group> : legsAndFeet}
          {store && (
            <BedBaseDrawers
              faceX={widthM / 2 - 0.022}
              depthM={sideLen}
              z={baseZ}
              y0={footH + 0.03}
              y1={frameH - 0.045}
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
        </>
      )}
      {casterH > 0 &&
        (metal ? postCorners(widthM, depthM) : corners(widthM, depthM, 0.07)).map(([x, z], i) => (
          <Caster key={i} x={x} z={z} finish={casterFinish} />
        ))}
      {traits.rails && (
        <GuardRails
          widthM={widthM}
          depthM={depthM}
          mattressTop={mattressTop}
          base={metal ? levels.sideY : frameH - 0.05}
          color={base}
        />
      )}

      <Mattress widthM={widthM} depthM={mattressD} y={frameH} z={mattressZ} fabricColor={sheet} />
      <Duvet
        widthM={duvetW}
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
    scatterColor: palette.scatter || shade(palette.cushion || palette.body, 0.05),
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

/** Wardrobe details that only the photo-made wardrobe draws; without any of them it is the catalog one. */
const WARDROBE_TRAITS = ['mirror', 'drawers', 'handle', 'upper', 'niche', 'fluted'];

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
          photo={design.palette}
          traits={traits}
        />
      );
      break;
    case 'sofa':
      model =
        traits.frame || traits.cane ? (
          <ClassicSeat {...classicSeat(palette, traits, widthM, depthM, heightM, 3)} />
        ) : traits.chan ? (
          <ChannelSeat
            {...common}
            armRatio={traits.arm ?? 0.1}
            seats={traits.seats || 3}
            longSeat={!!traits.longSeat}
            step={!!traits.step}
            taper={!!traits.taper}
          />
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
            stepArms={!!traits.step}
          />
        );
      break;
    case 'armchair':
      model =
        traits.frame || traits.cane ? (
          <ClassicSeat {...classicSeat(palette, traits, widthM, depthM, heightM, 1)} />
        ) : traits.chan ? (
          <ChannelSeat
            {...common}
            armRatio={traits.arm ?? 0.17}
            seats={1}
            seatH={0.42}
            armH={0.58}
            taper={!!traits.taper}
          />
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
      // Desks read before pedestals, sled or panel ends and modesty panels keep the catalog desk
      model =
        traits.ped || traits.base || traits.modesty ? (
          <DeskDesign {...shape} legThick={deskLegThick(widthM, traits)} />
        ) : (
          <DeskModel {...common} />
        );
      break;
    case 'wardrobe':
      model =
        WARDROBE_TRAITS.some((k) => traits[k]) || palette.door || palette.trim ? (
          <WardrobeDesign {...shape} />
        ) : (
          <WardrobeModel {...common} doors={traits.doors} />
        );
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

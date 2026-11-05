/** 3D models: storage. Built from Three.js primitives; origin on the floor, centered on the footprint. */
import React from 'react';
import * as THREE from 'three';
import {
  Box,
  Cyl,
  Pad,
  Ball,
  Pull,
  Doors,
  Drawers,
  GlassPane,
  CHROME,
  STEEL,
  BRASS,
  BLACK_PLASTIC,
  DARK_GAP,
  clamp,
  shade,
} from './shared.jsx';

const MIRROR = { color: '#DCEBF0', roughness: 0.06, metalness: 0.45 };

/** Deterministic pseudo-random sequence so shelves look varied but never change between renders. */
function sequence(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const BOOK_COLORS = [
  '#8B2635',
  '#22485E',
  '#C49746',
  '#4A5D52',
  '#5C3A5A',
  '#D9CDB4',
  '#B5532F',
  '#2E3B4A',
];

/** Row of upright books between x0 and x1 standing on a shelf at y. */
function BookRow({ x0, x1, y, depth, seed, maxH = 0.28 }) {
  const rand = sequence(seed);
  const books = [];
  let x = x0;
  let i = 0;
  while (x < x1 - 0.03 && i < 13) {
    const t = 0.018 + rand() * 0.026;
    const h = clamp(maxH * (0.6 + rand() * 0.4), 0.1, maxH);
    books.push({ x: x + t / 2, t, h, c: BOOK_COLORS[Math.floor(rand() * BOOK_COLORS.length)] });
    x += t + 0.002;
    i += 1;
  }
  return (
    <group name="books">
      {books.map((b, k) => (
        <group key={k}>
          <Box
            position={[b.x, y + b.h / 2, 0.01]}
            size={[b.t, b.h, depth * 0.68]}
            color={b.c}
            roughness={0.75}
          />
        </group>
      ))}
    </group>
  );
}

export function WardrobeModel({ widthM, depthM, heightM, mainColor, handleColor, doors }) {
  const plinthH = 0.08;
  const numDoors = doors ? clamp(Math.round(doors), 1, 6) : clamp(Math.round(widthM / 0.62), 2, 6);
  const loft = heightM > 2.2;
  const lowTop = loft ? heightM - 0.42 : heightM - 0.05;
  const mirrored = widthM > 1.5;
  const mirrorIdx = Math.floor(numDoors / 2);
  const dw = (widthM - 0.04) / numDoors;
  const trim = shade(mainColor, 0.02);
  return (
    <group>
      {/* Recessed plinth, carcass and a crown moulding */}
      <Box
        position={[0, plinthH / 2, 0]}
        size={[widthM * 0.96, plinthH, depthM * 0.94]}
        color="#2B2117"
        roughness={0.85}
      />
      <Box
        position={[0, plinthH + (heightM - plinthH) / 2, 0]}
        size={[widthM, heightM - plinthH, depthM]}
        color={mainColor}
        roughness={0.7}
      />
      <Box
        position={[0, heightM - 0.017, 0.005]}
        size={[widthM + 0.025, 0.04, depthM + 0.02]}
        color={trim}
        roughness={0.6}
      />
      <Box
        position={[0, heightM - 0.048, 0.01]}
        size={[widthM + 0.005, 0.016, depthM + 0.02]}
        color={shade(mainColor, -0.04)}
        roughness={0.6}
      />
      {/* Floor-to-ceiling-height doors with inset panels, long brass bar pulls and hinges */}
      <Doors
        width={widthM - 0.04}
        height={lowTop - plinthH - 0.02}
        y={plinthH + 0.01}
        z={depthM / 2}
        count={numDoors}
        color={mainColor}
        handleColor={handleColor}
        handleY={Math.min(1.05, heightM * 0.5)}
      />
      {loft && (
        <Doors
          width={widthM - 0.04}
          height={0.34}
          y={lowTop + 0.02}
          z={depthM / 2}
          count={numDoors}
          color={mainColor}
          handleColor={handleColor}
          handle="knob"
          handleY={lowTop + 0.06}
          hinges={false}
        />
      )}
      {mirrored && (
        <group name="wardrobe-mirror">
          <Box
            position={[
              -widthM / 2 + 0.02 + dw * (mirrorIdx + 0.5),
              plinthH + 0.01 + (lowTop - plinthH - 0.02) / 2,
              depthM / 2 + 0.0225,
            ]}
            size={[dw - 0.09, lowTop - plinthH - 0.12, 0.004]}
            {...MIRROR}
            castShadow={false}
          />
          <Box
            position={[
              -widthM / 2 + 0.02 + dw * (mirrorIdx + 0.5),
              plinthH + 0.01 + (lowTop - plinthH - 0.02) / 2,
              depthM / 2 + 0.021,
            ]}
            size={[dw - 0.07, lowTop - plinthH - 0.1, 0.002]}
            {...BRASS}
            color={handleColor}
            castShadow={false}
          />
        </group>
      )}
    </group>
  );
}

export function BookshelfModel({ widthM, depthM, heightM, mainColor, shelves }) {
  const frameThick = 0.03;
  const kick = 0.07;
  const numShelves = shelves
    ? clamp(Math.round(shelves), 2, 8)
    : clamp(Math.round(heightM / 0.36), 3, 6);
  const gap = (heightM - kick - frameThick) / numShelves;
  const shelfW = widthM - frameThick * 2;
  const back = '#3D2A1C';
  return (
    <group>
      {[-1, 1].map((s) => (
        <Box
          key={s}
          position={[(s * (widthM - frameThick)) / 2, heightM / 2, 0]}
          size={[frameThick, heightM, depthM]}
          color={mainColor}
          roughness={0.65}
        />
      ))}
      <Box
        position={[0, heightM / 2, -depthM / 2 + 0.008]}
        size={[shelfW, heightM - 0.004, 0.012]}
        color={back}
        roughness={0.85}
      />
      <Box
        position={[0, kick / 2, depthM / 2 - 0.03]}
        size={[shelfW, kick, 0.018]}
        color={shade(mainColor, -0.1)}
        roughness={0.7}
      />
      <Box
        position={[0, heightM - frameThick / 2, 0]}
        size={[widthM + 0.02, frameThick, depthM + 0.015]}
        color={mainColor}
        roughness={0.55}
      />
      {/* Shelves with a front edge strip, books, bookends and ornaments */}
      {Array.from({ length: numShelves }).map((_, idx) => {
        const y = kick + idx * gap;
        const top = y + frameThick;
        return (
          <group key={idx} name="shelf">
            <Box
              position={[0, y + frameThick / 2, 0]}
              size={[shelfW, frameThick, depthM]}
              color={mainColor}
              roughness={0.65}
            />
            <Box
              position={[0, y + frameThick / 2, depthM / 2 - 0.003]}
              size={[shelfW, frameThick * 0.7, 0.008]}
              color={shade(mainColor, -0.06)}
              roughness={0.6}
              castShadow={false}
            />
            {idx % 3 === 0 && (
              <BookRow
                x0={-shelfW / 2 + 0.02}
                x1={shelfW * 0.18}
                y={top}
                depth={depthM}
                seed={idx + 3}
                maxH={gap - 0.06}
              />
            )}
            {idx % 3 === 0 && (
              <Cyl
                position={[shelfW * 0.33, top + 0.09, 0]}
                radiusTop={0.05}
                radiusBottom={0.035}
                height={0.18}
                color="#ECE5D8"
                roughness={0.5}
                segments={14}
              />
            )}
            {idx % 3 === 1 && (
              <BookRow
                x0={-shelfW * 0.3}
                x1={shelfW / 2 - 0.02}
                y={top}
                depth={depthM}
                seed={idx + 11}
                maxH={gap - 0.06}
              />
            )}
            {idx % 3 === 1 && (
              <Box
                position={[-shelfW * 0.36, top + 0.07, 0]}
                size={[0.14, 0.14, depthM * 0.5]}
                color="#C49746"
                roughness={0.4}
                metalness={0.4}
              />
            )}
            {idx % 3 === 2 && (
              <BookRow
                x0={-shelfW / 2 + 0.02}
                x1={shelfW * 0.4}
                y={top}
                depth={depthM}
                seed={idx + 23}
                maxH={gap - 0.06}
              />
            )}
            {idx % 3 === 2 && (
              <group position={[shelfW * 0.38, top, 0]}>
                <Cyl
                  position={[0, 0.04, 0]}
                  radiusTop={0.045}
                  radiusBottom={0.035}
                  height={0.08}
                  color="#B5532F"
                  roughness={0.6}
                  segments={12}
                />
                <Ball
                  position={[0, 0.13, 0]}
                  radius={0.06}
                  color="#4F7A4D"
                  roughness={0.85}
                  segments={10}
                />
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
}

export function ChestDrawersModel({
  def,
  widthM,
  depthM,
  heightM,
  mainColor,
  legColor,
  handleColor,
}) {
  const id = def?.id || '';
  if (id === 'shoe-rack') {
    return <ShoeRack widthM={widthM} depthM={depthM} heightM={heightM} mainColor={mainColor} />;
  }
  const filing = id === 'filing-cabinet';
  const plinthH = filing ? 0.04 : 0.08;
  const bodyH = heightM - plinthH;
  const drawers = filing ? 4 : heightM > 0.9 ? 4 : 3;
  const topT = filing ? 0.012 : 0.03;
  return (
    <group>
      <Box
        position={[0, plinthH / 2, -0.01]}
        size={[widthM * 0.96, plinthH, depthM * 0.92]}
        color={legColor || '#2B2117'}
        roughness={0.8}
      />
      <Box
        position={[0, plinthH + (bodyH - topT) / 2, 0]}
        size={[widthM, bodyH - topT, depthM]}
        color={mainColor}
        roughness={filing ? 0.45 : 0.7}
        metalness={filing ? 0.25 : 0}
      />
      {/* Top with a slight overhang and edge strip */}
      <Pad
        position={[0, heightM - topT / 2, 0.005]}
        size={[widthM + (filing ? 0.004 : 0.03), topT, depthM + (filing ? 0.004 : 0.03)]}
        radius={0.006}
        color={filing ? shade(mainColor, 0.04) : shade(mainColor, 0.03)}
        roughness={0.45}
      />
      <Drawers
        width={widthM - 0.03}
        height={bodyH - topT - 0.02}
        y={plinthH + 0.01}
        z={depthM / 2}
        rows={drawers}
        color={mainColor}
        handleColor={handleColor || BRASS.color}
        handle={filing ? 'bar' : widthM > 0.7 ? 'bar' : 'knob'}
      />
      {filing &&
        Array.from({ length: drawers }).map((_, i) => {
          const fh = (bodyH - topT - 0.02) / drawers;
          const y = plinthH + 0.01 + fh * (i + 0.72);
          return (
            <group key={i} name="label-holder">
              <Box
                position={[0, y, depthM / 2 + 0.0215]}
                size={[widthM * 0.4, 0.034, 0.003]}
                {...STEEL}
                castShadow={false}
              />
              <Box
                position={[0, y, depthM / 2 + 0.0235]}
                size={[widthM * 0.34, 0.024, 0.002]}
                color="#F1EEE4"
                castShadow={false}
              />
            </group>
          );
        })}
      {filing && (
        <group
          name="lock"
          position={[
            widthM * 0.36,
            plinthH + 0.01 + (bodyH - topT - 0.02) * 0.9,
            depthM / 2 + 0.019,
          ]}
        >
          <Cyl
            position={[0, 0, 0.003]}
            radiusTop={0.012}
            height={0.006}
            rotation={[Math.PI / 2, 0, 0]}
            {...CHROME}
            segments={14}
          />
          <Box
            position={[0, 0, 0.007]}
            size={[0.003, 0.012, 0.002]}
            color="#1A1A1A"
            castShadow={false}
          />
        </group>
      )}
    </group>
  );
}

function ShoeRack({ widthM, depthM, heightM, mainColor }) {
  const tiers = 5;
  const gap = (heightM - 0.08) / tiers;
  const th = 0.02;
  const shoeColors = ['#2B2B2E', '#8B4A2B', '#C9B79C', '#B8343F', '#33475B'];
  return (
    <group>
      {[-1, 1].map((s) => (
        <Box
          key={s}
          position={[(s * (widthM - 0.03)) / 2, heightM / 2, 0]}
          size={[0.03, heightM, depthM]}
          color={mainColor}
          roughness={0.65}
        />
      ))}
      <Box
        position={[0, heightM - 0.015, 0]}
        size={[widthM, 0.03, depthM]}
        color={shade(mainColor, 0.03)}
        roughness={0.55}
      />
      <Box
        position={[0, 0.04, -depthM / 2 + 0.01]}
        size={[widthM - 0.06, 0.08, 0.015]}
        color={shade(mainColor, -0.1)}
        roughness={0.7}
      />
      {Array.from({ length: tiers }).map((_, i) => {
        const y = 0.08 + i * gap;
        return (
          <group key={i} name="rack-tier">
            {/* Slanted slatted shelf */}
            {[0.2, 0.5, 0.8].map((f) => (
              <Box
                key={f}
                position={[0, y + th / 2 + 0.02, -depthM / 2 + depthM * f]}
                size={[widthM - 0.06, th, depthM * 0.22]}
                color={mainColor}
                roughness={0.65}
                rotation={[0.08, 0, 0]}
              />
            ))}
            {/* A few pairs of shoes */}
            {[-0.28, -0.05, 0.2].map((fx, k) => (
              <group key={k} position={[fx * widthM, y + 0.04, 0]}>
                <Pad
                  position={[-0.035, 0.03, 0.02]}
                  size={[0.07, 0.06, depthM * 0.62]}
                  radius={0.02}
                  color={shoeColors[(i + k) % shoeColors.length]}
                  roughness={0.6}
                />
                <Pad
                  position={[0.035, 0.03, 0.02]}
                  size={[0.07, 0.06, depthM * 0.62]}
                  radius={0.02}
                  color={shoeColors[(i + k) % shoeColors.length]}
                  roughness={0.6}
                />
              </group>
            ))}
          </group>
        );
      })}
    </group>
  );
}

function BottleRow({ x0, x1, y, z, count }) {
  const colors = ['#2D4A2E', '#6B2A2A', '#B8923A', '#3C4E6B'];
  return (
    <group name="bottles">
      {Array.from({ length: count }).map((_, i) => {
        const x = x0 + ((x1 - x0) * (i + 0.5)) / count;
        const c = colors[i % colors.length];
        return (
          <group key={i} position={[x, y, z]}>
            <Cyl
              position={[0, 0.1, 0]}
              radiusTop={0.03}
              height={0.2}
              color={c}
              roughness={0.2}
              segments={10}
            />
            <Cyl
              position={[0, 0.235, 0]}
              radiusTop={0.011}
              radiusBottom={0.02}
              height={0.07}
              color={c}
              roughness={0.2}
              segments={8}
            />
            <Cyl
              position={[0, 0.275, 0]}
              radiusTop={0.012}
              height={0.015}
              color="#C9A24A"
              metalness={0.15}
              roughness={0.4}
              segments={8}
            />
          </group>
        );
      })}
    </group>
  );
}

export function SideboardModel({ def, widthM, depthM, heightM, mainColor, legColor, handleColor }) {
  const id = def?.id || '';
  const bar = id === 'bar-cabinet';
  const micro = id === 'microwave-stand';
  const console_ = id === 'console-table';
  const legH = console_ ? 0.3 : bar ? 0.14 : 0.16;
  const topT = 0.03;
  const bodyH = heightM - legH;
  // A console table's legs carry the top all the way up, its apron hangs below the slab
  const legsH = console_ ? heightM - topT : legH;
  const frontZ = depthM / 2;
  const sub = def?.subColor || shade(mainColor, -0.08);
  const legsAt = [
    [-widthM / 2 + 0.08, -depthM / 2 + 0.06],
    [widthM / 2 - 0.08, -depthM / 2 + 0.06],
    [-widthM / 2 + 0.08, depthM / 2 - 0.06],
    [widthM / 2 - 0.08, depthM / 2 - 0.06],
  ];
  return (
    <group>
      {/* Tapered brass or timber legs */}
      {legsAt.map(([lx, lz], idx) => (
        <Cyl
          key={idx}
          position={[lx, legsH / 2, lz]}
          radiusTop={0.02}
          radiusBottom={0.012}
          height={legsH}
          color={legColor}
          roughness={0.35}
          metalness={0.15}
          segments={10}
        />
      ))}
      {bar ? (
        <>
          {/* Lower cabinet with doors and an upper glazed display with bottles */}
          <Box
            position={[0, legH + 0.3, 0]}
            size={[widthM, 0.6, depthM]}
            color={mainColor}
            roughness={0.55}
          />
          <Doors
            width={widthM - 0.03}
            height={0.55}
            y={legH + 0.025}
            z={frontZ}
            count={2}
            color={mainColor}
            handleColor={handleColor}
            handleY={legH + 0.5}
          />
          <Box
            position={[0, legH + 0.6 + 0.015, 0]}
            size={[widthM + 0.02, 0.03, depthM + 0.02]}
            color={shade(mainColor, 0.06)}
            roughness={0.4}
          />
          <group name="bar-display" position={[0, legH + 0.63, 0]}>
            {[-1, 1].map((s) => (
              <Box
                key={s}
                position={[(s * (widthM - 0.03)) / 2, (heightM - legH - 0.63) / 2, 0]}
                size={[0.03, heightM - legH - 0.63, depthM * 0.9]}
                color={mainColor}
                roughness={0.55}
              />
            ))}
            <Box
              position={[0, (heightM - legH - 0.63) / 2, -depthM * 0.45 + 0.01]}
              size={[widthM - 0.06, heightM - legH - 0.63, 0.012]}
              color="#12171A"
              roughness={0.3}
              metalness={0.2}
            />
            <Box
              position={[0, heightM - legH - 0.63 - 0.013, 0]}
              size={[widthM, 0.03, depthM * 0.9]}
              color={shade(mainColor, 0.06)}
              roughness={0.5}
            />
            <BottleRow
              x0={-widthM / 2 + 0.08}
              x1={widthM / 2 - 0.08}
              y={0.006}
              z={0.0}
              count={Math.max(2, Math.round(widthM / 0.12))}
            />
            <GlassPane
              position={[0, (heightM - legH - 0.63) / 2, depthM / 2 - 0.012]}
              size={[widthM - 0.06, heightM - legH - 0.63 - 0.05, 0.006]}
              opacity={0.2}
            />
            <Pull
              position={[widthM * 0.4, (heightM - legH - 0.63) / 2, depthM / 2 - 0.01]}
              length={0.16}
              color={handleColor}
            />
          </group>
        </>
      ) : micro ? (
        <>
          {/* Open shelf under a drawer and cupboard, microwave on top */}
          <Box
            position={[0, legH + bodyH / 2 - topT / 2, 0]}
            size={[widthM, bodyH - topT, depthM]}
            color={mainColor}
            roughness={0.65}
          />
          <Box
            position={[0, legH + 0.19, frontZ - 0.005]}
            size={[widthM - 0.06, 0.3, 0.02]}
            color={DARK_GAP}
            roughness={0.9}
          />
          <Box
            position={[0, legH + 0.19, 0]}
            size={[widthM - 0.06, 0.012, depthM - 0.04]}
            color={shade(mainColor, 0.05)}
            roughness={0.6}
          />
          <Drawers
            width={widthM - 0.03}
            height={0.14}
            y={legH + bodyH - topT - 0.155}
            z={frontZ}
            rows={1}
            color={mainColor}
            handleColor={handleColor}
          />
          <Doors
            width={widthM - 0.03}
            height={bodyH - topT - 0.3}
            y={legH + 0.02 + 0.3 - 0.02}
            z={frontZ}
            count={2}
            color={mainColor}
            handleColor={handleColor}
            handleY={legH + 0.45}
          />
          <Box
            position={[0, heightM - topT / 2, 0]}
            size={[widthM + 0.02, topT, depthM + 0.02]}
            color={shade(mainColor, 0.05)}
            roughness={0.4}
          />
        </>
      ) : console_ ? (
        <>
          {/* Slim console: apron with drawers, a lower stretcher shelf */}
          <Box
            position={[0, legH + bodyH - 0.07 - topT / 2, 0]}
            size={[widthM - 0.06, 0.14, depthM - 0.04]}
            color={mainColor}
            roughness={0.6}
          />
          <Drawers
            width={widthM - 0.12}
            height={0.12}
            y={legH + bodyH - topT - 0.135}
            z={depthM / 2 - 0.02}
            rows={1}
            cols={2}
            color={mainColor}
            handleColor={handleColor}
            handle="knob"
          />
          <Box
            position={[0, 0.2, 0]}
            size={[widthM - 0.1, 0.02, depthM - 0.08]}
            color={sub}
            roughness={0.6}
          />
          <Box
            position={[0, heightM - topT / 2, 0]}
            size={[widthM + 0.02, topT, depthM + 0.02]}
            color={shade(mainColor, 0.05)}
            roughness={0.35}
          />
        </>
      ) : (
        <>
          {/* Buffet: three doors with a pair of drawers over the centre */}
          <Box
            position={[0, legH + (bodyH - topT) / 2, 0]}
            size={[widthM, bodyH - topT, depthM]}
            color={mainColor}
            roughness={0.65}
          />
          <Doors
            width={(widthM - 0.03) * 0.32}
            height={bodyH - topT - 0.03}
            x={-(widthM - 0.03) * 0.34}
            y={legH + 0.015}
            z={frontZ}
            count={1}
            color={mainColor}
            handleColor={handleColor}
            handleY={legH + bodyH * 0.6}
          />
          <Doors
            width={(widthM - 0.03) * 0.32}
            height={bodyH - topT - 0.03}
            x={(widthM - 0.03) * 0.34}
            y={legH + 0.015}
            z={frontZ}
            count={1}
            color={mainColor}
            handleColor={handleColor}
            handleY={legH + bodyH * 0.6}
          />
          <Drawers
            width={(widthM - 0.03) * 0.34}
            height={(bodyH - topT - 0.03) * 0.5}
            x={0}
            y={legH + 0.015 + (bodyH - topT - 0.03) * 0.5}
            z={frontZ}
            rows={1}
            color={mainColor}
            handleColor={handleColor}
          />
          <Drawers
            width={(widthM - 0.03) * 0.34}
            height={(bodyH - topT - 0.03) * 0.5}
            x={0}
            y={legH + 0.015}
            z={frontZ}
            rows={1}
            color={mainColor}
            handleColor={handleColor}
          />
          <Box
            position={[0, heightM - topT / 2, 0]}
            size={[widthM + 0.025, topT, depthM + 0.025]}
            color={shade(mainColor, 0.05)}
            roughness={0.35}
          />
        </>
      )}
    </group>
  );
}

export function VanityDresserModel({
  def,
  widthM,
  depthM,
  heightM,
  mainColor,
  legColor,
  handleColor,
}) {
  const legH = 0.14;
  const bodyH = heightM * 0.55;
  const mirrorW = widthM * 0.7;
  const mirrorH = Math.min(heightM - bodyH - 0.12, mirrorW * 1.05);
  const mirrorY = bodyH + 0.06 + mirrorH / 2;
  const mirrorZ = -depthM / 2 + 0.05;
  const rowH = (bodyH - legH - 0.04) / 2;
  const mirror = def?.mirrorColor || MIRROR.color;
  return (
    <group>
      <Box
        position={[0, legH + (bodyH - legH - 0.03) / 2, 0]}
        size={[widthM, bodyH - legH - 0.03, depthM]}
        color={mainColor}
        roughness={0.65}
      />
      <Pad
        position={[0, bodyH - 0.015, 0.005]}
        size={[widthM + 0.02, 0.03, depthM + 0.02]}
        radius={0.008}
        color={shade(mainColor, 0.05)}
        roughness={0.4}
      />
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz], i) => (
        <Cyl
          key={i}
          position={[sx * (widthM / 2 - 0.05), legH / 2, sz * (depthM / 2 - 0.05)]}
          radiusTop={0.025}
          radiusBottom={0.014}
          height={legH}
          color={legColor}
          roughness={0.5}
          segments={10}
        />
      ))}
      {/* Two small drawers over one wide drawer, with brass knobs */}
      <Drawers
        width={widthM - 0.03}
        height={rowH}
        y={legH + 0.02 + rowH}
        z={depthM / 2}
        rows={1}
        cols={2}
        color={mainColor}
        handleColor={handleColor}
        handle="knob"
      />
      <Drawers
        width={widthM - 0.03}
        height={rowH}
        y={legH + 0.02}
        z={depthM / 2}
        rows={1}
        cols={1}
        color={mainColor}
        handleColor={handleColor}
        handle="knob"
      />
      {/* Upright mirror in a carved frame with a base bracket */}
      <group name="dresser-mirror" position={[0, mirrorY, mirrorZ]}>
        <Pad
          size={[mirrorW + 0.06, mirrorH + 0.06, 0.035]}
          radius={0.02}
          color={shade(mainColor, 0.04)}
          roughness={0.5}
        />
        <Box
          position={[0, 0, 0.019]}
          size={[mirrorW, mirrorH, 0.004]}
          color={mirror}
          roughness={0.05}
          metalness={0.45}
          castShadow={false}
        />
        <Box
          position={[0, 0, 0.0175]}
          size={[mirrorW + 0.015, mirrorH + 0.015, 0.002]}
          {...BRASS}
          color={handleColor}
          castShadow={false}
        />
        <Ball
          position={[0, (mirrorH + 0.06) / 2 + 0.012, 0]}
          radius={0.022}
          {...BRASS}
          color={handleColor}
        />
      </group>
      {[-1, 1].map((s) => (
        <Box
          key={s}
          position={[s * (mirrorW / 2 + 0.03), bodyH + 0.04, mirrorZ]}
          size={[0.03, 0.08, 0.05]}
          color={mainColor}
          roughness={0.5}
        />
      ))}
      {/* Perfume bottles and a jewellery tray on top */}
      <group name="dresser-decor" position={[0, bodyH, depthM * 0.1]}>
        <Box
          position={[-widthM * 0.28, 0.01, 0]}
          size={[0.18, 0.02, 0.1]}
          color="#F1E8D8"
          roughness={0.4}
        />
        <Cyl
          position={[widthM * 0.3, 0.06, 0]}
          radiusTop={0.025}
          radiusBottom={0.03}
          height={0.12}
          color="#C7DDE4"
          roughness={0.1}
          segments={12}
        />
        <Ball position={[widthM * 0.3, 0.14, 0]} radius={0.016} {...BRASS} color={handleColor} />
        <Cyl
          position={[widthM * 0.38, 0.045, 0.03]}
          radiusTop={0.02}
          height={0.09}
          color="#E3C7CF"
          roughness={0.15}
          segments={10}
        />
      </group>
    </group>
  );
}

export function CredenzaModel({
  widthM,
  depthM,
  heightM,
  mainColor,
  subColor,
  legColor,
  handleColor,
}) {
  const legH = 0.14;
  const bodyH = heightM - legH;
  const topT = 0.03;
  const doorH = bodyH - topT - 0.03;
  const sectionW = (widthM - 0.03) * 0.3;
  const sub = subColor || shade(mainColor, -0.08);
  const gapX = (widthM - 0.03) * 0.2;
  return (
    <group>
      {/* Splayed legs */}
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz], idx) => (
        <Cyl
          key={idx}
          position={[sx * (widthM / 2 - 0.1), legH / 2, sz * (depthM / 2 - 0.07)]}
          radiusTop={0.022}
          radiusBottom={0.012}
          height={legH}
          rotation={[sz * 0.12, 0, -sx * 0.12]}
          color={legColor}
          roughness={0.45}
          metalness={0.3}
          segments={10}
        />
      ))}
      <Box
        position={[0, legH + (bodyH - topT) / 2, 0]}
        size={[widthM, bodyH - topT, depthM]}
        color={mainColor}
        roughness={0.6}
      />
      <Box
        position={[0, heightM - topT / 2, 0.004]}
        size={[widthM + 0.02, topT, depthM + 0.02]}
        color={shade(mainColor, 0.04)}
        roughness={0.35}
      />
      {/* Two cupboards flanking a pair of drawers over an open AV bay */}
      <Doors
        width={sectionW}
        height={doorH}
        x={-(widthM - 0.03) * 0.35}
        y={legH + 0.015}
        z={depthM / 2}
        count={1}
        color={mainColor}
        handleColor={handleColor || BRASS.color}
        handle="knob"
        handleY={legH + doorH * 0.7}
        hinges={false}
      />
      <Doors
        width={sectionW}
        height={doorH}
        x={(widthM - 0.03) * 0.35}
        y={legH + 0.015}
        z={depthM / 2}
        count={1}
        color={mainColor}
        handleColor={handleColor || BRASS.color}
        handle="knob"
        handleY={legH + doorH * 0.7}
        hinges={false}
      />
      <Drawers
        width={gapX * 1.7}
        height={doorH * 0.32}
        y={legH + 0.015 + doorH * 0.68}
        z={depthM / 2}
        rows={1}
        cols={2}
        color={mainColor}
        handleColor={handleColor || BRASS.color}
        handle="knob"
      />
      <group name="av-bay">
        <Box
          position={[0, legH + 0.015 + doorH * 0.34, depthM / 2 - 0.004]}
          size={[gapX * 1.7, doorH * 0.64, 0.01]}
          color={DARK_GAP}
          roughness={0.9}
        />
        <Box
          position={[0, legH + 0.02 + doorH * 0.36, depthM / 2 - 0.1]}
          size={[gapX * 1.4, 0.014, depthM * 0.6]}
          color={sub}
          roughness={0.6}
        />
        <Box
          position={[0, legH + 0.06, 0]}
          size={[gapX * 1.3, 0.05, depthM * 0.55]}
          {...BLACK_PLASTIC}
          color="#1B1D20"
        />
        <Box
          position={[gapX * 0.5, legH + 0.06, depthM * 0.3]}
          size={[0.012, 0.012, 0.002]}
          color="#4EE08A"
          castShadow={false}
        />
      </group>
    </group>
  );
}

export function PantryCabinetModel({ def, widthM, depthM, heightM, mainColor, handleColor }) {
  const id = def?.id || '';
  const towel = id === 'towel-cabinet';
  const plinthH = 0.08;
  const sub = def?.subColor || shade(mainColor, -0.08);
  const towelColors = ['#E9DFD0', '#9DB7C9', '#D9A5A0', '#C9D3BF'];
  return (
    <group>
      <Box
        position={[0, plinthH / 2, 0]}
        size={[widthM * 0.96, plinthH, depthM * 0.92]}
        color="#2B2B2B"
        roughness={0.85}
      />
      {towel ? (
        <group name="towel-frame">
          {[-1, 1].map((sg) => (
            <Box
              key={sg}
              position={[(sg * (widthM - 0.02)) / 2, plinthH + (heightM - plinthH) / 2, 0]}
              size={[0.02, heightM - plinthH, depthM]}
              color={mainColor}
              roughness={0.7}
            />
          ))}
          <Box
            position={[0, plinthH + (heightM - plinthH) / 2, -depthM / 2 + 0.006]}
            size={[widthM - 0.04, heightM - plinthH, 0.012]}
            color={shade(mainColor, -0.08)}
            roughness={0.8}
          />
          <Box
            position={[0, plinthH + 0.24, 0]}
            size={[widthM - 0.04, 0.48, depthM - 0.012]}
            color={mainColor}
            roughness={0.7}
          />
          <Box
            position={[0, heightM - 0.01, 0]}
            size={[widthM, 0.02, depthM]}
            color={mainColor}
            roughness={0.7}
          />
        </group>
      ) : (
        <Box
          position={[0, plinthH + (heightM - plinthH) / 2, 0]}
          size={[widthM, heightM - plinthH, depthM]}
          color={mainColor}
          roughness={0.7}
        />
      )}
      <Box
        position={[0, heightM - 0.009, 0]}
        size={[widthM + 0.015, 0.024, depthM + 0.015]}
        color={shade(mainColor, 0.02)}
        roughness={0.55}
      />
      {towel ? (
        <>
          {/* Open upper shelves stacked with folded towels, a closed door below */}
          <Box
            position={[0, plinthH + 0.5, depthM / 2 - 0.01]}
            size={[widthM - 0.06, 0.008, 0.01]}
            color={sub}
            roughness={0.6}
            castShadow={false}
          />
          {[0, 1, 2].map((i) => {
            const y = heightM - 0.1 - i * ((heightM - plinthH - 0.62) / 3 + 0.02);
            return (
              <group key={i} name="towel-shelf">
                <Box
                  position={[0, y - 0.13, 0.002]}
                  size={[widthM - 0.06, 0.012, depthM - 0.01]}
                  color={sub}
                  roughness={0.6}
                />
                {[0, 1, 2].map((k) => (
                  <Pad
                    key={k}
                    position={[0, y - 0.12 + 0.025 + k * 0.05, depthM * 0.04]}
                    size={[widthM - 0.1, 0.045, depthM - 0.07]}
                    radius={0.012}
                    color={towelColors[(i + k) % towelColors.length]}
                    roughness={0.98}
                  />
                ))}
              </group>
            );
          })}
          <Doors
            width={widthM - 0.03}
            height={0.42}
            y={plinthH + 0.025}
            z={depthM / 2}
            count={1}
            color={mainColor}
            handleColor={handleColor}
            handle="knob"
            handleY={plinthH + 0.37}
            hinges={false}
          />
        </>
      ) : (
        <>
          {/* Upper cupboard doors and tall lower pantry doors with handles and hinges */}
          <Doors
            width={widthM - 0.03}
            height={heightM * 0.3}
            y={heightM * 0.7 - 0.01}
            z={depthM / 2}
            count={2}
            color={mainColor}
            handleColor={handleColor}
            handleY={heightM * 0.72}
          />
          <Doors
            width={widthM - 0.03}
            height={heightM * 0.7 - plinthH - 0.03}
            y={plinthH + 0.015}
            z={depthM / 2}
            count={2}
            color={mainColor}
            handleColor={handleColor}
            handleY={heightM * 0.5}
          />
          <Box
            position={[0, heightM * 0.7 - 0.005, depthM / 2 + 0.01]}
            size={[widthM, 0.012, 0.03]}
            color={sub}
            roughness={0.6}
          />
        </>
      )}
    </group>
  );
}

/** Faint diagonal sheen on the glass: strongest at the top-left corner, gone by the middle. */
function ScreenSheen({ width, height, z }) {
  const geometry = React.useMemo(() => {
    const g = new THREE.PlaneGeometry(width, height, 8, 8);
    const pos = g.attributes.position;
    const colors = new Float32Array(pos.count * 4);
    for (let i = 0; i < pos.count; i++) {
      // t runs 0 at the top-left corner to 1 at the bottom-right
      const t = (pos.getX(i) / width + 0.5 + (0.5 - pos.getY(i) / height)) / 2;
      const a = 0.22 * Math.pow(Math.max(0, 1 - t * 1.9), 2);
      colors.set([1, 1, 1, a], i * 4);
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 4));
    return g;
  }, [width, height]);
  return (
    <mesh position={[0, 0, z]} geometry={geometry}>
      <meshBasicMaterial vertexColors transparent depthWrite={false} />
    </mesh>
  );
}

/** Flat-panel TV: thin bezel, glossy glass screen, slim back body, neck and base plate. */
export function TvModel({ widthM, depthM, heightM, mainColor }) {
  const baseT = 0.012;
  const neckH = 0.05;
  const bodyBottom = baseT + neckH;
  const bodyH = heightM - bodyBottom;
  const bodyT = Math.min(0.026, depthM * 0.3);
  const bodyZ = -depthM * 0.08;
  const front = bodyZ + bodyT / 2;
  const bezel = clamp(widthM * 0.009, 0.006, 0.014);
  const chin = bezel * 1.8;
  const screenW = widthM - bezel * 2;
  const screenH = bodyH - bezel - chin;
  const screenY = bodyBottom + chin + screenH / 2;
  return (
    <group name="tv">
      {/* Bezel body with a shallower rear housing behind it */}
      <Box
        position={[0, bodyBottom + bodyH / 2, bodyZ]}
        size={[widthM, bodyH, bodyT]}
        color={mainColor}
        roughness={0.35}
        metalness={0.2}
      />
      <Box
        position={[0, bodyBottom + bodyH * 0.55, bodyZ - bodyT / 2 - 0.009]}
        size={[widthM * 0.62, bodyH * 0.55, 0.018]}
        color={shade(mainColor, 0.03)}
        roughness={0.5}
        castShadow={false}
      />
      {/* Glass: its face stands 2 mm proud of the bezel so the two never share a plane */}
      <group name="tv-screen">
        <Box
          position={[0, screenY, front + 0.0005]}
          size={[screenW, screenH, 0.003]}
          color="#111a25"
          roughness={0.08}
          metalness={0.15}
          castShadow={false}
        />
        <group position={[0, screenY, front + 0.0021]}>
          <ScreenSheen width={screenW} height={screenH} z={0.0004} />
        </group>
      </group>
      {/* Standby light on the chin */}
      <mesh
        name="tv-led"
        position={[widthM / 2 - bezel - 0.012, bodyBottom + chin * 0.5, front + 0.0012]}
      >
        <sphereGeometry args={[0.0028, 8, 6]} />
        <meshBasicMaterial color="#FF3B30" />
      </mesh>
      {/* Neck behind the panel and a flat base plate */}
      <group name="tv-stand">
        <Box
          position={[0, baseT + neckH / 2, bodyZ - 0.004]}
          size={[widthM * 0.06, neckH + 0.004, 0.02]}
          color={mainColor}
          roughness={0.4}
          metalness={0.2}
        />
        <Pad
          position={[0, baseT / 2, 0]}
          size={[widthM * 0.3, baseT, depthM * 0.92]}
          radius={0.004}
          color={shade(mainColor, 0.04)}
          roughness={0.35}
        />
      </group>
    </group>
  );
}

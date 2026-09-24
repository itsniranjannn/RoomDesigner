import React from 'react';
import { motion } from 'framer-motion';
import { useRoomStore } from '../../store/roomStore.js';
import { Button } from '../common/Button.jsx';
import { Plus } from 'lucide-react';
import styles from './LandingPage.module.css';

/**
 * Architectural Full-Bleed Drafting Board Hero
 * Draws perimeter walls, door swings, Nepali Galaicha rug, and architectural
 * dimension notations directly onto the canvas with stroke-draw-in animation.
 */
function DraftingBoardSurface() {
  // Dimension coordinate space in architectural centimeters (580 × 440)
  const roomW = 520;
  const roomH = 400;
  const paddingX = 80;
  const paddingY = 70;
  const viewW = roomW + paddingX * 2;
  const viewH = roomH + paddingY * 2;

  const perimeterPath = `M ${paddingX} ${paddingY} L ${paddingX + roomW} ${paddingY} L ${paddingX + roomW} ${paddingY + roomH} L ${paddingX} ${paddingY + roomH} Z`;

  // Main entry door (bottom wall)
  const doorX = paddingX + 70;
  const doorY = paddingY + roomH;
  const doorW = 90;
  const doorArc = `M ${doorX} ${doorY} A ${doorW} ${doorW} 0 0 1 ${doorX + doorW} ${doorY - doorW}`;

  // Window opening (top wall)
  const winX = paddingX + 190;
  const winY = paddingY;
  const winW = 140;

  // Single orchestrated blueprint entrance stroke animation
  const strokeAnim = {
    initial: { pathLength: 0, opacity: 0.2 },
    animate: {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { duration: 1.1, ease: [0.16, 1, 0.3, 1] },
        opacity: { duration: 0.25 },
      },
    },
  };

  return (
    <div className={styles.draftingSurface} aria-hidden="true">
      <svg
        viewBox={`0 0 ${viewW} ${viewH}`}
        className={styles.svgDraftingBoard}
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Subtle millimeter drafting grid */}
          <pattern id="draftingGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--color-taupe)" strokeWidth="0.5" opacity="0.45" />
          </pattern>
        </defs>

        {/* Full-bleed drafting grid */}
        <rect width="100%" height="100%" fill="url(#draftingGrid)" />


        {/* Sheet Corner Framing Marks */}
        <g stroke="var(--color-ink-muted)" strokeWidth="1" opacity="0.6">
          <path d={`M 20 35 L 20 20 L 35 20`} fill="none" />
          <path d={`M ${viewW - 20} 35 L ${viewW - 20} 20 L ${viewW - 35} 20`} fill="none" />
          <path d={`M 20 ${viewH - 35} L 20 ${viewH - 20} L 35 ${viewH - 20}`} fill="none" />
          <path d={`M ${viewW - 20} ${viewH - 35} L ${viewW - 20} ${viewH - 20} L ${viewW - 35} ${viewH - 20}`} fill="none" />
        </g>

        {/* Center alignment tick marks */}
        <g stroke="var(--color-taupe)" strokeWidth="1" opacity="0.8">
          <line x1={viewW / 2} y1={10} x2={viewW / 2} y2={25} />
          <line x1={viewW / 2} y1={viewH - 25} x2={viewW / 2} y2={viewH - 10} />
          <line x1={10} y1={viewH / 2} x2={25} y2={viewH / 2} />
          <line x1={viewW - 25} y1={viewH / 2} x2={viewW - 10} y2={viewH / 2} />
        </g>

        {/* Exterior wall thickness guideline */}
        <rect
          x={paddingX - 8}
          y={paddingY - 8}
          width={roomW + 16}
          height={roomH + 16}
          fill="none"
          stroke="var(--color-taupe)"
          strokeWidth="1.2"
          strokeDasharray="4 4"
          opacity="0.5"
        />

        {/* Outer Wall Perimeter with live stroke-draw-in animation */}
        <motion.path
          d={perimeterPath}
          fill="#FAF7F0"
          stroke="var(--color-ink)"
          strokeWidth="3.2"
          strokeLinecap="square"
          strokeLinejoin="miter"
          variants={strokeAnim}
          initial="initial"
          animate="animate"
        />

        {/* Clear Architectural Mandala / Ashta-Mangala Watermark (Drawn across the interior floor plane) */}
        <g opacity="0.22" transform={`translate(${paddingX + roomW / 2}, ${paddingY + roomH / 2})`} stroke="var(--color-maroon)" strokeWidth="1.4" fill="none">
          <circle r={130} />
          <circle r={105} strokeDasharray="4 4" stroke="var(--color-brass)" strokeWidth="1.2" />
          <circle r={75} />
          <circle r={45} strokeDasharray="3 3" />
          <rect x={-70} y={-70} width={140} height={140} />
          <rect x={-70} y={-70} width={140} height={140} transform="rotate(45)" stroke="var(--color-brass)" />
          <line x1={-160} y1={0} x2={160} y2={0} strokeDasharray="5 4" />
          <line x1={0} y1={-160} x2={0} y2={160} strokeDasharray="5 4" />
          {/* Central Lotus Petal accents */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((ang) => (
            <circle key={ang} cx={45 * Math.cos(ang * Math.PI / 180)} cy={45 * Math.sin(ang * Math.PI / 180)} r={6} fill="var(--color-brass)" opacity="0.4" />
          ))}
        </g>

        {/* Window opening cut & sill mullions */}
        <line x1={winX} y1={winY} x2={winX + winW} y2={winY} stroke="#FAF7F0" strokeWidth="4" />
        <line x1={winX} y1={winY} x2={winX + winW} y2={winY} stroke="var(--color-clay)" strokeWidth="2.2" />
        <line x1={winX} y1={winY - 4} x2={winX + winW} y2={winY - 4} stroke="var(--color-ink)" strokeWidth="1" />

        {/* Door opening cut & swing arc */}
        <line x1={doorX} y1={doorY} x2={doorX + doorW} y2={doorY} stroke="#FAF7F0" strokeWidth="4" />
        <motion.path
          d={doorArc}
          fill="none"
          stroke="var(--color-ink-muted)"
          strokeWidth="1.2"
          strokeDasharray="3 3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.4 }}
        />
        <line x1={doorX} y1={doorY} x2={doorX} y2={doorY - doorW} stroke="var(--color-ink)" strokeWidth="2" />

        {/* Architectural Placed Furniture Group */}
        <g opacity="0.9">
          {/* Queen Bed */}
          <rect
            x={paddingX + 60}
            y={paddingY + 60}
            width={160}
            height={200}
            fill="#F0EDE6"
            stroke="var(--color-ink)"
            strokeWidth="1.5"
            rx="2"
          />
          <rect x={paddingX + 70} y={paddingY + 70} width={60} height={35} fill="none" stroke="var(--color-ink-muted)" strokeWidth="1" rx="2" />
          <rect x={paddingX + 150} y={paddingY + 70} width={60} height={35} fill="none" stroke="var(--color-ink-muted)" strokeWidth="1" rx="2" />
          <line x1={paddingX + 60} y1={paddingY + 130} x2={paddingX + 220} y2={paddingY + 130} stroke="var(--color-ink-muted)" strokeWidth="1" strokeDasharray="3 3" />

          {/* Nightstand */}
          <rect
            x={paddingX + 235}
            y={paddingY + 60}
            width={45}
            height={45}
            fill="#F0EDE6"
            stroke="var(--color-ink)"
            strokeWidth="1.5"
          />

          {/* Executive Drafting Desk */}
          <rect
            x={paddingX + 350}
            y={paddingY + 180}
            width={140}
            height={70}
            fill="#F0EDE6"
            stroke="var(--color-ink)"
            strokeWidth="1.5"
            rx="2"
          />
          {/* Swivel Chair */}
          <circle cx={paddingX + 420} cy={paddingY + 280} r={18} fill="none" stroke="var(--color-ink)" strokeWidth="1.5" />

          {/* Authentic Nepali Tibetan Galaicha Rug */}
          <g>
            <rect
              x={paddingX + 180}
              y={paddingY + 170}
              width={150}
              height={200}
              fill="rgba(178, 93, 52, 0.05)"
              stroke="var(--color-clay)"
              strokeWidth="1.5"
              strokeDasharray="5 3"
              rx="2"
            />
            {/* Medallion geometric center */}
            <rect
              x={paddingX + 235}
              y={paddingY + 250}
              width={40}
              height={40}
              fill="none"
              stroke="var(--color-clay)"
              strokeWidth="1"
              transform={`rotate(45 ${paddingX + 255} ${paddingY + 270})`}
            />
          </g>
        </g>

        {/* Dimension Notation (Horizontal bottom) */}
        <line
          x1={paddingX}
          y1={viewH - 24}
          x2={paddingX + roomW}
          y2={viewH - 24}
          stroke="var(--color-ink-muted)"
          strokeWidth="1"
        />
        <line x1={paddingX} y1={viewH - 28} x2={paddingX} y2={viewH - 20} stroke="var(--color-ink-muted)" strokeWidth="1" />
        <line x1={paddingX + roomW} y1={viewH - 28} x2={paddingX + roomW} y2={viewH - 20} stroke="var(--color-ink-muted)" strokeWidth="1" />
        <text
          x={paddingX + roomW / 2}
          y={viewH - 27}
          fill="var(--color-ink-muted)"
          fontSize="10"
          fontFamily="var(--font-mono)"
          textAnchor="middle"
        >
          5200 mm
        </text>

        {/* Dimension Notation (Vertical right) */}
        <line
          x1={viewW - 24}
          y1={paddingY}
          x2={viewW - 24}
          y2={paddingY + roomH}
          stroke="var(--color-ink-muted)"
          strokeWidth="1"
        />
        <line x1={viewW - 28} y1={paddingY} x2={viewW - 20} y2={paddingY} stroke="var(--color-ink-muted)" strokeWidth="1" />
        <line x1={viewW - 28} y1={paddingY + roomH} x2={viewW - 20} y2={paddingY + roomH} stroke="var(--color-ink-muted)" strokeWidth="1" />
        <text
          x={viewW - 27}
          y={paddingY + roomH / 2}
          fill="var(--color-ink-muted)"
          fontSize="10"
          fontFamily="var(--font-mono)"
          textAnchor="middle"
          transform={`rotate(90 ${viewW - 27} ${paddingY + roomH / 2})`}
        >
          4000 mm
        </text>
      </svg>

      {/* Authentic Lacquered Oxblood & Brass Titleblock Seal */}
      <div className={styles.titleblock}>
        <div className={styles.titleblockTopRule} />
        <span className={styles.titleblockMain}>ROOM STUDIO // DRAWING BOARD</span>
        <div className={styles.titleblockMeta}>
          <span>SCALE 1:50</span>
          <span>•</span>
          <span>UNIT: MM</span>
          <span>•</span>
          <span>SHEET A-01</span>
        </div>
      </div>
    </div>
  );
}

export function LandingPage({ onOpenNewRoomModal }) {
  const allRooms = useRoomStore((state) => state.allRooms);
  const switchRoom = useRoomStore((state) => state.switchRoom);

  const hasExistingRooms = allRooms && allRooms.length > 0;

  return (
    <div className={styles.landingContainer}>
      {/* Minimal Architectural Header */}
      <header className={styles.landingHeader}>
        <div className={styles.brandLogo}>
          <div className={styles.brandIcon} aria-hidden="true" />
          <span className={styles.brandTitle}>Room Studio</span>
        </div>
        <span className={styles.headerMeta}>ARCHITECTURAL DRAFTING ENVIRONMENT</span>
      </header>

      {/* Asymmetric Studio Layout: Dominant Board (Left) + Folio Ledger (Right) */}
      <div className={styles.boardLayout}>
        {/* Full-bleed drafting board */}
        <DraftingBoardSurface />

        {/* Project Ledger Column */}
        <aside className={styles.projectLedger} aria-label="Studio Project Ledger">
          <div className={styles.ledgerHeader}>
            <div className={styles.ledgerHeaderTop}>
              <span className={styles.ledgerFolioTag}>FOLIO // 01</span>
              <span className={styles.ledgerArchiveTag}>ARCHIVED SHEETS</span>
            </div>
            <h1 className={styles.ledgerTitle}>Project Ledger</h1>
            <div className={styles.brassRule} />
            <p className={styles.ledgerSubtitle}>
              Select an archived layout to resume drafting, or initialize a new room sheet.
            </p>
          </div>

          <div className={styles.ledgerActionBlock}>
            <Button
              variant="primary"
              size="normal"
              icon={<Plus size={14} />}
              onClick={onOpenNewRoomModal}
              className={styles.newRoomBtn}
            >
              Start a new room
            </Button>
          </div>

          <div className={styles.ledgerScrollArea}>
            <div className={styles.ledgerSubheader}>
              <span>INDEXED ROOMS ({allRooms.length})</span>
            </div>
            <div className={styles.brassSubRule} />

            {hasExistingRooms ? (
              <div className={styles.ledgerList} role="list">
                {allRooms.map((r) => {
                  const widthM = (r.widthCm / 100).toFixed(2);
                  const depthM = (r.depthCm / 100).toFixed(2);
                  const furnitureCount = (r.placedFurniture || []).length;

                  return (
                    <div
                      key={r.id}
                      role="listitem"
                      tabIndex={0}
                      className={styles.ledgerRow}
                      onClick={() => switchRoom(r.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          switchRoom(r.id);
                        }
                      }}
                      aria-label={`Open ${r.name}, ${widthM} by ${depthM} meters, ${furnitureCount} pieces`}
                    >
                      <div className={styles.ledgerRowLeft}>
                        <span className={styles.ledgerRoomName}>{r.name}</span>
                        <span className={styles.ledgerRoomDims}>
                          {widthM} × {depthM}m
                        </span>
                      </div>

                      <div className={styles.ledgerRowRight}>
                        <span>{furnitureCount} {furnitureCount === 1 ? 'item' : 'items'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.ledgerEmpty}>
                <h2 className={styles.ledgerEmptyTitle}>Folio is empty</h2>
                <p className={styles.ledgerEmptyText}>
                  No active architectural drawings in studio. Initialize a new room archetype to begin.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

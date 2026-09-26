import React from 'react';
import { motion } from 'framer-motion';
import { useRoomStore } from '../../store/roomStore.js';
import { Button } from '../common/Button.jsx';
import { Plus } from 'lucide-react';
import { BrandMark } from '../common/BrandMark.jsx';
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
          <path d="M 20 35 L 20 20 L 35 20" fill="none" />
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

        {/* Clear Architectural Mandala / Ashta-Mangala Watermark */}
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
      </svg>
    </div>
  );
}

export function LandingPage({ onOpenNewRoomModal, onNavigateAbout }) {
  const allRooms = useRoomStore((state) => state.allRooms);
  const switchRoom = useRoomStore((state) => state.switchRoom);

  const hasExistingRooms = allRooms && allRooms.length > 0;

  return (
    <div className={styles.landingContainer}>
      {/* Minimal Architectural Header */}
      <header className={styles.landingHeader}>
        <div className={styles.brandLogo}>
          <BrandMark size={28} className={styles.brandMarkIcon} />
          <div className={styles.mastheadLockup}>
            <span className={styles.brandTitle}>ROOM STUDIO</span>
            <span className={styles.brandSubTitle}>CAD // 3D ARCHITECTURAL STUDIO</span>
          </div>
        </div>

        <div className={styles.headerMetaBlock}>
          {onNavigateAbout && (
            <>
              <button
                type="button"
                className={styles.aboutLinkBtn}
                onClick={onNavigateAbout}
                title="View About Room Studio"
              >
                ABOUT
              </button>
              <span className={styles.headerMetaDivider}>|</span>
            </>
          )}
          <span className={styles.headerMeta}>FOLIO ARCHIVE // EDITION 2026</span>
          <span className={styles.headerMetaDivider}>|</span>
          <span className={styles.headerCount}>
            {allRooms.length} {allRooms.length === 1 ? 'SHEET' : 'SHEETS'}
          </span>
        </div>
      </header>

      {/* Main Single-Screen Hero Viewport */}
      <main className={styles.heroSection}>
        {/* Left: Copy Column */}
        <div className={styles.heroCopyColumn}>
          <div className={styles.heroClassificationTag}>
            ARCHITECTURAL FOLIO // ED. 2026
          </div>

          <h1 className={styles.heroPrimaryTitle}>
            Draft your space<br />with precision.
          </h1>

          <p className={styles.heroSecondaryTitle}>
            From dimensional sketch to 3D architectural form.
          </p>

          <p className={styles.heroDescription}>
            Intuitive 2D drafting and real-time 3D spatial modeling built on authentic architectural
            materials and Nepalese craft traditions.
          </p>

          <Button
            variant="primary"
            size="normal"
            icon={<Plus size={14} />}
            onClick={onOpenNewRoomModal}
            className={styles.heroCtaBtn}
          >
            Start a new room
          </Button>

          <a href="#your-spaces" className={styles.scrollIndicator}>
            <span className={styles.scrollIndicatorText}>EXPLORE SPACES BELOW</span>
          </a>
        </div>

        {/* Right: Blueprint Visual */}
        <div className={styles.heroVisualColumn}>
          <DraftingBoardSurface />
        </div>
      </main>

      {/* ═══════════ YOUR SPACES SECTION (Below hero, scroll down) ═══════════ */}
      <section id="your-spaces" className={styles.yourSpacesSection}>
        <div className={styles.spacesHeader}>
          <div className={styles.spacesHeaderTop}>
            <span className={styles.spacesFolioTag}>YOUR SPACES</span>
            <span className={styles.spacesCountTag}>
              {allRooms.length} {allRooms.length === 1 ? 'SHEET' : 'SHEETS'}
            </span>
          </div>
          <div className={styles.brassRule} />
        </div>

        <div className={styles.spacesContent}>
          {hasExistingRooms ? (
            <div className={styles.spacesGrid} role="list">
              {allRooms.map((r, index) => {
                const widthM = (r.widthCm / 100).toFixed(2);
                const depthM = (r.depthCm / 100).toFixed(2);
                const areaM2 = ((r.widthCm * r.depthCm) / 10000).toFixed(1);
                const furnitureCount = (r.placedFurniture || []).length;
                const sheetCode = `SHEET // #0${index + 1}`;

                return (
                  <div
                    key={r.id}
                    role="listitem"
                    tabIndex={0}
                    className={styles.spaceCard}
                    onClick={() => switchRoom(r.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        switchRoom(r.id);
                      }
                    }}
                    aria-label={`Open ${r.name}, ${widthM} by ${depthM} meters, ${furnitureCount} pieces`}
                  >
                    <div className={styles.spaceCardLeft}>
                      <div className={styles.sheetCodeTag}>{sheetCode}</div>
                      <span className={styles.spaceCardName}>{r.name}</span>
                      <div className={styles.cadMatrixRow}>
                        <span className={styles.cadDimBadge}>{widthM} × {depthM}m</span>
                        <span className={styles.cadDotDivider}>•</span>
                        <span className={styles.cadAreaBadge}>{areaM2} m²</span>
                      </div>
                    </div>
                    <div className={styles.spaceCardRight}>
                      <span className={styles.itemCountBadge}>
                        {furnitureCount} {furnitureCount === 1 ? 'SPEC' : 'SPECS'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={styles.spacesEmpty}>
              <h2 className={styles.spacesEmptyTitle}>No spaces yet</h2>
              <p className={styles.spacesEmptyText}>
                Click "Start a new room" above to draft your first sheet.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════ LANDING PAGE COLOPHON ═══════════ */}
      <footer className={styles.colophon}>
        <div className={styles.colophonRule} />
        <span className={styles.colophonMark}>NIRANJAN</span>
      </footer>
    </div>
  );
}

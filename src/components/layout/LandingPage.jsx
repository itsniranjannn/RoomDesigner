import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useRoomStore } from '../../store/roomStore.js';
import { Button } from '../common/Button.jsx';
import { Info, Layers3, Plus } from 'lucide-react';
import { BrandMark } from '../common/BrandMark.jsx';
import { SheetsPanel } from './SheetsPanel.jsx';
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
        <rect width="100%" height="100%" fill="url(#draftingGrid)" className={styles.animatedDraftingGrid} />

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

        {/* Perpetual architectural mandala: nested rings rotate in opposite directions. */}
        <g transform={`translate(${paddingX + roomW / 2}, ${paddingY + roomH / 2})`} className={styles.mandalaSystem}>
          <circle r="138" className={styles.mandalaHalo} />
          <g className={styles.mandalaSpin}>
            <circle r={130} />
            <circle r={105} strokeDasharray="4 4" stroke="var(--color-brass)" strokeWidth="1.2" />
            <rect x={-70} y={-70} width={140} height={140} />
            <rect x={-70} y={-70} width={140} height={140} transform="rotate(45)" stroke="var(--color-brass)" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((ang) => (
              <circle key={ang} cx={45 * Math.cos((ang * Math.PI) / 180)} cy={45 * Math.sin((ang * Math.PI) / 180)} r={6} fill="var(--color-brass)" opacity="0.55" />
            ))}
          </g>
          <g className={styles.mandalaSpinReverse}>
            <circle r={75} />
            <circle r={45} strokeDasharray="3 3" />
            <path d="M0 -92 C52 -74 82 -40 92 0 C82 40 52 74 0 92 C-52 74 -82 40 -92 0 C-82 -40 -52 -74 0 -92Z" stroke="var(--color-brass)" />
          </g>
          <line x1={-160} y1={0} x2={160} y2={0} strokeDasharray="5 4" />
          <line x1={0} y1={-160} x2={0} y2={160} strokeDasharray="5 4" />
          <circle r="7" fill="var(--color-maroon)" opacity="0.75" className={styles.mandalaCore} />
          <circle r="3" fill="var(--color-linen)" />
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
        <g opacity="0.78" className={styles.bedFurniture}>
          {/* Queen Bed, kept close to the upper-left walls */}
          <rect
            x={paddingX + 45}
            y={paddingY + 40}
            width={160}
            height={200}
            fill="#F0EDE6"
            stroke="var(--color-ink)"
            strokeWidth="1.5"
            rx="2"
          />
          <rect x={paddingX + 55} y={paddingY + 50} width={60} height={35} fill="none" stroke="var(--color-ink-muted)" strokeWidth="1" rx="2" />
          <rect x={paddingX + 135} y={paddingY + 50} width={60} height={35} fill="none" stroke="var(--color-ink-muted)" strokeWidth="1" rx="2" />
          <line x1={paddingX + 45} y1={paddingY + 110} x2={paddingX + 205} y2={paddingY + 110} stroke="var(--color-ink-muted)" strokeWidth="1" strokeDasharray="3 3" />

          {/* Nightstand, tucked beside the bed */}
          <rect
            x={paddingX + 215}
            y={paddingY + 40}
            width={45}
            height={45}
            fill="#F0EDE6"
            stroke="var(--color-ink)"
            strokeWidth="1.5"
          />

          {/* Executive drafting desk, pulled toward the right wall */}
          <rect
            x={paddingX + 365}
            y={paddingY + 175}
            width={140}
            height={70}
            fill="#F0EDE6"
            stroke="var(--color-ink)"
            strokeWidth="1.5"
            rx="2"
          />
          {/* Swivel Chair, kept close to the lower-right side */}
          <circle cx={paddingX + 442} cy={paddingY + 270} r={18} fill="none" stroke="var(--color-ink)" strokeWidth="1.5" />

          {/* Nepali Galaicha Rug */}
          <g>
            <rect
              x={paddingX + 220}
              y={paddingY + 215}
              width={135}
              height={170}
              fill="rgba(178, 93, 52, 0.05)"
              stroke="var(--color-clay)"
              strokeWidth="1.5"
              strokeDasharray="5 3"
              rx="2"
            />
            <rect
              x={paddingX + 267}
              y={paddingY + 255}
              width={40}
              height={40}
              fill="none"
              stroke="var(--color-clay)"
              strokeWidth="1"
              transform={`rotate(45 ${paddingX + 287} ${paddingY + 275})`}
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
    </div>
  );
}

export function LandingPage({ onOpenNewRoomModal, onNavigateAbout }) {
  const allRooms = useRoomStore((state) => state.allRooms);
  const [isSheetsPanelOpen, setIsSheetsPanelOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className={styles.landingContainer}>
      {/* Minimal Architectural Header */}
      <header className={styles.landingHeader}>
        <div className={styles.brandLogo}>
          <BrandMark size={28} className={styles.brandMarkIcon} />
          <div className={styles.mastheadLockup}>
            <span className={styles.brandTitle}>ROOM DESIGNER STUDIO</span>
            <span className={styles.brandSubTitle}>CAD // 2D // 3D SPATIAL WORKSHOP</span>
          </div>
        </div>

        <nav className={styles.headerMetaBlock} aria-label="Studio navigation">
          {onNavigateAbout && (
            <>
              <button
                type="button"
                className={styles.headerNavBtn}
                onClick={onNavigateAbout}
                title="View About Room Designer Studio"
              >
                <Info size={13} strokeWidth={1.7} />
                ABOUT
              </button>
              <span className={styles.headerMetaDivider} aria-hidden="true" />
            </>
          )}

          {/* Interactive clickable sheets count button */}
          <button
            type="button"
            className={`${styles.headerNavBtn} ${styles.headerSheetsBtn}`}
            onClick={() => setIsSheetsPanelOpen(true)}
            title="Open saved sheets panel"
            aria-label="Open saved sheets panel"
          >
            <Layers3 size={13} strokeWidth={1.7} />
            <span className={styles.headerSheetsLabel}>SHEETS</span>
            <span className={styles.headerSheetsCount}>{String(allRooms.length).padStart(2, '0')}</span>
          </button>
        </nav>
      </header>

      {/* Main Single-Screen Hero Viewport — Exact layout as image */}
      <main className={styles.heroSection}>
        {/* Left: Copy Column */}
        <div className={styles.heroCopyColumn}>
          <div className={styles.heroCopyContent}>
          <div className={styles.heroClassificationTag}>
            ARCHITECTURAL FOLIO // ED. 2026
          </div>

          <motion.h1
            className={styles.heroPrimaryTitle}
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.88, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          >
            Draft your space<br />with precision.
          </motion.h1>

          <p className={styles.heroSecondaryTitle}>
            From dimensional sketch to 3D architectural form.
          </p>

          <p className={styles.heroDescription}>
            Intuitive 2D drafting and real-time 3D spatial modeling built on authentic architectural
            materials and Nepalese craft traditions.
          </p>

          <motion.div
            className={styles.heroCtaBtn}
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.42, ease: [0.22, 1, 0.36, 1] }}
          >
            <Button
              variant="primary"
              size="normal"
              icon={<Plus size={14} />}
              onClick={onOpenNewRoomModal}
            >
              Start a new room
            </Button>
          </motion.div>
          </div>

          {/* Clickable trigger to open the slide-out sheets panel directly */}
          <button
            type="button"
            className={styles.exploreSheetsBtn}
            onClick={() => setIsSheetsPanelOpen(true)}
            title="Open saved sheets panel"
            aria-label="Open saved sheets panel"
          >
            <span className={styles.scrollIndicatorText}>EXPLORE SPACES</span>
          </button>
        </div>

        {/* Right: Blueprint Visual */}
        <div className={styles.heroVisualColumn}>
          <DraftingBoardSurface />
        </div>
      </main>

      {/* Minimal Architectural Colophon */}
      <footer className={styles.colophon}>
        <div className={styles.colophonRule} />
        <span className={styles.colophonMark}>NIRANJAN</span>
      </footer>

      {/* Slide-out Sheets Panel for Saved Rooms */}
      <SheetsPanel
        isOpen={isSheetsPanelOpen}
        onClose={() => setIsSheetsPanelOpen(false)}
        onOpenNewRoomModal={onOpenNewRoomModal}
      />
    </div>
  );
}

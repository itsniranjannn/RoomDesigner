import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { BrandMark } from '../common/BrandMark.jsx';
import { Info, Layers3, ArrowLeft } from 'lucide-react';
import { useRoomStore } from '../../store/roomStore.js';
import styles from './AboutPage.module.css';

/**
 * Animated Architectural Monograph Plate (Right Column)
 * Showcases layered Nepalese architectural geometric systems:
 * Patan brass harmonics, lokta fiber grid drift, Kathmandu mandala geometry,
 * Galaicha woven proportions, and dimension registration notations.
 */
function AboutMonographPlate() {
  const roomW = 520;
  const roomH = 400;
  const paddingX = 80;
  const paddingY = 70;
  const viewW = roomW + paddingX * 2;
  const viewH = roomH + paddingY * 2;

  const strokeAnim = {
    initial: { pathLength: 0, opacity: 0.2 },
    animate: {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
        opacity: { duration: 0.3 },
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
          <pattern id="aboutDraftingGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--color-taupe)" strokeWidth="0.5" opacity="0.45" />
          </pattern>
        </defs>

        {/* Dynamic drifting drafting grid */}
        <rect width="100%" height="100%" fill="url(#aboutDraftingGrid)" className={styles.animatedDraftingGrid} />

        {/* Sheet Corner Framing Registration Marks */}
        <g stroke="var(--color-ink-muted)" strokeWidth="1" opacity="0.6">
          <path d="M 20 35 L 20 20 L 35 20" fill="none" />
          <path d={`M ${viewW - 20} 35 L ${viewW - 20} 20 L ${viewW - 35} 20`} fill="none" />
          <path d={`M 20 ${viewH - 35} L 20 ${viewH - 20} L 35 ${viewH - 20}`} fill="none" />
          <path d={`M ${viewW - 20} ${viewH - 35} L ${viewW - 20} ${viewH - 20} L ${viewW - 35} ${viewH - 20}`} fill="none" />
        </g>

        {/* Center alignment crosshairs */}
        <g stroke="var(--color-taupe)" strokeWidth="1" opacity="0.8">
          <line x1={viewW / 2} y1={10} x2={viewW / 2} y2={25} />
          <line x1={viewW / 2} y1={viewH - 25} x2={viewW / 2} y2={viewH - 10} />
          <line x1={10} y1={viewH / 2} x2={25} y2={viewH / 2} />
          <line x1={viewW - 25} y1={viewH / 2} x2={viewW - 10} y2={viewH / 2} />
        </g>

        {/* Outer Perimeter Plate */}
        <motion.rect
          x={paddingX}
          y={paddingY}
          width={roomW}
          height={roomH}
          fill="#FAF7F0"
          stroke="var(--color-ink)"
          strokeWidth="3.2"
          strokeLinecap="square"
          strokeLinejoin="miter"
          variants={strokeAnim}
          initial="initial"
          animate="animate"
        />

        {/* Inner concentric guideline frame */}
        <rect
          x={paddingX + 24}
          y={paddingY + 24}
          width={roomW - 48}
          height={roomH - 48}
          fill="none"
          stroke="var(--color-taupe)"
          strokeWidth="1.2"
          strokeDasharray="4 4"
          opacity="0.6"
        />

        {/* Perpetual Kathmandu Architectural Mandala System */}
        <g transform={`translate(${paddingX + roomW / 2}, ${paddingY + roomH / 2})`} className={styles.mandalaSystem}>
          <circle r="148" className={styles.mandalaHalo} />

          {/* Clockwise rotating ring group */}
          <g className={styles.mandalaSpin}>
            <circle r={135} stroke="var(--color-maroon)" strokeWidth="1.4" fill="none" opacity="0.45" />
            <circle r={110} strokeDasharray="4 4" stroke="var(--color-brass)" strokeWidth="1.3" fill="none" />
            <rect x={-75} y={-75} width={150} height={150} stroke="var(--color-ink-muted)" strokeWidth="1.2" fill="none" opacity="0.35" />
            <rect x={-75} y={-75} width={150} height={150} transform="rotate(45)" stroke="var(--color-brass)" strokeWidth="1.2" fill="none" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((ang) => (
              <circle
                key={ang}
                cx={50 * Math.cos((ang * Math.PI) / 180)}
                cy={50 * Math.sin((ang * Math.PI) / 180)}
                r={6}
                fill="var(--color-brass)"
                opacity="0.65"
              />
            ))}
          </g>

          {/* Counter-clockwise rotating harmonic petals */}
          <g className={styles.mandalaSpinReverse}>
            <circle r={80} stroke="var(--color-clay)" strokeWidth="1.2" fill="none" opacity="0.5" />
            <circle r={48} strokeDasharray="3 3" stroke="var(--color-maroon)" strokeWidth="1.2" fill="none" opacity="0.6" />
            <path
              d="M0 -96 C56 -76 88 -42 96 0 C88 42 56 76 0 96 C-56 76 -88 42 -96 0 C-88 -42 -56 -76 0 -96Z"
              stroke="var(--color-brass)"
              strokeWidth="1.4"
              fill="rgba(197, 160, 89, 0.04)"
            />
            <path
              d="M0 -96 C56 -76 88 -42 96 0 C88 42 56 76 0 96 C-56 76 -88 42 -96 0 C-88 -42 -56 -76 0 -96Z"
              transform="rotate(90)"
              stroke="var(--color-maroon)"
              strokeWidth="1.2"
              fill="rgba(139, 38, 53, 0.03)"
            />
          </g>

          {/* Coordinate cross lines */}
          <line x1={-170} y1={0} x2={170} y2={0} stroke="var(--color-maroon)" strokeWidth="1.2" strokeDasharray="5 4" opacity="0.4" />
          <line x1={0} y1={-170} x2={0} y2={170} stroke="var(--color-maroon)" strokeWidth="1.2" strokeDasharray="5 4" opacity="0.4" />

          {/* Pulsing Core */}
          <circle r="8" fill="var(--color-maroon)" opacity="0.8" className={styles.mandalaCore} />
          <circle r="3.5" fill="var(--color-linen)" />
        </g>

        {/* Vernacular Galaicha geometric rug in golden proportion */}
        <g opacity="0.85">
          <rect
            x={paddingX + 60}
            y={paddingY + roomH - 150}
            width={160}
            height={110}
            fill="rgba(178, 93, 52, 0.06)"
            stroke="var(--color-clay)"
            strokeWidth="1.4"
            strokeDasharray="4 3"
            rx="2"
          />
          <rect
            x={paddingX + 115}
            y={paddingY + roomH - 120}
            width={50}
            height={50}
            fill="none"
            stroke="var(--color-clay)"
            strokeWidth="1.2"
            transform={`rotate(45 ${paddingX + 140} ${paddingY + roomH - 95})`}
          />
          <text
            x={paddingX + 140}
            y={paddingY + roomH - 26}
            fill="var(--color-clay)"
            fontSize="8"
            fontFamily="var(--font-mono)"
            textAnchor="middle"
            letterSpacing="0.1em"
          >
            NEPALESE GALAICHA MOTIF
          </text>
        </g>

        {/* Timber Joinery / Kansa Brass Spec Callout */}
        <g opacity="0.85">
          <rect
            x={paddingX + roomW - 200}
            y={paddingY + 45}
            width={155}
            height={85}
            fill="#F4EFE6"
            stroke="var(--color-brass)"
            strokeWidth="1.4"
            rx="2"
          />
          <line x1={paddingX + roomW - 200} y1={paddingY + 70} x2={paddingX + roomW - 45} y2={paddingY + 70} stroke="var(--color-taupe)" strokeWidth="1" />
          <text
            x={paddingX + roomW - 122}
            y={paddingY + 62}
            fill="var(--color-brass)"
            fontSize="9"
            fontFamily="var(--font-mono)"
            fontWeight="600"
            textAnchor="middle"
            letterSpacing="0.12em"
          >
            PATAN BRASS // SPEC
          </text>
          <text
            x={paddingX + roomW - 190}
            y={paddingY + 88}
            fill="var(--color-ink)"
            fontSize="8"
            fontFamily="var(--font-mono)"
          >
            JOINERY: MORTISE & TENON
          </text>
          <text
            x={paddingX + roomW - 190}
            y={paddingY + 104}
            fill="var(--color-ink-muted)"
            fontSize="8"
            fontFamily="var(--font-mono)"
          >
            MATERIAL: BELL METAL (KANSA)
          </text>
          <text
            x={paddingX + roomW - 190}
            y={paddingY + 120}
            fill="var(--color-ink-muted)"
            fontSize="8"
            fontFamily="var(--font-mono)"
          >
            SUBSTRATE: LOKTA LINEN
          </text>
        </g>

        {/* Bottom Horizontal Dimension */}
        <line x1={paddingX} y1={viewH - 24} x2={paddingX + roomW} y2={viewH - 24} stroke="var(--color-ink-muted)" strokeWidth="1" />
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
          HARMONIC RATIO // 1.30 : 1.00
        </text>

        {/* Right Vertical Dimension */}
        <line x1={viewW - 24} y1={paddingY} x2={viewW - 24} y2={paddingY + roomH} stroke="var(--color-ink-muted)" strokeWidth="1" />
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
          KATHMANDU GRID
        </text>
      </svg>
    </div>
  );
}

export function AboutPage({ onBack, onOpenSheets }) {
  const prefersReducedMotion = useReducedMotion();
  const allRooms = useRoomStore((state) => state.allRooms);

  return (
    <div className={styles.aboutContainer}>
      {/* Header — Identical layout, markup, and styling to Landing Page */}
      <header className={styles.aboutHeader}>
        <button
          type="button"
          className={styles.brandLogo}
          onClick={onBack}
          title="Return to Studio Overview"
          aria-label="Return to Studio Overview"
        >
          <BrandMark size={28} className={styles.brandMarkIcon} />
          <div className={styles.mastheadLockup}>
            <span className={styles.brandTitle}>ROOM DESIGNER STUDIO</span>
            <span className={styles.brandSubTitle}>CAD // 2D // 3D SPATIAL WORKSHOP</span>
          </div>
        </button>

        <nav className={styles.headerMetaBlock} aria-label="Studio navigation">
          {/* Active About indicator that returns to overview */}
          <button
            type="button"
            className={`${styles.headerNavBtn} ${styles.headerNavBtnActive}`}
            onClick={onBack}
            title="Current page: About Room Designer Studio"
          >
            <Info size={13} strokeWidth={1.7} />
            ABOUT
          </button>

          <span className={styles.headerMetaDivider} aria-hidden="true" />

          {/* Interactive Sheets trigger button */}
          <button
            type="button"
            className={`${styles.headerNavBtn} ${styles.headerSheetsBtn}`}
            onClick={onOpenSheets || onBack}
            title="View saved architectural sheets"
            aria-label="View saved architectural sheets"
          >
            <Layers3 size={13} strokeWidth={1.7} />
            <span className={styles.headerSheetsLabel}>SHEETS</span>
            <span className={styles.headerSheetsCount}>{String(allRooms.length).padStart(2, '0')}</span>
          </button>
        </nav>
      </header>

      {/* Main Two-Column Viewport: Content on Left, Animated Stuff on Right */}
      <main className={styles.aboutMain}>
        {/* Left Column: Rich Architectural Content */}
        <section className={styles.aboutCopyColumn}>
          <div className={styles.aboutCopyContent}>
            <div className={styles.classificationTag}>
              STUDIO FOLIO // MONOGRAPH
            </div>

            <motion.h1
              className={styles.aboutHeading}
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              Form, Material<br />& Memory.
            </motion.h1>

            <p className={styles.aboutSecondaryTitle}>
              Rooted in Nepalese architectural traditions and precision CAD modeling.
            </p>

            <div className={styles.articleBody}>
              <p>
                <strong>Room Designer Studio</strong> is a dual-projection spatial design workshop.
                It couples orthographic 2D floor plan generation with real-time 3D spatial modeling,
                grounded in the craft cultures, materials, and proportions of the Kathmandu Valley.
              </p>
              <p>
                Every wall perimeter, mullion join, and placement grid is calibrated to honor authentic
                vernacular textures: hand-beaten Patan bell metal (<em>kansa</em> brass), fibrous handmade
                lokta paper drawing surfaces, timber mortise-and-tenon framing, and geometric Galaicha rug weaves.
              </p>
            </div>

            <div className={styles.materialPillRow}>
              <span className={styles.materialPill}>KANSA BRASS</span>
              <span className={styles.materialPill}>LOKTA LINEN</span>
              <span className={styles.materialPill}>TIMBER JOINERY</span>
              <span className={styles.materialPill}>GALAICHA WEAVE</span>
              <span className={styles.materialPill}>CAD ORTHO 2D/3D</span>
            </div>

            <p className={styles.creditParagraph}>
              Conceived, designed, and drafted with architectural precision by Niranjan.
            </p>
          </div>

          {/* Bottom Back Button matching Landing Page's EXPLORE SPACES row */}
          <button
            type="button"
            className={styles.backExploreBtn}
            onClick={onBack}
            title="Return to Drafting Workspace"
            aria-label="Return to Drafting Workspace"
          >
            <span className={styles.backIndicatorText}>RETURN TO WORKSPACE</span>
          </button>
        </section>

        {/* Right Column: Animated Architectural Stuff */}
        <section className={styles.aboutVisualColumn}>
          <AboutMonographPlate />
        </section>
      </main>

      {/* Footer Colophon */}
      <footer className={styles.colophon}>
        <div className={styles.colophonRule} />
        <span className={styles.colophonMark}>NIRANJAN</span>
      </footer>
    </div>
  );
}
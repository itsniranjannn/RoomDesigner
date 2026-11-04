import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Box, Building2, Layers, Plus, Share2 } from 'lucide-react';
import { useRoomStore } from '../../store/roomStore.js';
import { useFlatStore } from '../../store/flatStore.js';
import { Button } from '../common/Button.jsx';
import { HeroPlan } from './HeroPlan.jsx';
import { SheetsPanel } from './SheetsPanel.jsx';
import { SiteHeader } from './SiteHeader.jsx';
import styles from './AboutPage.module.css';

const FEATURES = [
  {
    icon: Layers,
    title: 'Plan in 2D',
    text: 'Place furniture to scale, snap it to walls and see how much space is left around doors and windows.',
  },
  {
    icon: Box,
    title: 'Look around in 3D',
    text: 'Switch to a 3D view, change the lighting, or walk through the room at eye level.',
  },
  {
    icon: Share2,
    title: 'Share or export',
    text: 'Copy a private link, or download the plan as a picture, a PDF or a file you can open again.',
  },
];

export function AboutPage({ onBack, onOpenNewRoomModal, onOpenNewFlatModal }) {
  const reduced = useReducedMotion();
  const allRooms = useRoomStore((state) => state.allRooms);
  const flats = useFlatStore((state) => state.flats);
  const [isSheetsPanelOpen, setIsSheetsPanelOpen] = useState(false);

  return (
    <div className={styles.page}>
      <SiteHeader
        onHome={onBack}
        onAbout={() => {}}
        aboutActive
        savedCount={allRooms.length + flats.length}
        onOpenSaved={() => setIsSheetsPanelOpen(true)}
      />

      <main className={styles.main}>
        <div className={styles.copy}>
          <motion.h1
            className={styles.title}
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            A simple way to plan a room.
          </motion.h1>
          <p className={styles.lead}>
            Room Designer Studio runs in your browser. Draw a room, fill it with furniture, check
            that it all fits, then look around in 3D. It includes pieces from Nepali homes, such as
            the chowki, pirka and charpai, and a flat designer for plans with several rooms.
          </p>

          <ul className={styles.features}>
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className={styles.feature}>
                <span className={styles.featureIcon}>
                  <Icon size={18} aria-hidden="true" />
                </span>
                <div>
                  <h2 className={styles.featureTitle}>{title}</h2>
                  <p className={styles.featureText}>{text}</p>
                </div>
              </li>
            ))}
          </ul>

          <p className={styles.note}>
            Your designs are saved on this device. Nothing is uploaded unless you share a link.
          </p>

          <div className={styles.actions}>
            <Button variant="primary" icon={<Plus size={16} />} onClick={onOpenNewRoomModal}>
              Start a new room
            </Button>
            <Button variant="secondary" icon={<Building2 size={16} />} onClick={onOpenNewFlatModal}>
              Design a flat
            </Button>
            <Button variant="ghost" onClick={onBack}>
              Back to start
            </Button>
          </div>
        </div>

        <div className={styles.visual}>
          <HeroPlan />
        </div>
      </main>

      <footer className={styles.footer}>Designed and built by Niranjan</footer>

      <SheetsPanel
        isOpen={isSheetsPanelOpen}
        onClose={() => setIsSheetsPanelOpen(false)}
        onOpenNewRoomModal={onOpenNewRoomModal}
        onOpenNewFlatModal={onOpenNewFlatModal}
      />
    </div>
  );
}

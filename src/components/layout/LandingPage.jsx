import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Building2, Plus } from 'lucide-react';
import { useRoomStore } from '../../store/roomStore.js';
import { useFlatStore } from '../../store/flatStore.js';
import { Button } from '../common/Button.jsx';
import { HeroPlan } from './HeroPlan.jsx';
import { SheetsPanel } from './SheetsPanel.jsx';
import { SiteHeader } from './SiteHeader.jsx';
import styles from './LandingPage.module.css';

export function LandingPage({ onOpenNewRoomModal, onOpenNewFlatModal, onNavigateAbout }) {
  const allRooms = useRoomStore((state) => state.allRooms);
  const flats = useFlatStore((state) => state.flats);
  const [isSheetsPanelOpen, setIsSheetsPanelOpen] = useState(false);
  const reduced = useReducedMotion();

  const rise = (delay) => ({
    initial: reduced ? false : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] },
  });

  return (
    <div className={styles.page}>
      <SiteHeader
        onHome={() => setIsSheetsPanelOpen(false)}
        onAbout={onNavigateAbout}
        savedCount={allRooms.length + flats.length}
        onOpenSaved={() => setIsSheetsPanelOpen(true)}
      />

      <main className={styles.hero}>
        <div className={styles.copy}>
          <motion.p className={styles.eyebrow} {...rise(0)}>Room and flat planner</motion.p>
          <motion.h1 className={styles.title} {...rise(0.08)}>
            Design your room, then walk through it.
          </motion.h1>
          <motion.p className={styles.lead} {...rise(0.16)}>
            Place furniture on a 2D plan, check that everything fits, and look around in 3D.
            Includes pieces from Nepali homes.
          </motion.p>
          <motion.div className={styles.actions} {...rise(0.24)}>
            <Button variant="primary" icon={<Plus size={16} />} onClick={onOpenNewRoomModal}>
              Start a new room
            </Button>
            <Button variant="secondary" icon={<Building2 size={16} />} onClick={onOpenNewFlatModal}>
              Design a flat
            </Button>
          </motion.div>
          <motion.p className={styles.note} {...rise(0.3)}>Your designs are saved in this browser.</motion.p>
        </div>

        <div className={styles.visual}>
          <HeroPlan />
        </div>
      </main>

      <footer className={styles.footer}>Made by Niranjan</footer>

      <SheetsPanel
        isOpen={isSheetsPanelOpen}
        onClose={() => setIsSheetsPanelOpen(false)}
        onOpenNewRoomModal={onOpenNewRoomModal}
        onOpenNewFlatModal={onOpenNewFlatModal}
      />
    </div>
  );
}

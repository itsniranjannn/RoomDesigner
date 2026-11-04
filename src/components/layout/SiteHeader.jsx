import React from 'react';
import { FolderOpen, Info } from 'lucide-react';
import { BrandMark } from '../common/BrandMark.jsx';
import { Button } from '../common/Button.jsx';
import styles from './SiteHeader.module.css';

const HOME_LABEL = 'Room Designer Studio home';

/** Logo and wordmark. Always the way back to the overview. */
function Brand({ onHome, label = HOME_LABEL }) {
  return (
    <button type="button" className={styles.brand} onClick={onHome} aria-label={label} title={label}>
      <BrandMark size={30} />
      <span className={styles.name}>Room Designer Studio</span>
    </button>
  );
}

/** Top strip shared by the landing and about pages. */
export function SiteHeader({ onHome, onAbout, aboutActive = false, savedCount, onOpenSaved }) {
  return (
    <header className={styles.header}>
      <Brand onHome={onHome} />

      <nav className={styles.nav} aria-label="Main">
        {onAbout && (
          <Button
            variant="ghost"
            icon={<Info size={16} />}
            onClick={onAbout}
            aria-current={aboutActive ? 'page' : undefined}
            className={aboutActive ? styles.current : undefined}
          >
            About
          </Button>
        )}
        <Button variant="ghost" icon={<FolderOpen size={16} />} onClick={onOpenSaved}>
          My designs
          <span className={styles.count} aria-label={`${savedCount} saved`}>{savedCount}</span>
        </Button>
      </nav>
    </header>
  );
}

/**
 * Header for the room editor and the flat designer: the same brand as the landing page,
 * then three slots. `start` holds the title, `center` the history and view controls,
 * `end` the actions. The centre stays centred whatever the sides contain.
 */
export function AppHeader({ onHome, homeLabel, start, center, end }) {
  return (
    <header className={`${styles.header} ${styles.bar}`}>
      <div className={styles.start}>
        <Brand onHome={onHome} label={homeLabel} />
        {start}
      </div>
      <div className={styles.center}>{center}</div>
      <div className={styles.end}>{end}</div>
    </header>
  );
}

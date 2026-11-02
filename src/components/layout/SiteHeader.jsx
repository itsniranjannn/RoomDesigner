import React from 'react';
import { FolderOpen, Info } from 'lucide-react';
import { BrandMark } from '../common/BrandMark.jsx';
import { Button } from '../common/Button.jsx';
import styles from './SiteHeader.module.css';

/** Top strip shared by the landing and about pages. */
export function SiteHeader({ onHome, onAbout, aboutActive = false, savedCount, onOpenSaved }) {
  return (
    <header className={styles.header}>
      <button type="button" className={styles.brand} onClick={onHome} aria-label="Room Designer Studio home">
        <BrandMark size={30} />
        <span className={styles.name}>Room Designer Studio</span>
      </button>

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

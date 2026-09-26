import React from 'react';
import { BrandMark } from '../common/BrandMark.jsx';
import { Button } from '../common/Button.jsx';
import { ArrowLeft } from 'lucide-react';
import styles from './AboutPage.module.css';

export function AboutPage({ onBack }) {
  return (
    <div className={styles.aboutContainer}>
      <header className={styles.aboutHeader}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={onBack}
            title="Return to Studio Overview"
            aria-label="Return to Studio Overview"
          >
            <BrandMark size={28} className={styles.brandMarkIcon} />
            <div className={styles.mastheadLockup}>
              <span className={styles.brandTitle}>ROOM STUDIO</span>
              <span className={styles.brandSubTitle}>CAD // 3D ARCHITECTURAL STUDIO</span>
            </div>
          </button>
        </div>

        <div className={styles.headerRight}>
          <Button
            variant="secondary"
            size="small"
            onClick={onBack}
            icon={<ArrowLeft size={13} />}
          >
            Back to Studio
          </Button>
        </div>
      </header>

      <main className={styles.aboutMain}>
        <div className={styles.aboutCard}>
          <div className={styles.brassTopRule} />

          <div className={styles.classificationTag}>
            STUDIO FOLIO // MONOGRAPH
          </div>

          <h1 className={styles.aboutHeading}>About Room Studio</h1>

          <div className={styles.brassDivider} />

          <div className={styles.articleBody}>
            <p>
              Room Studio is an architectural drafting environment and space planning system
              rooted in traditional Nepalese architectural proportions, material cultures, and craft disciplines.
              It couples orthographic 2D floor plan generation with real-time 3D spatial modeling.
            </p>

            <p>
              The platform references the timeless vernacular craftsmanship of the Kathmandu Valley:
              hand-beaten Patan bell metal (kansa brass), fibrous handmade lokta paper surfaces,
              hand-knotted Tibetan-Nepali Galaicha geometries, and timber joinery traditions.
              Every projection, grid line, and dimension rule is engineered to maintain pure drafting rigor.
            </p>

            <p className={styles.creditParagraph}>
              An architectural studio conceived and drafted by Niranjan.
            </p>
          </div>

          <div className={styles.cardColophon}>
            <div className={styles.colophonLine} />
            <span className={styles.colophonMark}>NIRANJAN</span>
          </div>
        </div>
      </main>

      <footer className={styles.pageFooter}>
        <div className={styles.footerRule} />
        <span className={styles.footerMark}>NIRANJAN</span>
      </footer>
    </div>
  );
}
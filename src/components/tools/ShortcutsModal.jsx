import React from 'react';
import { Modal } from '../common/Modal.jsx';
import styles from './Tools.module.css';

// Keys are written as "Ctrl + A"; "/" separates alternatives
const SECTIONS = [
  {
    title: 'Selecting',
    rows: [
      ['Click', 'Select a piece'],
      ['Shift + Click', 'Add or remove a piece'],
      ['Drag', 'Box-select on empty floor'],
      ['Ctrl + A', 'Select all pieces'],
      ['Esc', 'Clear selection or leave measuring'],
    ],
  },
  {
    title: 'Editing',
    rows: [
      ['Arrows', 'Nudge 1 cm (Shift: 10 cm)'],
      ['R', 'Rotate 15 degrees (Shift: 45)'],
      ['Ctrl + C / V', 'Copy and paste'],
      ['Ctrl + D', 'Duplicate'],
      ['Delete', 'Remove selection'],
      ['Ctrl + Z / Y', 'Undo and redo'],
    ],
  },
  {
    title: 'Tools',
    rows: [
      ['M', 'Measure distance'],
      ['?', 'Show this list'],
    ],
  },
  {
    title: '3D view',
    rows: [
      ['Drag', 'Orbit the camera'],
      ['Right-drag', 'Pan the camera'],
      ['W / A / S / D', 'Walk in the walkthrough'],
      ['Esc', 'Leave the walkthrough'],
    ],
  },
];

function Keys({ text }) {
  const parts = text.split(/ ([+/]) /);
  return (
    <span className={styles.keys}>
      {parts.map((part, i) => (i % 2 === 1 ? <span key={i} aria-hidden="true">{part}</span> : <kbd key={i} className={styles.kbd}>{part}</kbd>))}
    </span>
  );
}

export function ShortcutsModal({ onClose }) {
  return (
    <Modal title="Keyboard shortcuts" subtitle="Plan shortcuts work while the 2D plan is showing." onClose={onClose} size="lg">
      <div className={styles.shortcutGrid}>
        {SECTIONS.map((section) => (
          <section key={section.title} className={styles.section}>
            <h3 className={styles.sectionTitle}>{section.title}</h3>
            <ul className={styles.keyList}>
              {section.rows.map(([keys, text]) => (
                <li key={text} className={styles.keyRow}>
                  <Keys text={keys} />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  );
}

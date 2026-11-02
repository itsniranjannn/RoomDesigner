import React from 'react';
import { Modal } from '../common/Modal.jsx';
import styles from '../common/Modal.module.css';

const SECTIONS = [
  {
    title: 'Selection',
    rows: [
      [['Click'], 'Select a piece'],
      [['Shift', 'Click'], 'Add or remove a piece from the selection'],
      [['Drag'], 'Drag on empty floor to box-select'],
      [['Ctrl', 'A'], 'Select all pieces'],
      [['Esc'], 'Clear selection / leave measure tool'],
    ],
  },
  {
    title: 'Editing',
    rows: [
      [['Arrows'], 'Nudge 1 cm (hold Shift for 10 cm)'],
      [['R'], 'Rotate 15° (Shift: 45°)'],
      [['Ctrl', 'C'], 'Copy selection'],
      [['Ctrl', 'V'], 'Paste (offset from the original)'],
      [['Ctrl', 'D'], 'Duplicate selection'],
      [['Del'], 'Remove selection'],
      [['Ctrl', 'Z'], 'Undo'],
      [['Ctrl', 'Y'], 'Redo (also Ctrl+Shift+Z)'],
    ],
  },
  {
    title: 'Tools',
    rows: [
      [['M'], 'Measure tool: click two points'],
      [['?'], 'Show this help'],
    ],
  },
];

export function ShortcutsModal({ onClose }) {
  return (
    <Modal title="Keyboard shortcuts" subtitle="Shortcuts work on the 2D drafting canvas." onClose={onClose} width={520}>
      {SECTIONS.map((section) => (
        <section key={section.title}>
          <div className={styles.label} style={{ marginBottom: 6 }}>{section.title}</div>
          <table className={styles.table}>
            <tbody>
              {section.rows.map(([keys, text]) => (
                <tr key={text}>
                  <td style={{ whiteSpace: 'nowrap', width: 150 }}>
                    {keys.map((k, i) => (
                      <React.Fragment key={k}>
                        {i > 0 && ' + '}
                        <span className={styles.kbd}>{k}</span>
                      </React.Fragment>
                    ))}
                  </td>
                  <td>{text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </Modal>
  );
}

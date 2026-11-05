import React, { useState } from 'react';
import { Button } from '../common/Button.jsx';
import { clearErrorLog, copyText, formatErrorLog, readErrorLog } from '../../utils/errorLog.js';
import styles from './Diagnostics.module.css';

/**
 * Small "Diagnostics" section: how many problems this browser has recorded, with Copy and
 * Clear. The log stays on this device; Copy is for pasting into a bug report.
 */
export function Diagnostics() {
  const [entries, setEntries] = useState(() => readErrorLog());
  const [status, setStatus] = useState('');

  const copy = async () => {
    const ok = await copyText(formatErrorLog(entries));
    setStatus(ok ? 'Copied. Paste it into your bug report.' : 'Could not copy to the clipboard.');
  };
  const clear = () => {
    clearErrorLog();
    setEntries([]);
    setStatus('Cleared.');
  };

  const count = entries.length;
  return (
    <section className={styles.diagnostics} aria-labelledby="diagnostics-title">
      <h3 id="diagnostics-title" className={styles.title}>
        Diagnostics
      </h3>
      <p className={styles.text}>
        {count === 0
          ? 'No problems recorded on this device.'
          : `${count} ${count === 1 ? 'problem' : 'problems'} recorded on this device. They hold no room contents and are never sent anywhere.`}
      </p>
      <div className={styles.actions}>
        <Button size="small" onClick={copy}>
          Copy
        </Button>
        <Button size="small" variant="ghost" onClick={clear} disabled={count === 0}>
          Clear
        </Button>
        <span className={styles.status} role="status">
          {status}
        </span>
      </div>
    </section>
  );
}

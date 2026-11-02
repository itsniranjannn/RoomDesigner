import React, { useMemo } from 'react';
import { Modal } from '../common/Modal.jsx';
import { Button } from '../common/Button.jsx';
import { Download } from 'lucide-react';
import { useRoomStore } from '../../store/roomStore.js';
import { buildBillOfMaterials, billToCsv, formatNpr } from '../../engine/cost.js';
import { downloadBlob } from '../../engine/exportPlan.js';
import styles from '../common/Modal.module.css';

export function CostModal({ onClose }) {
  const room = useRoomStore((state) => state.room);
  const bill = useMemo(() => buildBillOfMaterials(room), [room]);

  const handleCsv = () => {
    const name = (room?.name || 'room').replace(/[^a-zA-Z0-9_-]/g, '_');
    downloadBlob(new Blob([billToCsv(bill)], { type: 'text/csv' }), `${name}-bill-of-materials.csv`);
  };

  return (
    <Modal
      title="Bill of materials"
      subtitle={room ? `${room.name} · estimated furnishing cost` : undefined}
      onClose={onClose}
      width={680}
      footer={
        <>
          <Button variant="secondary" size="small" icon={<Download size={12} />} onClick={handleCsv} disabled={bill.rows.length === 0}>
            Download CSV
          </Button>
          <Button variant="primary" size="small" onClick={onClose}>Done</Button>
        </>
      }
    >
      {bill.rows.length === 0 ? (
        <p className={styles.note}>No furniture placed yet. Add pieces from the library to see a cost estimate.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Item</th>
              <th>Size</th>
              <th className={styles.num}>Qty</th>
              <th className={styles.num}>Unit</th>
              <th className={styles.num}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {bill.rows.map((row) => (
              <tr key={row.key}>
                <td>
                  {row.color && <span className={styles.swatch} style={{ background: row.color }} aria-hidden="true" />}
                  {row.name}
                </td>
                <td>{row.sizeLabel}</td>
                <td className={styles.num}>{row.qty}</td>
                <td className={styles.num}>{formatNpr(row.unitPrice)}</td>
                <td className={styles.num}>{formatNpr(row.subtotal)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={4}><strong>Total</strong></td>
              <td className={styles.num}><strong>{formatNpr(bill.total)}</strong></td>
            </tr>
          </tbody>
        </table>
      )}
      <p className={styles.note}>
        Prices are rough estimates from category rates and furniture volume. Set an exact price per piece in the
        inspector (Price field) to override the estimate.
      </p>
    </Modal>
  );
}

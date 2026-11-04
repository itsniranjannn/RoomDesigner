import React from 'react';
import { Modal } from './Modal.jsx';
import { Button } from './Button.jsx';

/** Yes/no dialog for actions that cannot be undone. */
export function ConfirmDialog({ title, message, confirmLabel = 'Delete', cancelLabel = 'Cancel', danger = true, onConfirm, onClose }) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{cancelLabel}</Button>
          <Button variant={danger ? 'dangerSolid' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      <p>{message}</p>
    </Modal>
  );
}

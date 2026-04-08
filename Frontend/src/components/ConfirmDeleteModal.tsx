import { useEffect, useRef } from 'react';
import './ConfirmDeleteModal.css';

interface ConfirmDeleteModalProps {
  /** Controls whether the modal is rendered and visible. */
  isOpen: boolean;
  /** The human-readable name of the item being deleted, shown in the message. */
  itemName: string;
  /** Optional loading state while deletion request is in progress. */
  isConfirming?: boolean;
  /** Called when the user clicks the red Delete button. */
  onConfirm: () => void;
  /** Called when the user clicks Cancel or presses Escape. */
  onCancel: () => void;
}

/**
 * Reusable confirmation dialog for destructive delete actions.
 *
 * Accessibility notes
 * -------------------
 * • Uses the native <dialog> element with showModal() so the browser handles
 *   focus trapping automatically — no focus-trap library needed.
 * • ESC key fires the dialog's 'cancel' event which we intercept and forward
 *   to the onCancel prop so React controls the open/closed state.
 * • The Cancel button receives autoFocus so the keyboard cursor never starts
 *   on the destructive action by default.
 * • aria-labelledby and aria-describedby wire the title and body to the role.
 */
export default function ConfirmDeleteModal({
  isOpen,
  itemName,
  isConfirming = false,
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Open / close the native dialog imperatively in sync with the isOpen prop.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Intercept the native 'cancel' event (fired by ESC) so React controls state.
  // Without preventDefault() the browser would close the dialog on its own and
  // React's isOpen prop would fall out of sync with the DOM.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleNativeCancel = (e: Event) => {
      e.preventDefault();
      onCancel();
    };

    dialog.addEventListener('cancel', handleNativeCancel);
    return () => dialog.removeEventListener('cancel', handleNativeCancel);
  }, [onCancel]);

  return (
    <dialog
      ref={dialogRef}
      className="cdm"
      aria-labelledby="cdm-title"
      aria-describedby="cdm-body"
      // Clicking the backdrop (outside .cdm__inner) should cancel.
      onClick={(e) => {
        if (e.target === e.currentTarget && !isConfirming) onCancel();
      }}
    >
      {/* Stop clicks inside the card from bubbling up to the backdrop handler */}
      <div className="cdm__inner" onClick={(e) => e.stopPropagation()}>
        <div className="cdm__icon" aria-hidden="true">
          ⚠️
        </div>

        <h2 id="cdm-title" className="cdm__title">
          Delete {itemName}?
        </h2>

        <p id="cdm-body" className="cdm__body">
          Are you sure you want to delete{' '}
          <span className="cdm__item-name">{itemName}</span>?{' '}
          This action cannot be undone.
        </p>

        <div className="cdm__actions">
          {/*
           * autoFocus on Cancel so the keyboard cursor never starts on the
           * destructive button — the user must actively move to Delete.
           */}
          <button
            type="button"
            className="admin-btn cdm__cancel"
            onClick={onCancel}
            autoFocus
            disabled={isConfirming}
          >
            Cancel
          </button>

          <button
            type="button"
            className="admin-btn cdm__delete"
            onClick={onConfirm}
            disabled={isConfirming}
          >
            {isConfirming ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </dialog>
  );
}

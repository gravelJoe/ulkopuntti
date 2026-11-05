// App-styled replacement for window.confirm().
//
//   const confirm = useConfirm();
//   if (!(await confirm({ title, message, confirmLabel, destructive }))) return;
//
// Resolves true (confirm button), false (cancel button) or null (dismissed
// by tapping outside / Escape). Pass cancelLabel: null for a one-button alert.

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';

const ConfirmContext = createContext(() => Promise.resolve(false));

export const useConfirm = () => useContext(ConfirmContext);

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);

  const confirm = useCallback(
    (options) => new Promise((resolve) => setDialog({ ...options, resolve })),
    [],
  );

  function close(result) {
    dialog.resolve(result);
    setDialog(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && <ConfirmDialog {...dialog} onClose={close} />}
    </ConfirmContext.Provider>
  );
}

function ConfirmDialog({ title, message, confirmLabel = 'OK', cancelLabel = 'Cancel', destructive, onClose }) {
  const titleId = useId();
  const messageId = useId();
  const cancelRef = useRef(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose(null);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="dialog-backdrop" onClick={() => onClose(null)}>
      <div
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={message ? messageId : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="dialog-title">
          {title}
        </h2>
        {message && (
          <p id={messageId} className="dialog-message">
            {message}
          </p>
        )}
        <div className="dialog-actions">
          {cancelLabel !== null && (
            <button ref={cancelRef} className="button-secondary dialog-btn" onClick={() => onClose(false)}>
              {cancelLabel}
            </button>
          )}
          <button
            ref={cancelLabel === null ? cancelRef : undefined}
            className={`${destructive ? 'button-destructive' : 'button-primary'} dialog-btn`}
            onClick={() => onClose(true)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

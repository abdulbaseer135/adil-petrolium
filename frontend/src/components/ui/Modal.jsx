import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 520,
}) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="app-modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="app-modal-container"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'app-modal-title' : undefined}
      >
        {/* Header */}
        <div className="app-modal-header">
          {title && (
            <h3 id="app-modal-title" className="app-modal-title">
              {title}
            </h3>
          )}
          <button
            type="button"
            onClick={onClose}
            className="app-modal-close-btn"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="app-modal-body">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="app-modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default Modal;

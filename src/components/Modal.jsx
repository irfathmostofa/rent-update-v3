// components/Modal.jsx
import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  maxHeight = "90vh",
  showCloseButton = true,
  closeOnOverlayClick = true,
  className = "",
  headerClassName = "",
  bodyClassName = "",
  footerClassName = "",
  footer,
}) {
  const modalRef = useRef(null);

  // Handle escape key press
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Handle overlay click
  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  // Size classes
  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
    full: "max-w-[95vw]",
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      <div
        ref={modalRef}
        className={`modal-content ${sizeClasses[size]} ${className}`}
        style={{ maxHeight }}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className={`modal-header ${headerClassName}`}>
            {title && (
              <h3 id="modal-title" className="modal-title">
                {title}
              </h3>
            )}
            {showCloseButton && (
              <button
                className="modal-close-btn"
                onClick={onClose}
                aria-label="Close modal"
              >
                <X size={24} />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className={`modal-body ${bodyClassName}`}>{children}</div>

        {/* Footer */}
        {footer && (
          <div className={`modal-footer ${footerClassName}`}>{footer}</div>
        )}
      </div>
    </div>
  );
}
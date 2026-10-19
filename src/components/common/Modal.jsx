import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Universal Modal Wrapper Component
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {Function} props.onClose - Close callback
 * @param {string|React.ReactNode} props.title - Modal title
 * @param {React.ReactNode} [props.icon] - Icon placed next to title
 * @param {string} [props.maxWidth='520px'] - Max width of dialog container
 * @param {boolean} [props.showCloseBtn=true] - Whether to show the top-right X button
 * @param {React.ReactNode} [props.footer] - Optional footer content
 * @param {React.ReactNode} props.children - Modal body content
 */
export const Modal = ({
    isOpen,
    onClose,
    title,
    icon,
    maxWidth = '520px',
    showCloseBtn = true,
    footer,
    children
}) => {
    // ESC key listener to close modal
    useEffect(() => {
        if (!isOpen || !onClose) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div 
            className="modal-overlay" 
            style={{ zIndex: 1100 }} 
            onClick={(e) => {
                if (e.target === e.currentTarget && onClose) onClose();
            }}
        >
            <div 
                className="modal-card" 
                style={{ 
                    maxWidth, 
                    width: '100%', 
                    maxHeight: '92vh', 
                    display: 'flex', 
                    flexDirection: 'column',
                    animation: 'fadeIn 0.2s ease-out'
                }}
            >
                {/* Header */}
                {(title || showCloseBtn) && (
                    <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {icon && <span style={{ color: 'var(--primary)' }}>{icon}</span>}
                            {title && <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>{title}</h3>}
                        </div>
                        {showCloseBtn && onClose && (
                            <button
                                type="button"
                                onClick={onClose}
                                className="btn-close-modal"
                                style={{
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    padding: '6px',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>
                )}

                {/* Body */}
                <div className="modal-body" style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;

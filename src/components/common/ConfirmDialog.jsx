import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

/**
 * Universal Confirm Dialog Modal
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Function} props.onConfirm
 * @param {string} props.title
 * @param {string|React.ReactNode} props.message
 * @param {'danger'|'warning'|'info'} [props.type='warning']
 * @param {string} [props.confirmText='ยืนยัน']
 * @param {string} [props.cancelText='ยกเลิก']
 */
export const ConfirmDialog = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    type = 'warning',
    confirmText = 'ยืนยัน',
    cancelText = 'ยกเลิก'
}) => {
    const iconMap = {
        danger: <AlertTriangle size={22} style={{ color: '#ef4444' }} />,
        warning: <AlertTriangle size={22} style={{ color: '#f59e0b' }} />,
        info: <Info size={22} style={{ color: '#3b82f6' }} />
    };

    const confirmVariant = type === 'danger' ? 'danger' : (type === 'warning' ? 'warning' : 'primary');

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            icon={iconMap[type]}
            maxWidth="440px"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        {cancelText}
                    </Button>
                    <Button 
                        variant={confirmVariant} 
                        onClick={() => {
                            if (onConfirm) onConfirm();
                            if (onClose) onClose();
                        }}
                    >
                        {confirmText}
                    </Button>
                </>
            }
        >
            <div style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text-main)' }}>
                {message}
            </div>
        </Modal>
    );
};

export default ConfirmDialog;

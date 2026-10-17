import React from 'react';

/**
 * Universal Badge / Chip Primitive
 * @param {Object} props
 * @param {'success'|'warning'|'danger'|'info'|'purple'|'neutral'} [props.variant='neutral']
 * @param {React.ReactNode} [props.icon]
 * @param {React.CSSProperties} [props.style]
 * @param {React.ReactNode} props.children
 */
export const Badge = ({
    variant = 'neutral',
    icon,
    style = {},
    children
}) => {
    const variantStyles = {
        success: {
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#10b981',
            border: '1px solid rgba(16, 185, 129, 0.3)'
        },
        warning: {
            background: 'rgba(245, 158, 11, 0.15)',
            color: '#f59e0b',
            border: '1px solid rgba(245, 158, 11, 0.3)'
        },
        danger: {
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.3)'
        },
        info: {
            background: 'rgba(59, 130, 246, 0.15)',
            color: '#3b82f6',
            border: '1px solid rgba(59, 130, 246, 0.3)'
        },
        purple: {
            background: 'rgba(168, 85, 247, 0.15)',
            color: '#a855f7',
            border: '1px solid rgba(168, 85, 247, 0.3)'
        },
        neutral: {
            background: 'rgba(255, 255, 255, 0.08)',
            color: 'var(--text-muted)',
            border: '1px solid rgba(255, 255, 255, 0.12)'
        }
    };

    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '8px',
                whiteSpace: 'nowrap',
                ...variantStyles[variant],
                ...style
            }}
        >
            {icon}
            {children}
        </span>
    );
};

export default Badge;

import React from 'react';

/**
 * Universal Card / Panel Primitive
 * @param {Object} props
 * @param {string|React.ReactNode} [props.title]
 * @param {React.ReactNode} [props.icon]
 * @param {React.ReactNode} [props.actions] - Header right-side actions
 * @param {string} [props.className='']
 * @param {React.CSSProperties} [props.style]
 * @param {React.ReactNode} props.children
 */
export const Card = ({
    title,
    icon,
    actions,
    className = '',
    style = {},
    children
}) => {
    return (
        <div 
            className={`panel ${className}`.trim()}
            style={{
                borderRadius: '16px',
                border: '1px solid var(--border-glow)',
                background: 'var(--bg-card)',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
                ...style
            }}
        >
            {(title || actions) && (
                <div 
                    className="panel-header"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        paddingBottom: '14px',
                        marginBottom: '16px'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {icon && <span style={{ color: 'var(--primary)' }}>{icon}</span>}
                        {title && <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>{title}</h3>}
                    </div>
                    {actions && <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>{actions}</div>}
                </div>
            )}
            <div className="panel-body">
                {children}
            </div>
        </div>
    );
};

export default Card;

import React from 'react';

/**
 * Universal Tab Group Primitive
 * @param {Object} props
 * @param {Array<{ key: string, label: string|React.ReactNode, icon?: React.ReactNode, badge?: number|string }>} props.tabs
 * @param {string} props.activeTab
 * @param {Function} props.onChange
 * @param {React.CSSProperties} [props.style]
 */
export const TabGroup = ({
    tabs = [],
    activeTab,
    onChange,
    style = {}
}) => {
    return (
        <div 
            style={{
                display: 'inline-flex',
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '4px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                gap: '4px',
                ...style
            }}
        >
            {tabs.map(tab => {
                const isActive = tab.key === activeTab;
                return (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => onChange(tab.key)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            background: isActive ? 'var(--primary)' : 'transparent',
                            color: isActive ? '#ffffff' : 'var(--text-muted)',
                            boxShadow: isActive ? '0 2px 8px rgba(16, 185, 129, 0.35)' : 'none'
                        }}
                    >
                        {tab.icon && <span>{tab.icon}</span>}
                        <span>{tab.label}</span>
                        {tab.badge !== undefined && (
                            <span 
                                style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    padding: '1px 6px',
                                    borderRadius: '10px',
                                    background: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
                                    color: '#ffffff'
                                }}
                            >
                                {tab.badge}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
};

export default TabGroup;

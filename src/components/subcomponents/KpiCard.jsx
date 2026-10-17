import React from 'react';
import { useApp } from '../../context/AppContext';

export const KpiCard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    color = '#38bdf8', 
    badge,
    onClick 
}) => {
    const { theme } = useApp();

    return (
        <div 
            className="kpi-card" 
            onClick={onClick}
            style={{ 
                background: theme === 'light' ? '#ffffff' : 'rgba(15, 23, 42, 0.75)', 
                border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)', 
                borderRadius: '16px', 
                padding: '18px 20px', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                gap: '12px',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: theme === 'light' ? '0 4px 14px rgba(0,0,0,0.04)' : '0 4px 20px rgba(0,0,0,0.25)',
                cursor: onClick ? 'pointer' : 'default',
                transition: 'all 0.2s ease-in-out'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {title}
                    </span>
                    <h2 style={{ fontSize: '26px', fontWeight: 800, margin: '6px 0 0 0', color: theme === 'light' ? '#0f172a' : '#f8fafc', lineHeight: 1.1 }}>
                        {value}
                    </h2>
                </div>
                {Icon && (
                    <div style={{ 
                        width: '42px', 
                        height: '42px', 
                        borderRadius: '12px', 
                        background: `${color}1a`, 
                        border: `1px solid ${color}33`, 
                        color: color, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        flexShrink: 0
                    }}>
                        {React.isValidElement(Icon) ? Icon : <Icon size={20} />}
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                {subtitle && (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {subtitle}
                    </span>
                )}
                {badge && (
                    <span style={{ 
                        fontSize: '11px', 
                        fontWeight: 700, 
                        padding: '3px 8px', 
                        borderRadius: '20px', 
                        background: `${color}15`, 
                        color: color, 
                        border: `1px solid ${color}30` 
                    }}>
                        {badge}
                    </span>
                )}
            </div>

            {/* Subtle top/bottom color bar */}
            <div style={{ 
                position: 'absolute', 
                bottom: 0, 
                left: 0, 
                right: 0, 
                height: '3px', 
                background: color, 
                opacity: 0.75 
            }} />
        </div>
    );
};

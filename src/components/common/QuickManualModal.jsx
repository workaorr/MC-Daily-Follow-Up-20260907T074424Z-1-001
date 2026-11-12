import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    ArrowRight,
    BookOpen,
    CheckCircle2,
    CheckSquare,
    History,
    Lightbulb,
    PieChart,
    Shield,
    ShieldCheck,
    Sparkles,
    Trash2,
    UploadCloud,
    UserPlus,
    Users,
    X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { QUICK_MANUAL_CATEGORIES } from '../../constants/manualGuides';

const ICON_MAP = {
    supervisor: PieChart,
    agent: Users,
    'upload-deposits': UploadCloud,
    'new-customer': UserPlus,
    audit: ShieldCheck,
    backoffice: Shield,
    'audit-logs': History,
    'recycle-bin': Trash2,
    'daily-checklist': CheckSquare
};

const getHasPermission = (permissionKey, perms, isSupervisor) => {
    if (isSupervisor || permissionKey === 'always') return true;
    if (permissionKey === 'canDashboard') return perms.canDashboard !== false;
    if (permissionKey === 'canFollowUp') return perms.canFollowUp !== false;
    if (permissionKey === 'canNewCustomer') return perms.canNewCustomer !== false;
    if (permissionKey === 'canAudit') return Boolean(perms.canAudit);
    if (permissionKey === 'canBackOffice') return Boolean(perms.canBackOffice);
    return false;
};

export const QuickManualModal = ({ isOpen, onClose }) => {
    const {
        lang,
        theme,
        viewMode,
        setViewMode,
        activeAgent,
        isSupervisor
    } = useApp();

    const isLight = theme === 'light';
    const isTH = lang === 'TH';

    const visibleCategories = useMemo(() => {
        const perms = activeAgent?.permissions || {};
        return QUICK_MANUAL_CATEGORIES.filter((item) => getHasPermission(item.permissionKey, perms, isSupervisor));
    }, [activeAgent, isSupervisor]);

    const menuCount = useMemo(
        () => visibleCategories.filter((item) => !item.isChecklist).length,
        [visibleCategories]
    );

    const [selectedId, setSelectedId] = useState('supervisor');

    useEffect(() => {
        if (!isOpen) return;
        const matched = visibleCategories.find((item) => item.viewMode === viewMode);
        if (matched) {
            setSelectedId(matched.id);
        } else if (visibleCategories.length > 0) {
            setSelectedId(visibleCategories[0].id);
        }
    }, [isOpen, viewMode, visibleCategories]);

    useEffect(() => {
        if (!isOpen) return undefined;
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const activeGuide = visibleCategories.find((item) => item.id === selectedId) || visibleCategories[0];
    if (!activeGuide) return null;

    const activeMenuOrder = activeGuide.isChecklist
        ? '✓'
        : String(visibleCategories.filter((item) => !item.isChecklist).findIndex((item) => item.id === activeGuide.id) + 1);

    const ActiveIcon = ICON_MAP[activeGuide.id] || BookOpen;
    const tKey = isTH ? 'TH' : 'EN';
    const stepsList = activeGuide.steps[tKey] || [];
    const showSupervisorNote = Boolean(activeGuide.supervisorNote && isSupervisor);
    const isCurrentView = activeGuide.viewMode && activeGuide.viewMode === viewMode;

    const handleJumpToMenu = () => {
        if (!activeGuide.viewMode) return;
        setViewMode(activeGuide.viewMode);
        onClose();
    };

    const modalSurface = isLight ? '#ffffff' : '#0f172a';
    const sidebarSurface = isLight ? '#f8fafc' : 'rgba(15, 23, 42, 0.85)';
    const cardSurface = isLight ? '#f8fafc' : 'rgba(30, 41, 59, 0.58)';
    const borderCol = isLight ? '#e2e8f0' : 'rgba(148, 163, 184, 0.18)';
    const textPrimary = isLight ? '#0f172a' : '#f8fafc';
    const textSecondary = isLight ? '#475569' : '#cbd5e1';
    const textMuted = isLight ? '#64748b' : '#94a3b8';

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label={isTH ? 'คู่มือการใช้งานแต่ละเมนู' : 'Quick Menu Manual'}
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                background: isLight ? 'rgba(15, 23, 42, 0.45)' : 'rgba(2, 6, 23, 0.72)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px'
            }}
        >
            <style>{`
                .quick-manual-shell {
                    width: 100%;
                    max-width: 920px;
                    max-height: min(86vh, 720px);
                    display: flex;
                    flex-direction: column;
                    border-radius: 18px;
                    overflow: hidden;
                    animation: quickManualPop 0.18s ease-out;
                }
                .quick-manual-body {
                    display: flex;
                    flex: 1;
                    min-height: 0;
                    overflow: hidden;
                }
                .quick-manual-nav {
                    width: 280px;
                    flex-shrink: 0;
                    overflow-y: auto;
                    padding: 14px;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .quick-manual-content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 22px 24px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                @media (max-width: 760px) {
                    .quick-manual-body {
                        flex-direction: column;
                    }
                    .quick-manual-nav {
                        width: 100%;
                        max-height: 175px;
                        flex-direction: row;
                        flex-wrap: nowrap;
                        overflow-x: auto;
                        overflow-y: hidden;
                        padding: 10px 12px;
                        gap: 8px;
                    }
                    .quick-manual-nav-btn {
                        flex-shrink: 0;
                        min-width: 185px;
                    }
                    .quick-manual-content {
                        padding: 16px;
                    }
                }
                @keyframes quickManualPop {
                    from { opacity: 0; transform: translateY(8px) scale(0.985); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>

            <div
                className="quick-manual-shell"
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: modalSurface,
                    border: `1px solid ${borderCol}`,
                    boxShadow: isLight
                        ? '0 24px 60px rgba(15, 23, 42, 0.18)'
                        : '0 24px 60px rgba(0, 0, 0, 0.55)',
                    color: textPrimary
                }}
            >
                {/* Modal Header */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        padding: '16px 22px',
                        borderBottom: `1px solid ${borderCol}`,
                        background: isLight
                            ? 'linear-gradient(135deg, #f5f3ff 0%, #eff6ff 100%)'
                            : 'linear-gradient(135deg, rgba(99, 102, 241, 0.16) 0%, rgba(14, 165, 233, 0.08) 100%)'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 6px 16px rgba(99, 102, 241, 0.35)',
                                flexShrink: 0
                            }}
                        >
                            <BookOpen size={20} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <h2 style={{ margin: 0, fontSize: '16.5px', fontWeight: 700, color: textPrimary }}>
                                    {isTH ? 'คู่มือการใช้งานฉบับย่อ (Quick Menu Guide)' : 'Quick Menu User Manual'}
                                </h2>
                                <span
                                    style={{
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        padding: '2px 8px',
                                        borderRadius: '999px',
                                        background: isSupervisor
                                            ? 'rgba(139, 92, 246, 0.15)'
                                            : 'rgba(14, 165, 233, 0.15)',
                                        color: isSupervisor
                                            ? (isLight ? '#6d28d9' : '#c4b5fd')
                                            : (isLight ? '#0369a1' : '#7dd3fc')
                                    }}
                                >
                                    {isSupervisor
                                        ? (isTH
                                            ? `👑 Supervisor${activeAgent?.name ? ` (${activeAgent.name})` : ''} • เห็นครบทุกเมนู (${menuCount}/${menuCount})`
                                            : `👑 Supervisor${activeAgent?.name ? ` (${activeAgent.name})` : ''} • All ${menuCount} Menus`)
                                        : (isTH
                                            ? `👤 Agent${activeAgent?.name ? ` (${activeAgent.name})` : ''} • เฉพาะเมนูที่มีสิทธิ์ (${menuCount} เมนู)`
                                            : `👤 Agent${activeAgent?.name ? ` (${activeAgent.name})` : ''} • ${menuCount} Permitted Menus`)}
                                </span>
                            </div>
                            <p style={{ margin: '2px 0 0 0', fontSize: '12.5px', color: textMuted }}>
                                {isTH
                                    ? 'แบ่งหมวดหมู่ตามเมนูซ้ายมือทั้งหมดของระบบ เลือกดูวิธีใช้งานและกดข้ามไปหน้านั้นได้ทันที'
                                    : 'Organized by every left-sidebar menu. Pick a section to review key steps or jump directly to the screen.'}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={isTH ? 'ปิดคู่มือ' : 'Close manual'}
                        style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '10px',
                            border: `1px solid ${borderCol}`,
                            background: isLight ? '#ffffff' : 'rgba(30, 41, 59, 0.8)',
                            color: textSecondary,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Two-Pane Body */}
                <div className="quick-manual-body">
                    {/* Left Category Navigation */}
                    <nav
                        className="quick-manual-nav"
                        aria-label={isTH ? 'หมวดหมู่เมนูระบบ' : 'Manual categories'}
                        style={{
                            background: sidebarSurface,
                            borderRight: `1px solid ${borderCol}`,
                            borderBottom: `1px solid ${borderCol}`
                        }}
                    >
                        <div
                            style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.7px',
                                color: textMuted,
                                padding: '4px 8px 6px'
                            }}
                        >
                            {isTH ? 'หมวดหมู่ตามเมนูซ้ายมือ' : 'Sidebar Menu Categories'}
                        </div>

                        {visibleCategories.map((cat, idx) => {
                            const CatIcon = ICON_MAP[cat.id] || BookOpen;
                            const isSelected = cat.id === activeGuide.id;
                            const isActivePage = cat.viewMode && cat.viewMode === viewMode;
                            const displayOrder = cat.isChecklist ? '✓' : String(idx + 1);

                            return (
                                <button
                                    key={cat.id}
                                    type="button"
                                    className="quick-manual-nav-btn"
                                    onClick={() => setSelectedId(cat.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        width: '100%',
                                        textAlign: 'left',
                                        padding: '10px 11px',
                                        borderRadius: '11px',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                        border: isSelected
                                            ? `1px solid ${cat.accent}66`
                                            : '1px solid transparent',
                                        background: isSelected
                                            ? (isLight ? `${cat.accent}14` : `${cat.accent}24`)
                                            : 'transparent',
                                        color: isSelected ? textPrimary : textSecondary
                                    }}
                                >
                                    <div
                                        style={{
                                            width: '30px',
                                            height: '30px',
                                            borderRadius: '8px',
                                            background: isSelected
                                                ? cat.accent
                                                : (isLight ? '#e2e8f0' : 'rgba(148, 163, 184, 0.14)'),
                                            color: isSelected ? '#ffffff' : cat.accent,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}
                                    >
                                        <CatIcon size={15} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div
                                            style={{
                                                fontSize: '12.5px',
                                                fontWeight: isSelected ? 700 : 600,
                                                lineHeight: 1.3,
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                            }}
                                        >
                                            {displayOrder}. {cat.title[tKey]}
                                        </div>
                                        {isActivePage && (
                                            <div
                                                style={{
                                                    fontSize: '10.5px',
                                                    fontWeight: 600,
                                                    color: cat.accent,
                                                    marginTop: '1px'
                                                }}
                                            >
                                                {isTH ? '• กำลังเปิดหน้านี้อยู่' : '• Current screen'}
                                            </div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </nav>

                    {/* Right Content Details */}
                    <div className="quick-manual-content">
                        {/* Category Hero Banner */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                justifyContent: 'space-between',
                                gap: '14px',
                                flexWrap: 'wrap',
                                padding: '16px 18px',
                                borderRadius: '14px',
                                background: isLight
                                    ? `${activeGuide.accent}0f`
                                    : `${activeGuide.accent}1c`,
                                border: `1px solid ${activeGuide.accent}40`
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: '1 1 280px' }}>
                                <div
                                    style={{
                                        width: '42px',
                                        height: '42px',
                                        borderRadius: '12px',
                                        background: activeGuide.accent,
                                        color: '#ffffff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        boxShadow: `0 6px 16px ${activeGuide.accent}45`
                                    }}
                                >
                                    <ActiveIcon size={20} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: activeGuide.accent, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                                        {activeGuide.isChecklist
                                            ? (isTH ? 'แนวทางปฏิบัติประจำวัน' : 'Daily Routine')
                                            : (isTH ? `เมนูที่ ${activeMenuOrder} ในสิทธิ์การใช้งานของคุณ` : `Permitted Menu #${activeMenuOrder}`)}
                                    </div>
                                    <h3 style={{ margin: '2px 0 4px 0', fontSize: '17px', fontWeight: 700, color: textPrimary }}>
                                        {activeGuide.title[tKey]}
                                    </h3>
                                    <p style={{ margin: 0, fontSize: '13px', color: textSecondary }}>
                                        {activeGuide.subtitle[tKey]}
                                    </p>
                                </div>
                            </div>

                            {activeGuide.viewMode && (
                                <button
                                    type="button"
                                    onClick={handleJumpToMenu}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '9px 14px',
                                        borderRadius: '10px',
                                        border: 'none',
                                        background: isCurrentView
                                            ? (isLight ? '#e2e8f0' : 'rgba(148, 163, 184, 0.2)')
                                            : activeGuide.accent,
                                        color: isCurrentView ? textPrimary : '#ffffff',
                                        fontSize: '12.5px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        flexShrink: 0,
                                        boxShadow: isCurrentView ? 'none' : `0 6px 14px ${activeGuide.accent}40`
                                    }}
                                >
                                    <span>
                                        {isCurrentView
                                            ? (isTH ? 'กลับไปหน้าปัจจุบัน' : 'Return to Current Page')
                                            : (isTH ? 'เปิดหน้าเมนูนี้' : 'Open This Menu')}
                                    </span>
                                    <ArrowRight size={15} />
                                </button>
                            )}
                        </div>

                        {/* Purpose Card */}
                        <div
                            style={{
                                padding: '14px 16px',
                                borderRadius: '12px',
                                background: cardSurface,
                                border: `1px solid ${borderCol}`
                            }}
                        >
                            <div style={{ fontSize: '12px', fontWeight: 700, color: textMuted, marginBottom: '6px' }}>
                                {isTH ? 'หน้าที่หลักของเมนูนี้' : 'What This Menu Is For'}
                            </div>
                            <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.6, color: textPrimary }}>
                                {activeGuide.purpose[tKey]}
                            </p>
                        </div>

                        {/* Concise Steps */}
                        <div
                            style={{
                                padding: '16px',
                                borderRadius: '12px',
                                background: cardSurface,
                                border: `1px solid ${borderCol}`
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', fontWeight: 700, color: textPrimary, marginBottom: '12px' }}>
                                <CheckCircle2 size={16} color={activeGuide.accent} />
                                <span>{isTH ? 'วิธีใช้งานฉบับย่อ' : 'Quick How-To Steps'}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {stepsList.map((stepText, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '10px',
                                            padding: '10px 12px',
                                            borderRadius: '10px',
                                            background: isLight ? '#ffffff' : 'rgba(15, 23, 42, 0.55)',
                                            border: `1px solid ${borderCol}`
                                        }}
                                    >
                                        <span
                                            style={{
                                                width: '22px',
                                                height: '22px',
                                                borderRadius: '999px',
                                                background: `${activeGuide.accent}20`,
                                                color: activeGuide.accent,
                                                fontSize: '11.5px',
                                                fontWeight: 800,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                                marginTop: '1px'
                                            }}
                                        >
                                            {idx + 1}
                                        </span>
                                        <span style={{ fontSize: '13px', lineHeight: 1.55, color: textSecondary }}>
                                            {stepText}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Pro Tip */}
                        {activeGuide.tip && (
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '10px',
                                    padding: '12px 15px',
                                    borderRadius: '12px',
                                    background: isLight ? '#fffbeb' : 'rgba(245, 158, 11, 0.12)',
                                    border: isLight ? '1px solid #fde68a' : '1px solid rgba(245, 158, 11, 0.3)'
                                }}
                            >
                                <Lightbulb
                                    size={18}
                                    style={{
                                        color: isLight ? '#d97706' : '#fbbf24',
                                        flexShrink: 0,
                                        marginTop: '1px'
                                    }}
                                />
                                <div style={{ fontSize: '12.8px', lineHeight: 1.55, color: isLight ? '#78350f' : '#fde68a' }}>
                                    <strong>{isTH ? 'เคล็ดลับ: ' : 'Pro Tip: '}</strong>
                                    {activeGuide.tip[tKey]}
                                </div>
                            </div>
                        )}

                        {/* Supervisor-only Highlight */}
                        {showSupervisorNote && (
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '10px',
                                    padding: '12px 15px',
                                    borderRadius: '12px',
                                    background: isLight ? '#f5f3ff' : 'rgba(139, 92, 246, 0.14)',
                                    border: isLight ? '1px solid #ddd6fe' : '1px solid rgba(167, 139, 250, 0.35)'
                                }}
                            >
                                <Sparkles
                                    size={18}
                                    style={{
                                        color: isLight ? '#7c3aed' : '#c4b5fd',
                                        flexShrink: 0,
                                        marginTop: '1px'
                                    }}
                                />
                                <div style={{ fontSize: '12.8px', lineHeight: 1.55, color: isLight ? '#4c1d95' : '#ddd6fe' }}>
                                    {activeGuide.supervisorNote[tKey]}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

// Interactive Guided Tour Spotlight & Tooltip Overlay
import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { TOUR_STEPS, TOUR_SECTIONS_MASTER } from '../../constants/tourSteps';

export const TourOverlay = ({ isActive, onClose }) => {
    const { 
        lang, 
        theme, 
        viewMode, 
        setViewMode, 
        activeAgent, 
        isSupervisor 
    } = useApp();

    const [tourStep, setTourStep] = useState(0);
    const [targetRect, setTargetRect] = useState(null);

    const perms = activeAgent?.permissions || {};
    const canDashboard = isSupervisor || perms.canDashboard !== false;
    const canFollowUp = isSupervisor || perms.canFollowUp !== false;
    const canNewCustomer = isSupervisor || perms.canNewCustomer !== false;
    const canAudit = isSupervisor || Boolean(perms.canAudit);
    const canBackOffice = isSupervisor || Boolean(perms.canBackOffice);

    // Filter tour steps based on staff permissions
    const accessibleSteps = useMemo(() => {
        return TOUR_STEPS.filter(step => {
            if (!step.requiredView) return true;
            if (step.requiredView === 'supervisor') return canDashboard;
            if (step.requiredView === 'agent') return canFollowUp;
            if (step.requiredView === 'upload-deposits') return true;
            if (step.requiredView === 'new-customer') return canNewCustomer;
            if (step.requiredView === 'audit') return canAudit;
            if (['backoffice', 'audit-logs', 'recycle-bin'].includes(step.requiredView)) return canBackOffice;
            return true;
        });
    }, [canDashboard, canFollowUp, canNewCustomer, canAudit, canBackOffice]);

    const accessibleSections = useMemo(() => {
        const presentSecs = new Set(accessibleSteps.map(s => s.section));
        return TOUR_SECTIONS_MASTER.filter(sec => presentSecs.has(sec.key)).map(sec => {
            const firstIdx = accessibleSteps.findIndex(s => s.section === sec.key);
            return { ...sec, firstStepIdx: firstIdx !== -1 ? firstIdx : 0 };
        });
    }, [accessibleSteps]);

    const currentStep = accessibleSteps[tourStep];

    // Auto-switch viewMode if the step requires a different page
    useEffect(() => {
        if (!isActive || !currentStep) return;
        if (currentStep.requiredView && viewMode !== currentStep.requiredView) {
            setViewMode(currentStep.requiredView);
        }
    }, [isActive, tourStep, currentStep, viewMode, setViewMode]);

    // Calculate spotlight target rect
    useEffect(() => {
        if (!isActive || !currentStep) return;

        const updateRect = () => {
            let el = document.getElementById(currentStep.targetId);
            if (!el && currentStep.fallbackId) {
                el = document.getElementById(currentStep.fallbackId);
            }
            if (el) {
                const rect = el.getBoundingClientRect();
                setTargetRect({
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height,
                    bottom: rect.bottom,
                    right: rect.right
                });
            } else {
                setTargetRect(null);
            }
        };

        const timer = setTimeout(updateRect, 250);
        window.addEventListener('resize', updateRect);
        window.addEventListener('scroll', updateRect, true);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', updateRect);
            window.removeEventListener('scroll', updateRect, true);
        };
    }, [isActive, tourStep, currentStep, viewMode]);

    if (!isActive || !currentStep) return null;

    const nextStep = () => {
        if (tourStep < accessibleSteps.length - 1) {
            setTourStep(tourStep + 1);
        } else {
            if (onClose) onClose();
        }
    };

    const prevStep = () => {
        if (tourStep > 0) {
            setTourStep(tourStep - 1);
        }
    };

    // Calculate Tooltip position based on target rect and step.position
    const getTooltipStyle = () => {
        const cardWidth = 380;
        const cardHeight = 280;
        const padding = 16;

        if (!targetRect) {
            return {
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: `${cardWidth}px`,
                zIndex: 99999
            };
        }

        let top = targetRect.bottom + 12;
        let left = targetRect.left;

        if (currentStep.position === 'top') {
            top = targetRect.top - cardHeight - 12;
        } else if (currentStep.position === 'right') {
            top = targetRect.top;
            left = targetRect.right + 16;
        } else if (currentStep.position === 'left') {
            top = targetRect.top;
            left = targetRect.left - cardWidth - 16;
        }

        // Keep inside screen bounds
        const maxLeft = window.innerWidth - cardWidth - padding;
        const maxTop = window.innerHeight - cardHeight - padding;

        left = Math.max(padding, Math.min(left, maxLeft));
        top = Math.max(padding, Math.min(top, maxTop));

        return {
            position: 'fixed',
            top: `${top}px`,
            left: `${left}px`,
            width: `${cardWidth}px`,
            zIndex: 99999
        };
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99998, pointerEvents: 'auto' }}>
            {/* SVG Mask Spotlight */}
            <svg style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                <defs>
                    <mask id="mc-tour-mask">
                        <rect x="0" y="0" width="100%" height="100%" fill="white" />
                        {targetRect && (
                            <rect
                                x={Math.max(0, targetRect.left - 6)}
                                y={Math.max(0, targetRect.top - 6)}
                                width={targetRect.width + 12}
                                height={targetRect.height + 12}
                                rx="12"
                                ry="12"
                                fill="black"
                            />
                        )}
                    </mask>
                </defs>
                <rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    fill={theme === 'light' ? 'rgba(15, 23, 42, 0.62)' : 'rgba(3, 7, 18, 0.82)'}
                    mask="url(#mc-tour-mask)"
                    style={{ pointerEvents: 'auto' }}
                />
            </svg>

            {/* Pulsing Highlight Box */}
            {targetRect && (
                <div
                    className="tour-spotlight-box"
                    style={{
                        position: 'fixed',
                        top: `${Math.max(0, targetRect.top - 6)}px`,
                        left: `${Math.max(0, targetRect.left - 6)}px`,
                        width: `${targetRect.width + 12}px`,
                        height: `${targetRect.height + 12}px`,
                        borderRadius: '12px',
                        border: '2px solid #a855f7',
                        boxShadow: '0 0 16px rgba(168, 85, 247, 0.6)',
                        pointerEvents: 'none',
                        zIndex: 99999
                    }}
                />
            )}

            {/* Tooltip Card */}
            <div
                className="panel tour-card-container"
                style={{
                    ...getTooltipStyle(),
                    padding: '20px',
                    borderRadius: '18px',
                    background: theme === 'light' ? '#ffffff' : 'rgba(15, 23, 42, 0.96)',
                    border: '1px solid rgba(168, 85, 247, 0.4)',
                    boxShadow: '0 20px 45px rgba(0, 0, 0, 0.4)'
                }}
            >
                {/* Module Jump Bar */}
                <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '10px', borderBottom: theme === 'light' ? '1px solid #f1f5f9' : '1px solid rgba(255,255,255,0.08)' }}>
                    {accessibleSections.map(sec => {
                        const isCurrent = currentStep?.section === sec.key;
                        return (
                            <button
                                key={sec.key}
                                type="button"
                                onClick={() => setTourStep(sec.firstStepIdx)}
                                style={{
                                    padding: '3px 8px',
                                    fontSize: '10.5px',
                                    fontWeight: isCurrent ? 800 : 600,
                                    borderRadius: '8px',
                                    border: isCurrent ? '1px solid #a855f7' : '1px solid transparent',
                                    background: isCurrent ? (theme === 'light' ? '#f3e8ff' : 'rgba(168, 85, 247, 0.25)') : (theme === 'light' ? '#f8fafc' : 'rgba(255,255,255,0.04)'),
                                    color: isCurrent ? (theme === 'light' ? '#7c3aed' : '#e9d5ff') : 'var(--text-muted)',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0
                                }}
                            >
                                {lang === 'TH' ? sec.labelTH : sec.labelEN}
                            </button>
                        );
                    })}
                </div>

                {/* Step Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                            background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                            color: '#ffffff',
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '3px 9px',
                            borderRadius: '20px',
                            letterSpacing: '0.4px'
                        }}>
                            {lang === 'TH' ? currentStep.badgeTH : currentStep.badgeEN}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>
                            {lang === 'TH' ? `ขั้นตอนที่ ${tourStep + 1} จาก ${accessibleSteps.length}` : `Step ${tourStep + 1} of ${accessibleSteps.length}`}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px' }}
                    >
                        ✕
                    </button>
                </div>

                {/* Progress Bar */}
                <div style={{ width: '100%', height: '4px', background: theme === 'light' ? '#e2e8f0' : 'rgba(255, 255, 255, 0.12)', borderRadius: '4px', overflow: 'hidden', marginBottom: '14px' }}>
                    <div style={{ width: `${((tourStep + 1) / accessibleSteps.length) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #a855f7, #38bdf8)', transition: 'width 0.3s ease' }} />
                </div>

                {/* Title */}
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: theme === 'light' ? '#0f172a' : '#ffffff', margin: '0 0 8px 0' }}>
                    {lang === 'TH' ? currentStep.titleTH : currentStep.titleEN}
                </h4>

                {/* Description */}
                <p style={{ fontSize: '12.5px', color: theme === 'light' ? '#475569' : '#cbd5e1', lineHeight: 1.5, margin: '0 0 12px 0' }}>
                    {lang === 'TH' ? currentStep.descTH : currentStep.descEN}
                </p>

                {/* Pro-Tip Box */}
                <div style={{
                    background: theme === 'light' ? '#f0fdf4' : 'rgba(16, 185, 129, 0.1)',
                    border: theme === 'light' ? '1px solid #bbf7d0' : '1px solid rgba(16, 185, 129, 0.25)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    color: theme === 'light' ? '#166534' : '#6ee7b7',
                    marginBottom: '16px'
                }}>
                    {lang === 'TH' ? currentStep.tipTH : currentStep.tipEN}
                </div>

                {/* Footer Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <button
                        onClick={onClose}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                        {lang === 'TH' ? 'ข้ามทัวร์' : 'Skip tour'}
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {tourStep > 0 && (
                            <button
                                onClick={prevStep}
                                className="btn btn-secondary"
                                style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '8px' }}
                            >
                                {lang === 'TH' ? '◀ ก่อนหน้า' : '◀ Prev'}
                            </button>
                        )}
                        <button
                            onClick={nextStep}
                            className="btn btn-primary"
                            style={{ padding: '6px 18px', fontSize: '12px', fontWeight: 700, borderRadius: '8px' }}
                        >
                            {tourStep < accessibleSteps.length - 1 
                                ? (lang === 'TH' ? 'ถัดไป ▶' : 'Next ▶') 
                                : (lang === 'TH' ? '🎉 เข้าใจแล้ว' : '🎉 Finish')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

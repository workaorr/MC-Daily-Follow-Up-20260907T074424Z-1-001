import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Target, Trophy, Users, Pencil } from 'lucide-react';

export const AgentTargetChart = ({
    agentTargetChartData = [],
    depositMetricMode = 'TOTAL',
    hasSupervisorAccess = false,
    onOpenTargetModal,
    lang = 'TH',
    theme = 'dark'
}) => {
    const [hoveredName, setHoveredName] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0, placeBelow: false });
    const [showOnlyWithTargetOrDeposit, setShowOnlyWithTargetOrDeposit] = useState(false);

    const isLight = theme === 'light';

    useEffect(() => {
        if (!hoveredName) return;
        const clearHover = () => setHoveredName(null);
        window.addEventListener('scroll', clearHover, { passive: true });
        return () => window.removeEventListener('scroll', clearHover);
    }, [hoveredName]);

    const visibleRows = useMemo(() => {
        if (!showOnlyWithTargetOrDeposit) return agentTargetChartData;
        return agentTargetChartData.filter((r) => r.actualDeposit > 0 || r.targetAmount > 0);
    }, [agentTargetChartData, showOnlyWithTargetOrDeposit]);

    // Rank order map among agents who have closed at least 1 deposit (for Top 3 medals)
    const topCloserRankMap = useMemo(() => {
        const ranked = [...agentTargetChartData]
            .filter((r) => r.depositorsCount > 0 || r.actualDeposit > 0)
            .sort((a, b) => b.actualDeposit - a.actualDeposit || b.depositorsCount - a.depositorsCount);
        const map = {};
        ranked.slice(0, 3).forEach((r, idx) => {
            map[r.name] = idx; // 0, 1, 2
        });
        return map;
    }, [agentTargetChartData]);

    const maxScale = useMemo(() => {
        let maxVal = 1000;
        visibleRows.forEach((r) => {
            if (r.actualDeposit > maxVal) maxVal = r.actualDeposit;
            if (r.targetAmount > maxVal) maxVal = r.targetAmount;
        });
        return maxVal;
    }, [visibleRows]);

    const summaryCounts = useMemo(() => {
        const withTarget = agentTargetChartData.filter((r) => r.targetAmount > 0);
        const achieved = withTarget.filter((r) => r.isExceeded);
        const totalActual = agentTargetChartData.reduce((s, r) => s + r.actualDeposit, 0);
        const totalIndividualTargets = withTarget.reduce((s, r) => s + r.targetAmount, 0);
        return {
            withTargetCount: withTarget.length,
            achievedCount: achieved.length,
            totalActual,
            totalIndividualTargets
        };
    }, [agentTargetChartData]);

    const hoveredItem = useMemo(() => {
        if (!hoveredName) return null;
        return visibleRows.find((r) => r.name === hoveredName) || null;
    }, [visibleRows, hoveredName]);

    const handleActivateRow = (name, targetEl) => {
        setHoveredName(name);
        if (targetEl && typeof window !== 'undefined') {
            const rect = targetEl.getBoundingClientRect();
            const tooltipWidth = 260;
            const centerX = rect.left + rect.width / 2;
            const clampedLeft = Math.max(12, Math.min(window.innerWidth - tooltipWidth - 12, centerX - tooltipWidth / 2));
            const placeBelow = rect.top < 220;
            setTooltipPos({
                top: placeBelow ? rect.bottom + 8 : rect.top - 8,
                left: clampedLeft,
                placeBelow
            });
        }
    };

    const medalLabelsTH = ['🥇 อันดับ 1', '🥈 อันดับ 2', '🥉 อันดับ 3'];
    const medalLabelsEN = ['🥇 #1', '🥈 #2', '🥉 #3'];
    const medalGradients = [
        'linear-gradient(135deg, #f59e0b, #d97706)',
        'linear-gradient(135deg, #94a3b8, #64748b)',
        'linear-gradient(135deg, #d97706, #b45309)'
    ];

    return (
        <div
            className="panel"
            style={{
                padding: '20px 22px',
                borderRadius: '16px',
                background: isLight ? '#ffffff' : 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}
        >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        padding: '8px',
                        borderRadius: '10px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#10b981',
                        border: '1px solid rgba(16, 185, 129, 0.3)'
                    }}>
                        <Target size={20} />
                    </div>
                    <div>
                        <h4 style={{ margin: 0, fontSize: '15.5px', fontWeight: 800, color: isLight ? '#0f172a' : '#f8fafc', letterSpacing: '-0.2px' }}>
                            {lang === 'TH'
                                ? '🏆 ผลงานรายบุคคล & กราฟเปรียบเทียบยอดฝากจริง vs เป้าหมาย'
                                : '🏆 Individual Performance & Deposit vs Target'}
                        </h4>
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                            {depositMetricMode === 'FIRST'
                                ? (lang === 'TH' ? 'เรียงอันดับยอดฝากแรก (FTD) พร้อมสถิติติดตามและเป้าหมายรายบุคคลครบในจุดเดียว' : 'Ranked by FTD with full funnel metrics & individual targets')
                                : (lang === 'TH' ? 'เรียงอันดับยอดฝากสะสมรวม พร้อมสถิติติดตาม (ทัก-สมัคร-ฝาก) และเป้าหมายรายบุคคลครบในจุดเดียว' : 'Ranked by Total Deposits with full funnel metrics & individual targets')}
                        </span>
                    </div>
                </div>

                {/* Right Controls & Summary */}
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                    {summaryCounts.withTargetCount > 0 && (
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            padding: '5px 11px',
                            borderRadius: '10px',
                            background: summaryCounts.achievedCount > 0
                                ? 'rgba(16, 185, 129, 0.14)'
                                : (isLight ? '#f8fafc' : 'rgba(255,255,255,0.05)'),
                            color: summaryCounts.achievedCount > 0 ? '#10b981' : 'var(--text-muted)',
                            border: summaryCounts.achievedCount > 0
                                ? '1px solid rgba(16, 185, 129, 0.35)'
                                : (isLight ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.1)')
                        }}>
                            <Trophy size={13} style={{ color: '#fbbf24' }} />
                            <span>
                                {lang === 'TH'
                                    ? `ถึงเป้าแล้ว ${summaryCounts.achievedCount}/${summaryCounts.withTargetCount} คน`
                                    : `${summaryCounts.achievedCount}/${summaryCounts.withTargetCount} Hit Target`}
                            </span>
                        </span>
                    )}

                    <button
                        type="button"
                        onClick={() => setShowOnlyWithTargetOrDeposit((prev) => !prev)}
                        className={`btn ${showOnlyWithTargetOrDeposit ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '5px 11px', fontSize: '11.5px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}
                    >
                        <Users size={13} />
                        <span>
                            {showOnlyWithTargetOrDeposit
                                ? (lang === 'TH' ? 'เฉพาะคนมียอด/เป้า' : 'Active Only')
                                : (lang === 'TH' ? `ทั้งหมด (${agentTargetChartData.length})` : `All (${agentTargetChartData.length})`)}
                        </span>
                    </button>

                    {hasSupervisorAccess && onOpenTargetModal && (
                        <button
                            type="button"
                            onClick={onOpenTargetModal}
                            className="btn btn-secondary"
                            style={{
                                padding: '5px 11px',
                                fontSize: '11.5px',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                color: isLight ? '#6d28d9' : '#d8b4fe',
                                borderColor: 'rgba(168, 85, 247, 0.35)'
                            }}
                        >
                            <Pencil size={12} style={{ color: '#a855f7' }} />
                            <span>{lang === 'TH' ? 'ตั้งเป้ารายคน' : 'Edit Targets'}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Unified Agent Rows */}
            {visibleRows.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '32px 16px',
                    color: 'var(--text-muted)',
                    fontSize: '13px',
                    borderRadius: '12px',
                    background: isLight ? '#f8fafc' : 'rgba(255,255,255,0.02)',
                    border: isLight ? '1px dashed #cbd5e1' : '1px dashed rgba(255,255,255,0.1)'
                }}>
                    {lang === 'TH' ? 'ยังไม่มีข้อมูลพนักงานที่ตรงเงื่อนไข' : 'No matching agent records'}
                </div>
            ) : (
                <div
                    style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
                    onMouseLeave={() => setHoveredName(null)}
                >
                    {visibleRows.map((row) => {
                        const actualWidthPct = row.actualDeposit > 0
                            ? Math.max(2, Math.round((row.actualDeposit / maxScale) * 100))
                            : 0;
                        const targetWidthPct = row.targetAmount > 0
                            ? Math.max(2, Math.round((row.targetAmount / maxScale) * 100))
                            : 0;
                        const isHovered = hoveredName === row.name;
                        const topRankIdx = Object.prototype.hasOwnProperty.call(topCloserRankMap, row.name)
                            ? topCloserRankMap[row.name]
                            : -1;

                        const statusColor = row.targetAmount <= 0
                            ? '#38bdf8'
                            : row.pct >= 100
                                ? '#10b981'
                                : row.pct >= 50
                                    ? '#38bdf8'
                                    : '#f59e0b';

                        return (
                            <div
                                key={row.name}
                                onMouseEnter={(e) => handleActivateRow(row.name, e.currentTarget)}
                                onClick={(e) => {
                                    if (isHovered) setHoveredName(null);
                                    else handleActivateRow(row.name, e.currentTarget);
                                }}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'minmax(240px, 340px) 1fr auto',
                                    alignItems: 'center',
                                    gap: '14px',
                                    padding: '11px 14px',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    background: isHovered
                                        ? (isLight ? '#f5f3ff' : 'rgba(168, 85, 247, 0.12)')
                                        : (isLight ? '#f8fafc' : 'rgba(255,255,255,0.02)'),
                                    border: topRankIdx === 0
                                        ? '1px solid rgba(245, 158, 11, 0.45)'
                                        : isHovered
                                            ? '1px solid rgba(168, 85, 247, 0.4)'
                                            : (isLight ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.06)'),
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                {/* Left: Medal + Agent Name + Full 5-Stage Funnel Chips */}
                                <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <div style={{
                                        fontWeight: 800,
                                        fontSize: '13.5px',
                                        color: isLight ? '#0f172a' : '#f8fafc',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '7px',
                                        flexWrap: 'wrap'
                                    }}>
                                        {topRankIdx >= 0 ? (
                                            <span style={{
                                                fontSize: '10px',
                                                fontWeight: 800,
                                                padding: '2px 7px',
                                                borderRadius: '7px',
                                                background: medalGradients[topRankIdx],
                                                color: '#ffffff',
                                                whiteSpace: 'nowrap',
                                                flexShrink: 0
                                            }}>
                                                {lang === 'TH' ? medalLabelsTH[topRankIdx] : medalLabelsEN[topRankIdx]}
                                            </span>
                                        ) : (
                                            <span style={{
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '50%',
                                                background: '#a855f7',
                                                flexShrink: 0
                                            }} />
                                        )}
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {row.name}
                                        </span>
                                        <span style={{
                                            fontSize: '10.5px',
                                            fontWeight: 800,
                                            padding: '1px 7px',
                                            borderRadius: '999px',
                                            background: row.conversionRate > 0 ? 'rgba(16, 185, 129, 0.14)' : (isLight ? '#e2e8f0' : 'rgba(255,255,255,0.06)'),
                                            color: row.conversionRate > 0 ? '#10b981' : 'var(--text-muted)'
                                        }}>
                                            MC: {row.conversionRate}%
                                        </span>
                                    </div>

                                    {/* 5-Stage Funnel Breakdown Chips */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', fontSize: '10.5px', fontWeight: 600 }}>
                                        <span style={{ padding: '1px 6px', borderRadius: '5px', background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.06)', color: isLight ? '#334155' : '#cbd5e1' }}>
                                            {lang === 'TH' ? `ทัก ${row.inquiriesCount}` : `Inq ${row.inquiriesCount}`}
                                        </span>
                                        <span style={{ padding: '1px 6px', borderRadius: '5px', background: row.notRegisteredCount > 0 ? 'rgba(245, 158, 11, 0.14)' : (isLight ? '#f1f5f9' : 'rgba(255,255,255,0.04)'), color: row.notRegisteredCount > 0 ? '#d97706' : 'var(--text-muted)' }}>
                                            {lang === 'TH' ? `ไม่สมัคร ${row.notRegisteredCount}` : `NoReg ${row.notRegisteredCount}`}
                                        </span>
                                        <span style={{ padding: '1px 6px', borderRadius: '5px', background: 'rgba(56, 189, 248, 0.14)', color: isLight ? '#0284c7' : '#38bdf8' }}>
                                            {lang === 'TH' ? `สมัคร ${row.registeredCount}` : `Reg ${row.registeredCount}`}
                                        </span>
                                        <span style={{ padding: '1px 6px', borderRadius: '5px', background: row.depositorsCount > 0 ? 'rgba(16, 185, 129, 0.15)' : (isLight ? '#f1f5f9' : 'rgba(255,255,255,0.04)'), color: row.depositorsCount > 0 ? '#10b981' : 'var(--text-muted)', fontWeight: 700 }}>
                                            {lang === 'TH' ? `ฝาก ${row.depositorsCount}` : `Dep ${row.depositorsCount}`}
                                        </span>
                                        <span style={{ padding: '1px 6px', borderRadius: '5px', background: row.pendingDepositCount > 0 ? 'rgba(244, 63, 94, 0.14)' : (isLight ? '#f1f5f9' : 'rgba(255,255,255,0.04)'), color: row.pendingDepositCount > 0 ? '#e11d48' : 'var(--text-muted)' }}>
                                            {lang === 'TH' ? `ค้างฝาก ${row.pendingDepositCount}` : `Pend ${row.pendingDepositCount}`}
                                        </span>
                                    </div>
                                </div>

                                {/* Center: Dual Bars (Actual vs Target) */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: '140px' }}>
                                    {/* Bar 1: Actual Deposit */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{
                                            flex: 1,
                                            height: '10px',
                                            borderRadius: '999px',
                                            background: isLight ? '#e2e8f0' : 'rgba(255,255,255,0.07)',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                width: `${actualWidthPct}%`,
                                                height: '100%',
                                                borderRadius: '999px',
                                                background: row.isExceeded
                                                    ? 'linear-gradient(90deg, #10b981, #34d399)'
                                                    : 'linear-gradient(90deg, #059669, #34d399)',
                                                transition: 'width 0.45s ease'
                                            }} />
                                        </div>
                                        <span style={{
                                            minWidth: '72px',
                                            textAlign: 'right',
                                            fontSize: '12px',
                                            fontWeight: 800,
                                            color: row.actualDeposit > 0 ? '#10b981' : 'var(--text-muted)'
                                        }}>
                                            ฿{row.actualDeposit.toLocaleString()}
                                        </span>
                                    </div>

                                    {/* Bar 2: Individual Target */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{
                                            flex: 1,
                                            height: '7px',
                                            borderRadius: '999px',
                                            background: isLight ? '#e2e8f0' : 'rgba(255,255,255,0.05)',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                width: `${targetWidthPct}%`,
                                                height: '100%',
                                                borderRadius: '999px',
                                                background: row.targetAmount > 0
                                                    ? 'linear-gradient(90deg, #7c3aed, #a855f7)'
                                                    : 'transparent',
                                                opacity: 0.75,
                                                transition: 'width 0.45s ease'
                                            }} />
                                        </div>
                                        <span style={{
                                            minWidth: '72px',
                                            textAlign: 'right',
                                            fontSize: '10.5px',
                                            fontWeight: 600,
                                            color: row.targetAmount > 0 ? (isLight ? '#7c3aed' : '#c084fc') : 'var(--text-muted)'
                                        }}>
                                            {row.targetAmount > 0
                                                ? `฿${row.targetAmount.toLocaleString()}`
                                                : (lang === 'TH' ? 'ยังไม่ตั้งเป้า' : 'No target')}
                                        </span>
                                    </div>
                                </div>

                                {/* Right: Achievement % Badge or Set Target Pill */}
                                <div style={{ minWidth: '88px', textAlign: 'right' }}>
                                    {row.targetAmount > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                            <span style={{
                                                fontSize: '12px',
                                                fontWeight: 900,
                                                padding: '2px 9px',
                                                borderRadius: '999px',
                                                background: `${statusColor}22`,
                                                color: statusColor,
                                                border: `1px solid ${statusColor}55`
                                            }}>
                                                {row.isExceeded ? `🎉 ${row.pct}%` : `${row.pct}%`}
                                            </span>
                                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                                {row.isExceeded
                                                    ? `+฿${(row.actualDeposit - row.targetAmount).toLocaleString()}`
                                                    : (lang === 'TH' ? `ขาด ฿${row.remaining.toLocaleString()}` : `-฿${row.remaining.toLocaleString()}`)}
                                            </span>
                                        </div>
                                    ) : hasSupervisorAccess && onOpenTargetModal ? (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onOpenTargetModal();
                                            }}
                                            style={{
                                                background: 'transparent',
                                                border: '1px dashed rgba(168, 85, 247, 0.45)',
                                                color: isLight ? '#7c3aed' : '#c084fc',
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                padding: '3px 9px',
                                                borderRadius: '8px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            + {lang === 'TH' ? 'ตั้งเป้า' : 'Set'}
                                        </button>
                                    ) : (
                                        <span style={{
                                            fontSize: '11px',
                                            color: 'var(--text-muted)',
                                            padding: '2px 8px',
                                            borderRadius: '8px',
                                            background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.04)'
                                        }}>
                                            -
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Legend Footer */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
                paddingTop: '10px',
                borderTop: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.06)',
                fontSize: '11.5px',
                color: 'var(--text-muted)'
            }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '12px', height: '8px', borderRadius: '4px', background: '#10b981', display: 'inline-block' }} />
                        <span>
                            {depositMetricMode === 'FIRST'
                                ? (lang === 'TH' ? `ยอดฝากจริง FTD (รวม ฿${summaryCounts.totalActual.toLocaleString()})` : `Actual FTD (฿${summaryCounts.totalActual.toLocaleString()})`)
                                : (lang === 'TH' ? `ยอดฝากจริง (รวม ฿${summaryCounts.totalActual.toLocaleString()})` : `Actual Deposits (฿${summaryCounts.totalActual.toLocaleString()})`)}
                        </span>
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '12px', height: '7px', borderRadius: '4px', background: '#8b5cf6', opacity: 0.8, display: 'inline-block' }} />
                        <span>
                            {lang === 'TH'
                                ? `เป้าหมายรายบุคคล (รวม ฿${summaryCounts.totalIndividualTargets.toLocaleString()})`
                                : `Individual Targets (฿${summaryCounts.totalIndividualTargets.toLocaleString()})`}
                        </span>
                    </span>
                </div>

                <span>
                    💡 {lang === 'TH' ? 'ชี้ที่แถวพนักงานเพื่อดูสรุปสถิติและเป้าหมายละเอียด' : 'Hover any row for full funnel & target breakdown'}
                </span>
            </div>

            {/* Floating Portal Tooltip */}
            {hoveredItem && typeof document !== 'undefined' && createPortal(
                <div
                    style={{
                        position: 'fixed',
                        top: `${tooltipPos.top}px`,
                        left: `${tooltipPos.left}px`,
                        transform: tooltipPos.placeBelow ? 'none' : 'translateY(-100%)',
                        zIndex: 3000,
                        width: '260px',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        background: isLight ? '#0f172a' : '#020617',
                        color: '#f8fafc',
                        border: '1px solid rgba(16, 185, 129, 0.5)',
                        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.48)',
                        pointerEvents: 'none',
                        fontSize: '12px'
                    }}
                >
                    <div style={{
                        fontWeight: 800,
                        fontSize: '12.5px',
                        paddingBottom: '6px',
                        marginBottom: '6px',
                        borderBottom: '1px solid rgba(255,255,255,0.14)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <span>👤 {hoveredItem.name}</span>
                        <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#34d399' }}>
                            MC: {hoveredItem.conversionRate}%
                        </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                            <span style={{ color: '#34d399' }}>
                                🟢 {depositMetricMode === 'FIRST' ? (lang === 'TH' ? 'ยอดฝาก (FTD):' : 'FTD:') : (lang === 'TH' ? 'ยอดฝากจริง:' : 'Actual:')}
                            </span>
                            <strong>฿{hoveredItem.actualDeposit.toLocaleString()}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                            <span style={{ color: '#c084fc' }}>🟣 {lang === 'TH' ? 'เป้าหมาย:' : 'Target:'}</span>
                            <strong>{hoveredItem.targetAmount > 0 ? `฿${hoveredItem.targetAmount.toLocaleString()}` : '-'}</strong>
                        </div>
                        {hoveredItem.targetAmount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                                <span style={{ color: hoveredItem.isExceeded ? '#34d399' : '#fbbf24' }}>
                                    {hoveredItem.isExceeded ? (lang === 'TH' ? '🎉 เกินเป้า:' : '🎉 Exceeded:') : (lang === 'TH' ? '⏳ ขาดอีก:' : '⏳ Remaining:')}
                                </span>
                                <strong style={{ color: hoveredItem.isExceeded ? '#34d399' : '#fbbf24' }}>
                                    ฿{Math.abs(hoveredItem.actualDeposit - hoveredItem.targetAmount).toLocaleString()} ({hoveredItem.pct}%)
                                </strong>
                            </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', paddingTop: '5px', marginTop: '3px', borderTop: '1px dashed rgba(255,255,255,0.14)', fontSize: '11.5px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#cbd5e1' }}>1. {lang === 'TH' ? 'ทักทั้งหมด:' : 'Inquiries:'}</span>
                                <strong>{hoveredItem.inquiriesCount} {lang === 'TH' ? 'คน' : ''}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#fbbf24' }}>2. {lang === 'TH' ? 'ทักแต่ไม่สมัคร:' : 'Not Reg:'}</span>
                                <strong>{hoveredItem.notRegisteredCount} {lang === 'TH' ? 'คน' : ''}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#38bdf8' }}>3. {lang === 'TH' ? 'ทักสมัคร:' : 'Registered:'}</span>
                                <strong>{hoveredItem.registeredCount} {lang === 'TH' ? 'คน' : ''}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#34d399' }}>4. {lang === 'TH' ? 'สมัครและฝาก:' : 'Deposited:'}</span>
                                <strong>{hoveredItem.depositorsCount} {lang === 'TH' ? 'คน' : ''}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#fb7185' }}>5. {lang === 'TH' ? 'สมัครไม่ฝาก:' : 'Pending Dep:'}</span>
                                <strong>{hoveredItem.pendingDepositCount} {lang === 'TH' ? 'คน' : ''}</strong>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default AgentTargetChart;

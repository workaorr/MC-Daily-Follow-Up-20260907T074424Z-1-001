import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TrendingUp, Banknote, PhoneCall, Flame, Gem, BarChart3 } from 'lucide-react';
import { getCurrentMonthStr } from '../../utils/dateFormatters';

export const DailyTrendChart = ({
    dailyTrendStats,
    depositMetricMode = 'TOTAL',
    lang = 'TH',
    theme = 'dark'
}) => {
    const [hoveredDay, setHoveredDay] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0, placeBelow: false });

    useEffect(() => {
        if (hoveredDay === null) return;
        const clearHover = () => setHoveredDay(null);
        window.addEventListener('scroll', clearHover, { passive: true });
        return () => window.removeEventListener('scroll', clearHover);
    }, [hoveredDay]);

    const handleActivateDay = (dayNum, targetEl) => {
        setHoveredDay(dayNum);
        if (targetEl && typeof window !== 'undefined') {
            const rect = targetEl.getBoundingClientRect();
            const tooltipWidth = 230;
            const centerX = rect.left + rect.width / 2;
            const clampedLeft = Math.max(12, Math.min(window.innerWidth - tooltipWidth - 12, centerX - tooltipWidth / 2));
            const placeBelow = rect.top < 200;
            setTooltipPos({
                top: placeBelow ? rect.bottom + 8 : rect.top - 8,
                left: clampedLeft,
                placeBelow
            });
        }
    };

    const isLight = theme === 'light';
    const curMonthStr = getCurrentMonthStr();
    const todayDateNum = new Date().getDate();

    const days = dailyTrendStats?.days || [];
    const totals = dailyTrendStats?.totals || {};
    const peaks = dailyTrendStats?.peaks || {};
    const monthLabel = dailyTrendStats?.month || curMonthStr;
    const isCurrentMonth = monthLabel === curMonthStr;

    const maxScale = useMemo(() => {
        return Math.max(
            5,
            peaks.maxInquiries || 0,
            peaks.maxRegistered || 0,
            peaks.maxDepositors || 0,
            peaks.maxFollowUps || 0
        );
    }, [peaks]);

    const formatCompactBaht = (val) => {
        if (val >= 1000000) return `฿${(val / 1000000).toFixed(1)}M`;
        if (val >= 1000) return `฿${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k`;
        return `฿${val.toLocaleString()}`;
    };

    const hoveredItem = useMemo(() => {
        if (hoveredDay === null) return null;
        return days.find((d) => d.day === hoveredDay) || null;
    }, [days, hoveredDay]);

    const hasAnyData = (totals.inquiries || 0) > 0 || (totals.depositAmount || 0) > 0 || (totals.followUps || 0) > 0;

    return (
        <div
            className="panel"
            style={{
                padding: '20px 22px',
                borderRadius: '16px',
                background: isLight ? '#ffffff' : 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}
        >
            {/* Header & Unified Summary Badges */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            padding: '8px',
                            borderRadius: '10px',
                            background: 'rgba(168, 85, 247, 0.15)',
                            color: '#a855f7',
                            border: '1px solid rgba(168, 85, 247, 0.3)'
                        }}>
                            <TrendingUp size={20} />
                        </div>
                        <div>
                            <h4 style={{ margin: 0, fontSize: '15.5px', fontWeight: 800, color: isLight ? '#0f172a' : '#f8fafc', letterSpacing: '-0.2px' }}>
                                {lang === 'TH'
                                    ? `📈 กราฟแนวโน้มผลงานรายวัน (${monthLabel})`
                                    : `📈 Daily Performance Trend (${monthLabel})`}
                            </h4>
                            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                                {lang === 'TH'
                                    ? 'รวมสถิติทัก • สมัคร • ฝาก • ติ๊กติดตาม และยอดฝาก (฿) ในหน้าเดียว • ชี้แท่งกราฟเพื่อดูรายละเอียด'
                                    : 'Unified daily Leads, Registrations, Deposits, Follow-ups & Revenue • Hover any day for details'}
                            </span>
                        </div>
                    </div>

                    {/* Peak Insights Pills */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                        {peaks.maxInquiries > 0 && (
                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '3px 10px',
                                borderRadius: '999px',
                                background: isLight ? '#faf5ff' : 'rgba(168, 85, 247, 0.14)',
                                color: isLight ? '#7e22ce' : '#d8b4fe',
                                border: '1px solid rgba(168, 85, 247, 0.3)'
                            }}>
                                <Flame size={12} style={{ color: '#f59e0b' }} />
                                <span>
                                    {lang === 'TH'
                                        ? `ทักสูงสุด: วันที่ ${peaks.maxInquiriesDay} (${peaks.maxInquiries} คน)`
                                        : `Peak Inquiries: Day ${peaks.maxInquiriesDay} (${peaks.maxInquiries})`}
                                </span>
                            </span>
                        )}
                        {peaks.maxDepositAmount > 0 && (
                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '3px 10px',
                                borderRadius: '999px',
                                background: isLight ? '#ecfdf5' : 'rgba(16, 185, 129, 0.14)',
                                color: isLight ? '#047857' : '#6ee7b7',
                                border: '1px solid rgba(16, 185, 129, 0.3)'
                            }}>
                                <Gem size={12} style={{ color: '#10b981' }} />
                                <span>
                                    {lang === 'TH'
                                        ? `ฝากสูงสุด: วันที่ ${peaks.maxDepositDay} (฿${peaks.maxDepositAmount.toLocaleString()})`
                                        : `Peak Deposit: Day ${peaks.maxDepositDay} (฿${peaks.maxDepositAmount.toLocaleString()})`}
                                </span>
                            </span>
                        )}
                        {totals.avgDailyDeposit > 0 && (
                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '3px 10px',
                                borderRadius: '999px',
                                background: isLight ? '#f0f9ff' : 'rgba(56, 189, 248, 0.14)',
                                color: isLight ? '#0369a1' : '#7dd3fc',
                                border: '1px solid rgba(56, 189, 248, 0.3)'
                            }}>
                                <BarChart3 size={12} />
                                <span>
                                    {lang === 'TH'
                                        ? `เฉลี่ยวันที่มีรายการ: ฿${totals.avgDailyDeposit.toLocaleString()}/วัน`
                                        : `Active Day Avg: ฿${totals.avgDailyDeposit.toLocaleString()}/day`}
                                </span>
                            </span>
                        )}
                    </div>
                </div>

                {/* Right-side Summary Totals (Deposits & Follow-up Ticks) */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                    <div style={{
                        padding: '6px 12px',
                        borderRadius: '10px',
                        background: isLight ? '#ecfdf5' : 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px'
                    }}>
                        <Banknote size={15} style={{ color: '#10b981' }} />
                        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                            {depositMetricMode === 'FIRST' ? (lang === 'TH' ? 'ยอดฝากแรก:' : 'FTD:') : (lang === 'TH' ? 'ยอดฝากรวม:' : 'Deposits:')}
                        </span>
                        <strong style={{ color: '#10b981', fontWeight: 800 }}>฿{(totals.depositAmount || 0).toLocaleString()}</strong>
                    </div>

                    <div style={{
                        padding: '6px 12px',
                        borderRadius: '10px',
                        background: isLight ? '#fffbeb' : 'rgba(245, 158, 11, 0.12)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px'
                    }}>
                        <PhoneCall size={14} style={{ color: '#f59e0b' }} />
                        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                            {lang === 'TH' ? 'ติ๊กติดตามรวม:' : 'Follow-ups:'}
                        </span>
                        <strong style={{ color: '#f59e0b', fontWeight: 800 }}>{totals.followUps || 0} {lang === 'TH' ? 'ครั้ง' : ''}</strong>
                    </div>
                </div>
            </div>

            {/* Chart Canvas Area */}
            {!hasAnyData ? (
                <div style={{
                    textAlign: 'center',
                    padding: '44px 16px',
                    color: 'var(--text-muted)',
                    fontSize: '13px',
                    borderRadius: '12px',
                    background: isLight ? '#f8fafc' : 'rgba(255,255,255,0.02)',
                    border: isLight ? '1px dashed #cbd5e1' : '1px dashed rgba(255,255,255,0.1)'
                }}>
                    {lang === 'TH'
                        ? `ยังไม่มีข้อมูลสถิติรายวันในรอบเดือน ${monthLabel}`
                        : `No daily performance records found for ${monthLabel}`}
                </div>
            ) : (
                <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>
                    <div style={{
                        minWidth: '720px',
                        position: 'relative',
                        paddingTop: '22px',
                        paddingLeft: '42px',
                        paddingRight: '8px'
                    }}>
                        {/* Horizontal Grid Lines + Y-Axis Labels */}
                        <div style={{ position: 'relative', height: '215px', display: 'flex', alignItems: 'flex-end' }}>
                            {[1, 0.5, 0].map((ratio) => {
                                const topPct = (1 - ratio) * 100;
                                return (
                                    <div
                                        key={ratio}
                                        style={{
                                            position: 'absolute',
                                            left: '-42px',
                                            right: 0,
                                            top: `${topPct}%`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            pointerEvents: 'none',
                                            zIndex: 1
                                        }}
                                    >
                                        <span style={{
                                            width: '36px',
                                            textAlign: 'right',
                                            paddingRight: '6px',
                                            fontSize: '10px',
                                            fontWeight: 600,
                                            color: 'var(--text-muted)',
                                            transform: 'translateY(-50%)'
                                        }}>
                                            {String(Math.round(maxScale * ratio))}
                                        </span>
                                        <div style={{
                                            flex: 1,
                                            borderTop: ratio === 0
                                                ? (isLight ? '1.5px solid #cbd5e1' : '1.5px solid rgba(255,255,255,0.16)')
                                                : (isLight ? '1px dashed #e2e8f0' : '1px dashed rgba(255,255,255,0.08)')
                                        }} />
                                    </div>
                                );
                            })}

                            {/* Day Columns */}
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
                                    gap: '3px',
                                    width: '100%',
                                    height: '100%',
                                    alignItems: 'flex-end',
                                    position: 'relative',
                                    zIndex: 2
                                }}
                                onMouseLeave={() => setHoveredDay(null)}
                            >
                                {days.map((item) => {
                                    const isHovered = hoveredDay === item.day;
                                    const isToday = isCurrentMonth && item.day === todayDateNum;

                                    const hInq = item.inquiries > 0 ? Math.max(4, Math.round((item.inquiries / maxScale) * 100)) : 0;
                                    const hReg = item.registered > 0 ? Math.max(4, Math.round((item.registered / maxScale) * 100)) : 0;
                                    const hDepCnt = item.depositors > 0 ? Math.max(4, Math.round((item.depositors / maxScale) * 100)) : 0;
                                    const hFollow = item.followUps > 0 ? Math.max(4, Math.round((item.followUps / maxScale) * 100)) : 0;

                                    return (
                                        <div
                                            key={item.day}
                                            onMouseEnter={(e) => handleActivateDay(item.day, e.currentTarget)}
                                            onClick={(e) => {
                                                if (isHovered) setHoveredDay(null);
                                                else handleActivateDay(item.day, e.currentTarget);
                                            }}
                                            style={{
                                                height: '100%',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'flex-end',
                                                alignItems: 'center',
                                                cursor: 'pointer',
                                                position: 'relative',
                                                borderRadius: '8px 8px 0 0',
                                                background: isHovered
                                                    ? (isLight ? 'rgba(124, 58, 237, 0.08)' : 'rgba(168, 85, 247, 0.14)')
                                                    : isToday
                                                        ? (isLight ? 'rgba(16, 185, 129, 0.05)' : 'rgba(16, 185, 129, 0.06)')
                                                        : 'transparent',
                                                transition: 'background 0.15s ease'
                                            }}
                                        >
                                            {/* Compact Deposit Amount Tag Above Bar */}
                                            {item.depositAmount > 0 && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '-18px',
                                                    fontSize: '9px',
                                                    fontWeight: 800,
                                                    color: isLight ? '#059669' : '#34d399',
                                                    background: isLight ? '#ecfdf5' : 'rgba(16, 185, 129, 0.15)',
                                                    border: '1px solid rgba(16, 185, 129, 0.3)',
                                                    padding: '0px 4px',
                                                    borderRadius: '4px',
                                                    whiteSpace: 'nowrap',
                                                    pointerEvents: 'none'
                                                }}>
                                                    {formatCompactBaht(item.depositAmount)}
                                                </div>
                                            )}

                                            {/* 4 Unified Bars: Inquiries, Registered, Depositors, Follow-up Ticks */}
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'flex-end',
                                                justifyContent: 'center',
                                                gap: '1.5px',
                                                width: '100%',
                                                height: '100%',
                                                padding: '0 2px'
                                            }}>
                                                <div style={{
                                                    width: '22%',
                                                    maxWidth: '6px',
                                                    height: `${hInq}%`,
                                                    minHeight: item.inquiries > 0 ? '4px' : '2px',
                                                    background: item.inquiries > 0 ? '#a855f7' : (isLight ? '#e2e8f0' : 'rgba(255,255,255,0.07)'),
                                                    borderRadius: '3px 3px 0 0',
                                                    transition: 'height 0.3s ease'
                                                }} />
                                                <div style={{
                                                    width: '22%',
                                                    maxWidth: '6px',
                                                    height: `${hReg}%`,
                                                    minHeight: item.registered > 0 ? '4px' : '2px',
                                                    background: item.registered > 0 ? '#38bdf8' : (isLight ? '#e2e8f0' : 'rgba(255,255,255,0.07)'),
                                                    borderRadius: '3px 3px 0 0',
                                                    transition: 'height 0.3s ease'
                                                }} />
                                                <div style={{
                                                    width: '22%',
                                                    maxWidth: '6px',
                                                    height: `${hDepCnt}%`,
                                                    minHeight: item.depositors > 0 ? '4px' : '2px',
                                                    background: item.depositors > 0 ? '#10b981' : (isLight ? '#e2e8f0' : 'rgba(255,255,255,0.07)'),
                                                    borderRadius: '3px 3px 0 0',
                                                    transition: 'height 0.3s ease'
                                                }} />
                                                <div style={{
                                                    width: '22%',
                                                    maxWidth: '6px',
                                                    height: `${hFollow}%`,
                                                    minHeight: item.followUps > 0 ? '4px' : '2px',
                                                    background: item.followUps > 0 ? '#f59e0b' : (isLight ? '#e2e8f0' : 'rgba(255,255,255,0.07)'),
                                                    borderRadius: '3px 3px 0 0',
                                                    transition: 'height 0.3s ease'
                                                }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* X-Axis Day Numbers */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
                            gap: '3px',
                            marginTop: '6px'
                        }}>
                            {days.map((item) => {
                                const isToday = isCurrentMonth && item.day === todayDateNum;
                                const isHovered = hoveredDay === item.day;
                                return (
                                    <div
                                        key={item.day}
                                        style={{
                                            textAlign: 'center',
                                            fontSize: '10.5px',
                                            fontWeight: isToday || isHovered ? 800 : 600,
                                            color: isToday
                                                ? '#10b981'
                                                : isHovered
                                                    ? 'var(--primary)'
                                                    : 'var(--text-muted)',
                                            background: isToday ? 'rgba(16, 185, 129, 0.14)' : 'transparent',
                                            borderRadius: '6px',
                                            padding: '2px 0'
                                        }}
                                        title={isToday ? (lang === 'TH' ? 'วันนี้' : 'Today') : item.dateStr}
                                    >
                                        {item.day}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Unified Legend & Hint Footer */}
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
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#a855f7', display: 'inline-block' }} />
                        <span>{lang === 'TH' ? `ทักทั้งหมด (${totals.inquiries || 0})` : `Inquiries (${totals.inquiries || 0})`}</span>
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#38bdf8', display: 'inline-block' }} />
                        <span>{lang === 'TH' ? `สมัครแล้ว (${totals.registered || 0})` : `Registered (${totals.registered || 0})`}</span>
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#10b981', display: 'inline-block' }} />
                        <span>{lang === 'TH' ? `ฝากแล้ว (${totals.depositors || 0})` : `Deposited (${totals.depositors || 0})`}</span>
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#f59e0b', display: 'inline-block' }} />
                        <span>{lang === 'TH' ? `ติ๊กติดตาม (${totals.followUps || 0} ครั้ง)` : `Follow-ups (${totals.followUps || 0})`}</span>
                    </span>
                </div>

                <span>
                    💡 {lang === 'TH' ? 'ชี้หรือแตะที่แท่งกราฟเพื่อดูรายละเอียดและยอดฝากรายวัน' : 'Hover or tap any day bar for daily details & revenue'}
                </span>
            </div>

            {/* Floating Portal Tooltip (Never Clipped by Overflow Containers) */}
            {hoveredItem && typeof document !== 'undefined' && createPortal(
                <div
                    style={{
                        position: 'fixed',
                        top: `${tooltipPos.top}px`,
                        left: `${tooltipPos.left}px`,
                        transform: tooltipPos.placeBelow ? 'none' : 'translateY(-100%)',
                        zIndex: 3000,
                        width: '230px',
                        padding: '11px 13px',
                        borderRadius: '12px',
                        background: isLight ? '#0f172a' : '#020617',
                        color: '#f8fafc',
                        border: '1px solid rgba(168, 85, 247, 0.55)',
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
                        <span>📅 {lang === 'TH' ? `วันที่ ${hoveredItem.day}` : `Day ${hoveredItem.day}`}</span>
                        <span style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 600 }}>{hoveredItem.dateStr}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                            <span style={{ color: '#c084fc' }}>🟣 {lang === 'TH' ? 'ทักเข้ามา:' : 'Inquiries:'}</span>
                            <strong>{hoveredItem.inquiries} {lang === 'TH' ? 'คน' : ''}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                            <span style={{ color: '#38bdf8' }}>🔵 {lang === 'TH' ? 'สมัครแล้ว:' : 'Registered:'}</span>
                            <strong>{hoveredItem.registered} {lang === 'TH' ? 'คน' : ''}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                            <span style={{ color: '#34d399' }}>🟢 {lang === 'TH' ? 'ปิดฝากได้:' : 'Deposited:'}</span>
                            <strong>
                                {hoveredItem.depositors} {lang === 'TH' ? 'คน' : ''}
                                {hoveredItem.registered > 0 ? ` (${hoveredItem.conversionRate}%)` : ''}
                            </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                            <span style={{ color: '#fbbf24' }}>🟠 {lang === 'TH' ? 'ติ๊กติดตาม:' : 'Follow-ups:'}</span>
                            <strong>{hoveredItem.followUps} {lang === 'TH' ? 'ครั้ง' : ''}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', paddingTop: '4px', marginTop: '2px', borderTop: '1px dashed rgba(255,255,255,0.14)' }}>
                            <span style={{ color: '#34d399' }}>
                                💰 {depositMetricMode === 'FIRST' ? (lang === 'TH' ? 'ยอดฝาก (FTD):' : 'FTD:') : (lang === 'TH' ? 'ยอดฝาก:' : 'Deposit:')}
                            </span>
                            <strong style={{ color: '#fbbf24' }}>฿{hoveredItem.depositAmount.toLocaleString()}</strong>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default DailyTrendChart;

// Supervisor Follow-Up Audit Heatmap (Calendar Grid & Follow-Up Metrics)
import React from 'react';
import { useApp } from '../../context/AppContext';
import { isOverdue3Days } from '../../utils/customerFormatters';

export const MonthlyHeatmap = ({ customer, targetMonthOverride }) => {
    const { lang, theme, selectedMonth } = useApp();
    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const todayDayNum = today.getDate();
    const targetMonth = targetMonthOverride || ((!selectedMonth || selectedMonth === 'ALL') ? currentMonthStr : selectedMonth);
    const isCurrentMonth = (targetMonth === currentMonthStr);

    let numDays = 31;
    try {
        const [yr, mn] = targetMonth.split('-');
        if (yr && mn) {
            numDays = new Date(parseInt(yr), parseInt(mn), 0).getDate();
        }
    } catch (e) {
        numDays = 31;
    }

    const fMap = (customer.followUpByMonth && customer.followUpByMonth[targetMonth]) 
        || customer.followUp || {};
    
    const tickedDays = Object.entries(fMap)
        .filter(([day, val]) => Boolean(val) && parseInt(day) >= 1 && parseInt(day) <= numDays)
        .map(([day]) => parseInt(day))
        .sort((a, b) => a - b);
    
    const tickedCount = tickedDays.length;
    const isTodayTicked = isCurrentMonth && Boolean(fMap[String(todayDayNum)]);
    const isOverdue = isOverdue3Days(customer, targetMonth);

    const tickedSummaryText = tickedCount === 0
        ? (lang === 'TH' ? 'ยังไม่เคยตาม' : 'Never contacted')
        : tickedCount <= 3
            ? (lang === 'TH' ? `ตาม ${tickedCount} วัน (ว.${tickedDays.join(',')})` : `${tickedCount} days (D.${tickedDays.join(',')})`)
            : (lang === 'TH' ? `ตาม ${tickedCount} วัน (ล่าสุด ว.${tickedDays[tickedDays.length - 1]})` : `${tickedCount} days (Latest D.${tickedDays[tickedDays.length - 1]})`);

    return (
        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '185px', textAlign: 'left' }}>
            {/* Quick Status Bar for Supervisor */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', fontSize: '10px', padding: '0 2px' }}>
                <span 
                    style={{ 
                        fontWeight: 700, 
                        color: tickedCount > 0 ? (theme === 'light' ? '#7c3aed' : '#c084fc') : 'var(--text-muted)'
                    }} 
                    title={tickedCount > 0 ? (lang === 'TH' ? `ประวัติตามวันที่: ${tickedDays.join(', ')}` : `History on dates: ${tickedDays.join(', ')}`) : (lang === 'TH' ? 'ยังไม่มีประวัติติดตาม' : 'No follow-up history')}
                >
                    📞 {tickedSummaryText}
                </span>
                {isCurrentMonth && (
                    <span style={{ 
                        fontSize: '9px', 
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: isTodayTicked 
                            ? (theme === 'light' ? '#dcfce7' : 'rgba(16, 185, 129, 0.15)') 
                            : isOverdue 
                                ? (theme === 'light' ? '#fee2e2' : 'rgba(244, 63, 94, 0.18)') 
                                : (theme === 'light' ? '#f1f5f9' : 'rgba(255, 255, 255, 0.05)'),
                        color: isTodayTicked 
                            ? '#16a34a' 
                            : isOverdue 
                                ? '#e11d48' 
                                : 'var(--text-muted)',
                        border: isTodayTicked 
                            ? '1px solid rgba(16, 185, 129, 0.3)' 
                            : isOverdue 
                                ? '1px solid rgba(244, 63, 94, 0.4)' 
                                : '1px solid rgba(255, 255, 255, 0.08)'
                    }}>
                        {isTodayTicked 
                            ? (lang === 'TH' ? '✓ วันนี้ตามแล้ว' : '✓ Contacted today') 
                            : isOverdue 
                                ? (lang === 'TH' ? '⚠️ ค้างตาม 3 วัน+' : '⚠️ Overdue 3d+') 
                                : (lang === 'TH' ? `วันนี้ยังไม่ตาม (ว.${todayDayNum})` : `Pending today (D.${todayDayNum})`)}
                    </span>
                )}
            </div>

            {/* Calendar Mini-Grid (10 Columns) */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(10, 16px)', 
                gap: '2.5px', 
                background: theme === 'light' ? '#f8fafc' : 'rgba(15, 23, 42, 0.6)',
                padding: '4px 5px',
                borderRadius: '6px',
                border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.06)'
            }}>
                {Array.from({ length: numDays }, (_, idx) => {
                    const day = idx + 1;
                    const dayStr = String(day);
                    const isTicked = Boolean(fMap[dayStr]);
                    const isToday = isCurrentMonth && day === todayDayNum;
                    const isPastTicked = !isToday && isTicked;

                    let bg = theme === 'light' ? '#ffffff' : 'rgba(255, 255, 255, 0.03)';
                    let color = theme === 'light' ? '#94a3b8' : 'rgba(148, 163, 184, 0.45)';
                    let border = theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.03)';
                    let shadow = 'none';

                    if (isToday) {
                        if (isTicked) {
                            bg = '#10b981';
                            color = '#ffffff';
                            border = '1px solid #059669';
                            shadow = '0 2px 6px rgba(16, 185, 129, 0.45)';
                        } else {
                            bg = theme === 'light' ? '#ffffff' : 'rgba(139, 92, 246, 0.08)';
                            color = theme === 'light' ? '#7c3aed' : '#c084fc';
                            border = '2px solid #8b5cf6';
                            shadow = '0 0 6px rgba(139, 92, 246, 0.35)';
                        }
                    } else if (isPastTicked) {
                        bg = theme === 'light' ? '#f3e8ff' : 'rgba(168, 85, 247, 0.22)';
                        color = theme === 'light' ? '#7c3aed' : '#c084fc';
                        border = theme === 'light' ? '1px solid #d8b4fe' : '1px solid rgba(168, 85, 247, 0.45)';
                        shadow = '0 1px 3px rgba(168, 85, 247, 0.2)';
                    }

                    return (
                        <div
                            key={day}
                            title={isToday 
                                ? (lang === 'TH' ? `วันที่ ${day} (วันนี้): ${isTicked ? 'ติดตามแล้ว ✓' : 'ยังไม่ได้ติดตาม ⚠️'}` : `Day ${day} (Today): ${isTicked ? 'Contacted ✓' : 'Pending ⚠️'}`) 
                                : (lang === 'TH' ? `วันที่ ${day}: ${isTicked ? 'ติดตามแล้ว ✓' : 'ไม่ได้ติดตาม'}` : `Day ${day}: ${isTicked ? 'Contacted ✓' : 'Not contacted'}`)}
                            style={{
                                width: '16px',
                                height: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '3px',
                                fontSize: '8.5px',
                                fontWeight: isToday || isTicked ? 800 : 500,
                                background: bg,
                                color: color,
                                border: border,
                                boxShadow: shadow,
                                cursor: 'default',
                                userSelect: 'none',
                                boxSizing: 'border-box'
                            }}
                        >
                            {day}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MonthlyHeatmap;

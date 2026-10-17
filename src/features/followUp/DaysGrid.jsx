// Interactive 1-31 Days Checkmark Grid for MC Agent Follow-Up
import React from 'react';
import { useApp } from '../../context/AppContext';

export const DaysGrid = ({ 
    customer, 
    daysInMonth = 31, 
    selectedMonth, 
    pastMonthSpecificFilter, 
    onToggleDay,
    id 
}) => {
    const { lang } = useApp();
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const todayDayNum = String(now.getDate());

    const activeCustMonth = (pastMonthSpecificFilter && pastMonthSpecificFilter !== 'ALL' && pastMonthSpecificFilter !== 'CURRENT')
        ? pastMonthSpecificFilter
        : (customer.campaignMonth || currentMonthStr);

    const fMap = (customer.followUpByMonth && customer.followUpByMonth[activeCustMonth]) || customer.followUp || {};

    const isCurrentMonthView = selectedMonth === 'ALL'
        ? customer.campaignMonth === currentMonthStr
        : selectedMonth === currentMonthStr;

    const handleBoxClick = (dayNum) => {
        const isToday = isCurrentMonthView && dayNum === todayDayNum;
        if (!isToday) {
            alert(lang === 'TH' 
                ? `⚠️ ไม่อนุญาตให้ติ๊กติดตามย้อนหลังหรือล่วงหน้า! คุณสามารถติ๊กติดตามได้เฉพาะวันที่ปัจจุบันเท่านั้น (วันที่ ${todayDayNum})`
                : `⚠️ Cannot log follow-ups for past or future dates! You can only log follow-ups for today (Day ${todayDayNum})`);
            return;
        }
        if (onToggleDay) {
            onToggleDay(customer.id, dayNum);
        }
    };

    return (
        <div 
            id={id} 
            className="days-grid" 
            style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 24px)',
                gap: '3px',
                width: '186px',
                minWidth: '186px',
                maxWidth: '186px',
                margin: '0 auto'
            }}
        >
            {Array.from({ length: daysInMonth }, (_, idx) => {
                const dayNum = String(idx + 1);
                const isTicked = Boolean(fMap[dayNum]);
                const isToday = isCurrentMonthView && dayNum === todayDayNum;

                return (
                    <div 
                        key={dayNum} 
                        className={`day-box ${isTicked ? 'active' : 'inactive'} ${!isToday ? 'disabled' : ''}`}
                        onClick={() => handleBoxClick(dayNum)}
                        style={{
                            cursor: isToday ? 'pointer' : 'not-allowed',
                            opacity: isToday ? 1 : isTicked ? 0.6 : 0.3,
                            border: isToday ? '2px solid var(--primary)' : undefined,
                            transform: isToday ? 'scale(1.1)' : undefined
                        }}
                        title={
                            isToday
                                ? (lang === 'TH' ? `วันที่ ${dayNum} (วันนี้): ${isTicked ? 'ติดตามแล้ว (กดเพื่อยกเลิก)' : 'ยังไม่ได้ติดตาม (กดเพื่อติ๊กติดตาม)'}` : `Day ${dayNum} (Today): ${isTicked ? 'Followed up (click to undo)' : 'Pending follow-up (click to check)'}`)
                                : (lang === 'TH' ? `วันที่ ${dayNum}: ไม่อนุญาตให้ติ๊กย้อนหลังหรือล่วงหน้า (ติ๊กได้เฉพาะวันที่ปัจจุบันเท่านั้น - วันที่ ${todayDayNum})` : `Day ${dayNum}: Cannot log past or future dates (today is day ${todayDayNum})`)
                        }
                    >
                        {dayNum}
                    </div>
                );
            })}
        </div>
    );
};

// Customer display formatters and status helpers

export const formatLineLekDisplay = (val, currentLang = 'TH') => {
    const v = (val || '').trim();
    if (!v) return '-';
    const isTH = currentLang === 'TH';
    if (v === 'มี' || v === 'มีไลน์เล็ก' || v === 'HAS' || v.toLowerCase() === 'has' || v === 'Has LINE') {
        return isTH ? 'มี' : 'Has LINE';
    }
    if (v === 'ไม่มี' || v === 'ไม่มีไลน์เล็ก' || v === 'NONE' || v.toLowerCase() === 'none' || v === 'No LINE') {
        return isTH ? 'ไม่มี' : 'No LINE';
    }
    if (v === 'รอแอด' || v === 'รอแอดไลน์เล็ก' || v === 'WAITING' || v.toLowerCase() === 'waiting' || v === 'Pending Add' || v === 'Pending') {
        return isTH ? 'รอแอด' : 'Pending Add';
    }
    return v;
};

export const formatChannelDisplayName = (chName, currentLang = 'TH') => {
    if (!chName) return '';
    const trimmed = String(chName).trim();
    const lower = trimmed.toLowerCase();

    if (currentLang === 'EN') {
        if (lower === 'ค้นหาหน้า google' || lower === 'google') return 'Google Search';
        if (lower === 'เพื่อนแนะนำ' || lower === 'เพื่อน' || lower === 'referral') return 'Friend Referral';
        if (lower === 'เซียน' || lower === 'sian') return 'Master / Expert';
        if (lower === 'facebook' || lower === 'fb') return 'Facebook';
        if (lower === 'line') return 'LINE';
        if (lower === 'tiktok') return 'TikTok';
        if (lower === 'doopenteam') return 'Doopenteam';
        return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    }

    // In Thai (TH)
    if (lower === 'facebook') return 'Facebook';
    if (lower === 'line') return 'Line';
    if (lower === 'tiktok') return 'TikTok';
    if (lower === 'doopenteam') return 'Doopenteam';
    return trimmed;
};

export const getCustomerKpiCategory = (c, lang = 'TH') => {
    const hasUser = Boolean(c.username && String(c.username).trim() !== '');
    const hasDep = Boolean(c.hasDeposited || (Number(c.totalDeposit) > 0));
    if (!hasUser) {
        return lang === 'TH' ? 'ทักแต่ไม่สมัคร' : 'Inquired (Not Registered)';
    }
    if (hasDep) {
        if (Number(c.returnedDepositAmount) > 0) {
            return lang === 'TH' ? 'ลูกค้าฝากซ้ำ' : 'Repeat Depositor';
        }
        return lang === 'TH' ? 'สมัครและฝากเงินแล้ว' : 'Registered & Deposited';
    }
    return lang === 'TH' ? 'สมัครแต่ไม่ฝาก' : 'Registered (Pending Deposit)';
};

export const isOverdue3Days = (c, monthKey) => {
    if (c.hasDeposited || isTenDaysFollowUpCompleted(c)) return false;
    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const isHistoricalMonth = Boolean(monthKey && monthKey !== 'ALL' && monthKey < currentMonthStr);
    
    let dayNum = today.getDate();
    if (isHistoricalMonth) {
        dayNum = 31;
    } else {
        if (dayNum < 3) return false;
    }

    if (c.createdAt) {
        const createdDate = new Date(c.createdAt);
        if (!isNaN(createdDate.getTime())) {
            const diffMs = today.getTime() - createdDate.getTime();
            const diffDays = diffMs / (1000 * 60 * 60 * 24);
            if (diffDays < 3) return false;
        }
    }

    const targetMonth = (!monthKey || monthKey === 'ALL') ? currentMonthStr : monthKey;
    const fMap = (c.followUpByMonth && c.followUpByMonth[targetMonth]) || c.followUp || {};
    const dToday = Boolean(fMap[String(dayNum)]);
    const d1 = Boolean(fMap[String(dayNum - 1)]);
    const d2 = Boolean(fMap[String(dayNum - 2)]);

    return !dToday && !d1 && !d2;
};

export const isDueTodayFollowUp = (c, monthKey = null) => {
    if (!c || c.hasDeposited) return false;
    // คัดลีดที่ตามครบ 10 วันแล้วแต่ยังไม่ฝาก ออกจากคิวต้องติดตามวันนี้อัตโนมัติ
    if (isTenDaysFollowUpCompleted(c)) return false;

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const todayDayNum = String(now.getDate());
    const currentMonthStr = todayStr.substring(0, 7);
    const targetMonth = (!monthKey || monthKey === 'ALL') ? currentMonthStr : monthKey;
    const fMap = (c.followUpByMonth && (c.followUpByMonth[targetMonth] || c.followUpByMonth[c.campaignMonth])) || c.followUp || {};
    const isTickedToday = Boolean(fMap[todayDayNum] || (c.followUp && c.followUp[todayDayNum]));

    // ระบบเคลียร์คิวงานประจำวัน: ลูกค้าที่ยังไม่ได้ฝากเงิน และยังไม่หมดรอบ 10 วัน หากวันนี้ยังไม่ได้ติ๊ก = อยู่ในคิวต้องติดตามวันนี้
    return !isTickedToday;
};

export const getFollowUpDueReason = (c, monthKey = null) => {
    if (!c || c.hasDeposited || isTenDaysFollowUpCompleted(c)) return null;
    return isDueTodayFollowUp(c, monthKey) ? 'PENDING_TODAY' : null;
};

export const getStagnantDepositInfo = (c, lang = 'TH') => {
    if (!c || c.hasDeposited || isTenDaysFollowUpCompleted(c)) return null;
    if (!c.createdAt) return null;
    const createdDate = new Date(c.createdAt);
    if (isNaN(createdDate.getTime())) return null;
    const now = new Date();
    const diffMs = now.getTime() - createdDate.getTime();
    if (diffMs < 0) return null;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays >= 5) {
        return {
            level: 'CRITICAL',
            days: diffDays,
            badgeText: lang === 'TH' ? `🔥 นิ่ง ${diffDays} วัน+ (ยังไม่ฝาก)` : `🔥 Stagnant ${diffDays}d+ (No Deposit)`,
            tooltip: lang === 'TH' 
                ? `🚨 ลูกค้ารายนี้สมัครมาแล้ว ${diffDays} วัน ยังไม่มียอดฝากเงิน (เกิน 5 วัน) กรุณาเสนอโปรโมชั่นเร่งด่วน`
                : `🚨 Registered ${diffDays} days ago with no deposit (5+ days overdue). Immediate follow-up required.`
        };
    }
    if (diffDays >= 3) {
        return {
            level: 'WARNING',
            days: diffDays,
            badgeText: lang === 'TH' ? `⏳ นิ่ง ${diffDays} วัน (รอฝาก)` : `⏳ Stagnant ${diffDays}d (Pending)`,
            tooltip: lang === 'TH'
                ? `⏳ ลูกค้ารายนี้สมัครมาแล้ว ${diffDays} วัน ยังไม่มียอดฝากเงิน เฝ้าระวังและติดตามกระตุ้นยอด`
                : `⏳ Registered ${diffDays} days ago with no deposit. Follow up recommended.`
        };
    }
    return null;
};

/**
 * นับจำนวนวันที่ได้รับการติดตามทั้งหมดของลูกค้า (นับวันที่มีการติ๊กถูกจริง)
 * รองรับทั้งโครงสร้างเดือนปัจจุบันและข้ามเดือน (followUpByMonth) รวมถึง followUp เดิม
 */
export const getCustomerFollowUpDaysCount = (c) => {
    if (!c) return 0;
    const distinctDays = new Set();

    if (c.followUpByMonth && typeof c.followUpByMonth === 'object') {
        Object.entries(c.followUpByMonth).forEach(([mKey, mObj]) => {
            if (mObj && typeof mObj === 'object') {
                Object.entries(mObj).forEach(([dayNum, isTicked]) => {
                    if (isTicked) {
                        distinctDays.add(`${mKey}_${dayNum}`);
                    }
                });
            }
        });
    }

    if (distinctDays.size === 0 && c.followUp && typeof c.followUp === 'object') {
        Object.entries(c.followUp).forEach(([dayNum, isTicked]) => {
            if (isTicked) {
                distinctDays.add(`legacy_${dayNum}`);
            }
        });
    }

    return distinctDays.size;
};

/**
 * ตรวจสอบว่าลูกค้าตามครบ 10 วันแล้วแต่ยังไม่ฝากเงินหรือไม่ (หมดรอบติดตาม 10 วัน)
 * เงื่อนไข: ยังไม่มียอดฝากเงิน และมีประวัติติดตาม (ติ๊กถูก) ครบ 10 วันขึ้นไป
 */
export const isTenDaysFollowUpCompleted = (c) => {
    if (!c) return false;
    const hasDep = Boolean(c.hasDeposited || Number(c.totalDeposit || 0) > 0);
    if (hasDep) return false;

    const count = getCustomerFollowUpDaysCount(c);
    return count >= 10;
};



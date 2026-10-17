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
    if (c.hasDeposited) return false;
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

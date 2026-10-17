// Date and Time formatting utility functions

export const getTodayLocalDateStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

export const getCurrentMonthStr = () => {
    return new Date().toISOString().substring(0, 7);
};

export const formatLastLogin = (val, currentLang = 'TH') => {
    if (!val) return null;
    const isTH = currentLang === 'TH';
    const s = String(val).trim();

    // Direct support for already-formatted strings like "วันนี้ 11:52" or "Today 11:52"
    if (s.startsWith('วันนี้ ') || s.startsWith('Today ')) {
        const timePart = s.replace(/^(วันนี้|Today)\s+/, '');
        return `${isTH ? 'วันนี้' : 'Today'} ${timePart}`;
    }

    try {
        const clean = s.replace('T', ' ');
        const parts = clean.split(' ');
        if (parts.length >= 2) {
            const [dPart, tPart] = parts;
            const dParts = dPart.split('-');
            const tParts = tPart.split(':');
            if (dParts.length === 3 && tParts.length >= 2) {
                const nowBangkok = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
                const y = nowBangkok.getFullYear();
                const m = String(nowBangkok.getMonth() + 1).padStart(2, '0');
                const d = String(nowBangkok.getDate()).padStart(2, '0');
                const todayStr = `${y}-${m}-${d}`;

                const hh = tParts[0].padStart(2, '0');
                const mm = tParts[1].padStart(2, '0');
                if (dPart === todayStr) {
                    return `${isTH ? 'วันนี้' : 'Today'} ${hh}:${mm}`;
                }
                const yr = dParts[0].length === 4 ? dParts[0].slice(2) : dParts[0];
                return `${dParts[2]}/${dParts[1]}/${yr} ${hh}:${mm}`;
            }
        }

        const dObj = new Date(val);
        if (!isNaN(dObj.getTime())) {
            const now = new Date();
            const isToday = dObj.toDateString() === now.toDateString();
            const timePart = dObj.toLocaleTimeString(isTH ? 'th-TH' : 'en-GB', { hour: '2-digit', minute: '2-digit' });
            if (isToday) return `${isTH ? 'วันนี้' : 'Today'} ${timePart}`;
            const datePart = dObj.toLocaleDateString(isTH ? 'th-TH' : 'en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
            return `${datePart} ${timePart}`;
        }
    } catch (e) {
        return s;
    }
    return s;
};

export const formatKeyedDateTime = (isoStr, customLang = 'TH') => {
    if (!isoStr) return '-';
    try {
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) {
            return String(isoStr);
        }
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const str = String(isoStr);
        if (str.length === 10 || str.endsWith('T00:00:00.000Z')) {
            return `${day}/${month}/${year}`;
        }
        if (customLang === 'EN') {
            return `${day}/${month}/${year} ${hours}:${minutes}`;
        }
        return `${day}/${month}/${year} ${hours}:${minutes} น.`;
    } catch (e) {
        return String(isoStr);
    }
};

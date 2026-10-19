// CSV Exporter with Formula Injection Protection (RFC 4180 + Excel Guard) & UTF-8 BOM
import { formatLineLekDisplay, getCustomerKpiCategory } from './customerFormatters.js';

export const sanitizeCsvCell = (val) => {
    if (val === null || val === undefined) return '""';
    let str = String(val).trim();
    if (!str) return '""';
    // ป้องกัน CSV/Excel Formula Injection หากข้อความขึ้นต้นด้วย =, +, -, @, \t, \r
    if (/^[=+\-@\t\r]/.test(str)) {
        str = "'" + str;
    }
    return `"${str.replace(/"/g, '""')}"`;
};

export const exportCustomersToCSV = (targetList, filename = 'MC_Customer_List.csv', lang = 'TH') => {
    if (!targetList || targetList.length === 0) {
        alert(lang === 'TH' ? 'ไม่มีข้อมูลสำหรับดาวน์โหลด CSV' : 'No data available for CSV export');
        return;
    }

    const headers = [
        'ID',
        lang === 'TH' ? 'วันที่คีย์สมัคร' : 'Registration Date',
        lang === 'TH' ? 'รอบเดือน' : 'Campaign Month',
        lang === 'TH' ? 'ชื่อ-นามสกุล' : 'Full Name',
        lang === 'TH' ? 'ยูสเซอร์เนม' : 'Username',
        lang === 'TH' ? 'เบอร์โทร' : 'Phone',
        lang === 'TH' ? 'Line OA' : 'Line OA',
        lang === 'TH' ? 'สถานะไลน์เล็ก' : 'Line Lek Status',
        lang === 'TH' ? 'ช่องทางสมัคร' : 'Source Channel',
        lang === 'TH' ? 'ผู้แนะนำ (Referrer)' : 'Referrer',
        lang === 'TH' ? 'ผู้ดูแลหลัก (Owner)' : 'Owner Agent',
        lang === 'TH' ? 'กลุ่มสถานะลูกค้า (KPI)' : 'Customer Segment (KPI)',
        lang === 'TH' ? 'ยอดฝากเงินสะสม' : 'Total Deposit Amount',
        lang === 'TH' ? 'สถานะการฝาก' : 'Deposit Status',
        lang === 'TH' ? 'ประวัติการติ๊กตาม (1-31)' : 'Follow-Up Days (1-31)',
        lang === 'TH' ? 'โน้ตรายละเอียด' : 'Notes'
    ];

    const rows = targetList.map(c => {
        const followUpDays = c.followUp
            ? Object.entries(c.followUp)
                .filter(([_, val]) => val)
                .map(([d]) => lang === 'TH' ? `วันที่ ${d}` : `Day ${d}`)
                .join('; ')
            : '';

        return [
            c.id,
            c.createdAt ? c.createdAt.substring(0, 10) : (c.registrationDate || ''),
            c.campaignMonth || '',
            sanitizeCsvCell(c.fullName || ''),
            sanitizeCsvCell(c.username || ''),
            sanitizeCsvCell(c.phone || ''),
            sanitizeCsvCell(c.lineOA || ''),
            sanitizeCsvCell(formatLineLekDisplay(c.lineLek, lang)),
            sanitizeCsvCell(c.sourceChannel || ''),
            sanitizeCsvCell(c.referrer || '-'),
            sanitizeCsvCell(c.createdBy || ''),
            sanitizeCsvCell(getCustomerKpiCategory(c, lang)),
            c.totalDeposit || 0,
            c.hasDeposited ? (lang === 'TH' ? 'ฝากแล้ว' : 'Deposited') : (lang === 'TH' ? 'ยังไม่ฝาก' : 'Pending Deposit'),
            sanitizeCsvCell(followUpDays),
            sanitizeCsvCell(c.notes || '')
        ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadBlob(csvContent, filename, 'text/csv;charset=utf-8;');
};

export const exportLogsToCSV = (logs, filename = 'MC_Audit_Logs.csv', lang = 'TH', activeAgentName = 'System') => {
    if (!logs || logs.length === 0) {
        alert(lang === 'TH' ? 'ไม่มีประวัติการแก้ไขสำหรับดาวน์โหลด CSV' : 'No audit log data available for CSV export');
        return;
    }

    const headers = [
        lang === 'TH' ? 'เวลาที่บันทึก' : 'Timestamp',
        lang === 'TH' ? 'ประเภทหมวดหมู่' : 'Category Tag',
        lang === 'TH' ? 'รายละเอียดการแก้ไข/กิจกรรม' : 'Action Details',
        lang === 'TH' ? 'ระดับประเภท' : 'Log Type',
        lang === 'TH' ? 'ผู้ดำเนินการ' : 'Operator'
    ];

    const rows = logs.map(l => [
        sanitizeCsvCell(l.time || ''),
        sanitizeCsvCell(l.tag || ''),
        sanitizeCsvCell(l.msg || ''),
        sanitizeCsvCell(l.type || ''),
        sanitizeCsvCell(l.operator || activeAgentName || 'System')
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadBlob(csvContent, filename, 'text/csv;charset=utf-8;');
};

export const exportExecutiveCSV = (reportCusts, selectedMonth, lang = 'TH') => {
    if (!reportCusts || reportCusts.length === 0) {
        alert(lang === 'TH' ? 'ไม่มีข้อมูลสำหรับส่งออกรายงาน' : 'No data for report export');
        return;
    }

    const headers = lang === 'TH' ? [
        'ลำดับ',
        'ชื่อ-นามสกุล',
        'Username',
        'เบอร์โทร',
        'LINE ID',
        'สถานะไลน์เล็ก',
        'ช่องทางสมัคร',
        'ผู้แนะนำ (Referrer)',
        'ผู้ดูแลหลัก (Owner)',
        'กลุ่มสถานะลูกค้า (KPI)',
        'ยอดฝากสะสม (บาท)',
        'สถานะฝากเงิน',
        'รอบเดือน'
    ] : [
        'No.',
        'Full Name',
        'Username',
        'Phone',
        'LINE ID',
        'LINE OA Status',
        'Source Channel',
        'Referrer',
        'Owner Agent',
        'Customer Segment (KPI)',
        'Total Deposit (THB)',
        'Deposit Status',
        'Campaign Month'
    ];

    const rows = reportCusts.map((c, i) => [
        i + 1,
        sanitizeCsvCell(c.fullName || '-'),
        sanitizeCsvCell(c.username || (lang === 'TH' ? 'ค้างสมัคร' : 'Unregistered')),
        sanitizeCsvCell(c.phone || '-'),
        sanitizeCsvCell(c.lineOA || '-'),
        sanitizeCsvCell(c.lineLek || (lang === 'TH' ? 'รอแอด' : 'Pending Add')),
        sanitizeCsvCell(c.sourceChannel || '-'),
        sanitizeCsvCell(c.referrer || '-'),
        sanitizeCsvCell(c.createdBy || '-'),
        sanitizeCsvCell(getCustomerKpiCategory(c, lang)),
        Number(c.totalDeposit) || 0,
        c.hasDeposited ? (lang === 'TH' ? 'ฝากเงินแล้ว' : 'Deposited') : (lang === 'TH' ? 'ค้างฝาก' : 'Pending'),
        sanitizeCsvCell(c.campaignMonth || selectedMonth)
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadBlob(csvContent, `MC-Executive-Deep-Analytics-${selectedMonth}.csv`, 'text/csv;charset=utf-8;');
};

const downloadBlob = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

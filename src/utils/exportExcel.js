// SheetJS (.xlsx) Exporter with Phone Zero Protection and Auto Column Widths
import * as XLSX from 'xlsx';
import { formatLineLekDisplay, getCustomerKpiCategory } from './customerFormatters';
import { exportCustomersToCSV, exportExecutiveCSV } from './exportCsv';

export const exportCustomersToExcel = (targetList, filename = 'MC_Customer_List.xlsx', lang = 'TH', selectedMonth = 'ALL') => {
    if (!targetList || targetList.length === 0) {
        alert(lang === 'TH' ? 'ไม่มีข้อมูลสำหรับดาวน์โหลด Excel' : 'No data available for Excel export');
        return;
    }

    try {
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

        const dataRows = targetList.map(c => {
            const followUpDays = c.followUp
                ? Object.entries(c.followUp)
                    .filter(([_, val]) => val)
                    .map(([d]) => lang === 'TH' ? `วันที่ ${d}` : `Day ${d}`)
                    .join(', ')
                : '';

            return [
                String(c.id != null ? c.id : ''),
                c.createdAt ? c.createdAt.substring(0, 10) : (c.registrationDate || ''),
                c.campaignMonth || '',
                c.fullName || '',
                c.username || '',
                String(c.phone || ''),
                c.lineOA || '',
                formatLineLekDisplay(c.lineLek, lang),
                c.sourceChannel || '',
                String(c.referrer || '-'),
                c.createdBy || '',
                getCustomerKpiCategory(c, lang),
                Number(c.totalDeposit) || 0,
                c.hasDeposited ? (lang === 'TH' ? 'ฝากแล้ว' : 'Deposited') : (lang === 'TH' ? 'ยังไม่ฝาก' : 'Pending Deposit'),
                followUpDays,
                c.notes || ''
            ];
        });

        const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

        // Explicitly set text format ('s') for ID, Username, and Phone so leading zeroes are never lost in Excel
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = 1; R <= range.e.r; ++R) {
            const idRef = XLSX.utils.encode_cell({ r: R, c: 0 });
            if (ws[idRef]) { ws[idRef].t = 's'; ws[idRef].z = '@'; }

            const uRef = XLSX.utils.encode_cell({ r: R, c: 4 });
            if (ws[uRef]) { ws[uRef].t = 's'; ws[uRef].z = '@'; }

            const pRef = XLSX.utils.encode_cell({ r: R, c: 5 });
            if (ws[pRef]) { ws[pRef].t = 's'; ws[pRef].z = '@'; }

            const refRef = XLSX.utils.encode_cell({ r: R, c: 9 });
            if (ws[refRef]) { ws[refRef].t = 's'; ws[refRef].z = '@'; }
        }

        // Auto-fit column widths
        const colWidths = headers.map((h, i) => {
            let maxLen = h.length * 2;
            for (let R = 0; R < dataRows.length; ++R) {
                const val = dataRows[R][i];
                const strVal = val != null ? String(val) : '';
                if (strVal.length > maxLen) {
                    maxLen = Math.min(strVal.length + 4, 45);
                }
            }
            return { wch: Math.max(maxLen, 12) };
        });
        ws['!cols'] = colWidths;

        const wb = XLSX.utils.book_new();
        const sheetTitle = selectedMonth === 'ALL' ? 'ลูกค้าทั้งหมด' : `ลูกค้า_${selectedMonth.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
        XLSX.utils.book_append_sheet(wb, ws, sheetTitle.substring(0, 31));

        const xlsxFilename = filename.endsWith('.xlsx') ? filename : filename.replace(/\.csv$/, '') + '.xlsx';
        XLSX.writeFile(wb, xlsxFilename);
    } catch (e) {
        console.error('Failed to export XLSX via SheetJS, falling back to CSV:', e);
        exportCustomersToCSV(targetList, filename.replace(/\.xlsx$/, '.csv'), lang);
    }
};

export const exportExecutiveExcel = (reportCusts, selectedMonth, lang = 'TH') => {
    if (!reportCusts || reportCusts.length === 0) {
        alert(lang === 'TH' ? 'ไม่มีข้อมูลสำหรับส่งออกรายงาน' : 'No data for report export');
        return;
    }

    try {
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

        const dataRows = reportCusts.map((c, i) => [
            i + 1,
            c.fullName || '-',
            c.username || (lang === 'TH' ? 'ค้างสมัคร' : 'Unregistered'),
            String(c.phone || '-'),
            c.lineOA || '-',
            c.lineLek || (lang === 'TH' ? 'รอแอด' : 'Pending Add'),
            c.sourceChannel || '-',
            c.referrer || '-',
            c.createdBy || '-',
            getCustomerKpiCategory(c, lang),
            Number(c.totalDeposit) || 0,
            c.hasDeposited ? (lang === 'TH' ? 'ฝากเงินแล้ว' : 'Deposited') : (lang === 'TH' ? 'ค้างฝาก' : 'Pending'),
            c.campaignMonth || selectedMonth
        ]);

        const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = 1; R <= range.e.r; ++R) {
            const uRef = XLSX.utils.encode_cell({ r: R, c: 2 });
            if (ws[uRef]) { ws[uRef].t = 's'; ws[uRef].z = '@'; }
            const pRef = XLSX.utils.encode_cell({ r: R, c: 3 });
            if (ws[pRef]) { ws[pRef].t = 's'; ws[pRef].z = '@'; }
            const refRef = XLSX.utils.encode_cell({ r: R, c: 7 });
            if (ws[refRef]) { ws[refRef].t = 's'; ws[refRef].z = '@'; }
        }

        const colWidths = headers.map((h, i) => {
            let maxLen = h.length * 2;
            for (let R = 0; R < dataRows.length; ++R) {
                const val = dataRows[R][i];
                const strVal = val != null ? String(val) : '';
                if (strVal.length > maxLen) {
                    maxLen = Math.min(strVal.length + 4, 35);
                }
            }
            return { wch: Math.max(maxLen, 12) };
        });
        ws['!cols'] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'DeepAnalytics');
        XLSX.writeFile(wb, `MC-Executive-Deep-Analytics-${selectedMonth}.xlsx`);
    } catch (e) {
        console.error('Failed to export executive analytics via XLSX, falling back to CSV:', e);
        exportExecutiveCSV(reportCusts, selectedMonth, lang);
    }
};

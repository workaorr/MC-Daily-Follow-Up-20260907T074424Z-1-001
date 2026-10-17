import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useApp } from '../../context/AppContext';
import { pushCustomerToCloud } from '../../services/supabase';
import { 
    UploadCloud, 
    FileCheck2, 
    CheckCircle2, 
    Download, 
    FileSpreadsheet, 
    Info, 
    UserPlus, 
    UserCheck, 
    AlertTriangle, 
    X, 
    CheckCircle, 
    RefreshCw, 
    History, 
    Inbox 
} from 'lucide-react';

export const UploadDepositsView = () => {
    const {
        customers,
        setCustomers,
        activeAgentName,
        selectedMonth,
        currentMonthStr,
        theme,
        lang,
        supabaseClient,
        writeLog
    } = useApp();

    const [uploadedDepositFileName, setUploadedDepositFileName] = useState('');
    const [depositPreviewData, setDepositPreviewData] = useState(null);
    const [isImportingDeposits, setIsImportingDeposits] = useState(false);
    const [recentDeposits, setRecentDeposits] = useState([]);
    const [isLoadingDeposits, setIsLoadingDeposits] = useState(false);
    const [depositSearchQuery, setDepositSearchQuery] = useState('');

    const [depositUploaderMap, setDepositUploaderMap] = useState(() => {
        try {
            const saved = localStorage.getItem('mc_deposit_uploaders');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            return {};
        }
    });

    const fetchRecentDeposits = async () => {
        if (!supabaseClient) return;
        setIsLoadingDeposits(true);
        try {
            const { data, error } = await supabaseClient
                .from('mc_deposits')
                .select('*')
                .order('id', { ascending: false })
                .limit(50);
            if (!error && Array.isArray(data)) {
                setRecentDeposits(data);
            }
        } catch (e) {
            console.error('Fetch recent deposits error:', e);
        } finally {
            setIsLoadingDeposits(false);
        }
    };

    useEffect(() => {
        fetchRecentDeposits();
    }, [supabaseClient]);

    const handleFileUpload = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        e.target.value = '';

        writeLog('SYSTEM', `เริ่มสแกนตรวจสอบไฟล์ยอดฝาก: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, 'info', activeAgentName);

        const reader = new FileReader();
        reader.onload = async function(evt) {
            try {
                const data = new Uint8Array(evt.target.result);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, dateNF: 'yyyy-mm-dd' });
                await prepareDepositPreview(jsonData, file);
            } catch (parseErr) {
                console.error('File parse error:', parseErr);
                writeLog('SYSTEM', `อ่านไฟล์ล้มเหลว: ${parseErr.message}`, 'danger', activeAgentName);
                alert(lang === 'TH' ? '⚠️ ไม่สามารถอ่านไฟล์ได้ กรุณาตรวจสอบว่าเป็นไฟล์ Excel หรือ CSV ที่ถูกต้อง' : '⚠️ Cannot read file. Please ensure it is a valid Excel or CSV file.');
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const prepareDepositPreview = async (deposits, file) => {
        if (!Array.isArray(deposits) || deposits.length === 0) {
            writeLog('SYSTEM', 'ไม่พบข้อมูลในไฟล์ หรือรูปแบบตารางไม่ถูกต้อง', 'danger', activeAgentName);
            alert(lang === 'TH' ? '⚠️ ไม่พบข้อมูลในไฟล์ หรือรูปแบบตารางไม่ถูกต้อง' : '⚠️ No data found in file or table format is invalid.');
            return;
        }

        const todayDateStr = new Date().toISOString().split('T')[0];
        const validationErrors = [];
        const parsedRows = [];

        deposits.forEach((d, idx) => {
            if (!d || typeof d !== 'object') return;
            const rowNum = idx + 2;

            const rawUser = d.username || d['Username'] || d['ยูสเซอร์'] || d['User'] || d['user'] || d['username/ยูสเซอร์'] || d['ชื่อผู้ใช้'] || '';
            const username = String(rawUser).trim();

            const rawType = String(d['ประเภท'] || d['type'] || d['Type'] || d['รายการ'] || d['ประเภทรายการ'] || d['transaction_type'] || '').trim().toLowerCase();
            if (rawType.includes('ถอน') || rawType.includes('withdraw') || rawType.includes('out') || rawType.includes('จ่าย')) {
                return; // Skip withdrawals
            }

            let rawAmt = d['ยอดฝาก'] ?? d.amount ?? d['Amount'] ?? d['ยอดเงิน'] ?? d['deposit'] ?? d['Deposit'] ?? null;
            if (rawAmt === null || rawAmt === undefined) {
                if (username) {
                    validationErrors.push({ row: rowNum, reason: `ไม่พบคอลัมน์ยอดฝากสำหรับยูสเซอร์ [${username}]` });
                }
                return;
            }

            if (typeof rawAmt === 'string') {
                rawAmt = rawAmt.replace(/,/g, '').trim();
            }
            const amount = parseFloat(rawAmt);

            if (!username && amount > 0) {
                validationErrors.push({ row: rowNum, reason: `มียอดเงิน ฿${amount.toLocaleString()} แต่ไม่มี Username` });
                return;
            }

            if (isNaN(amount) || amount <= 0) {
                validationErrors.push({ row: rowNum, reason: `ยอดเงินฝาก [${rawAmt}] ของยูสเซอร์ [${username}] ไม่ใช่ตัวเลขที่ถูกต้อง (ต้องมากกว่า 0)` });
                return;
            }

            let rawDate = d.deposit_date || d.depositDate || d['วันที่-เวลาทำรายการ'] || d['วันเวลา'] || d['วันที่'] || d['Date'] || d['date'] || '';
            let deposit_date = todayDateStr;
            let deposit_time = '';
            if (rawDate) {
                const num = parseFloat(rawDate);
                if (!isNaN(num) && num > 20000 && num < 60000) {
                    const jsDate = new Date(Math.round((num - 25569) * 86400 * 1000));
                    if (!isNaN(jsDate.getTime())) {
                        const iso = jsDate.toISOString();
                        deposit_date = iso.split('T')[0];
                        const t = iso.split('T')[1].substring(0, 8);
                        if (t && t !== '00:00:00') deposit_time = t;
                    }
                } else {
                    const dateStr = String(rawDate).trim();
                    const timeMatch = dateStr.match(/\b(\d{1,2}:\d{2}(?::\d{2})?)\b/);
                    if (timeMatch) deposit_time = timeMatch[1];
                    const parsed = new Date(dateStr);
                    if (!isNaN(parsed.getTime())) {
                        deposit_date = parsed.toISOString().split('T')[0];
                    } else {
                        deposit_date = dateStr.substring(0, 10);
                    }
                }
            }

            const extraTime = String(d['เวลา'] || d['Time'] || d['time'] || deposit_time || '').trim();
            if (extraTime && !deposit_date.includes(' ')) {
                deposit_date = `${deposit_date} ${extraTime}`;
            }

            parsedRows.push({
                username: username,
                amount: amount,
                deposit_date: deposit_date
            });
        });

        if (parsedRows.length === 0) {
            writeLog('SYSTEM', 'ไฟล์ไม่มีคอลัมน์ username หรือยอดเงินฝาก amount ที่ถูกต้อง', 'warning', activeAgentName);
            alert(lang === 'TH' 
                ? '⚠️ ไม่พบข้อมูลยูสเซอร์และยอดฝากที่ถูกต้องในไฟล์ กรุณาตรวจสอบหัวคอลัมน์ (เช่น username, ยอดฝาก, วันที่)' 
                : '⚠️ Valid username and deposit amount not found. Please check column headers (e.g. username, amount, date).');
            return;
        }

        // Deduplication check
        let duplicateCount = 0;
        let existingCounts = new Map();

        if (supabaseClient) {
            try {
                const { data: existingDeps, error: fetchErr } = await supabaseClient
                    .from('mc_deposits')
                    .select('username, amount, deposit_date')
                    .order('id', { ascending: false })
                    .limit(2000);

                if (!fetchErr && Array.isArray(existingDeps)) {
                    existingDeps.forEach(ed => {
                        if (ed && ed.username) {
                            const sig = `${String(ed.username).trim().toLowerCase()}_${parseFloat(ed.amount || 0)}_${ed.deposit_date}`;
                            existingCounts.set(sig, (existingCounts.get(sig) || 0) + 1);
                        }
                    });
                }
            } catch (dupErr) {
                console.warn('Supabase duplicate check warning:', dupErr);
            }
        }

        const newDepositsToInsert = [];
        parsedRows.forEach(d => {
            const sig = `${d.username.toLowerCase()}_${d.amount}_${d.deposit_date}`;
            const inDbCount = existingCounts.get(sig) || 0;
            if (inDbCount > 0) {
                duplicateCount++;
                existingCounts.set(sig, inDbCount - 1);
            } else {
                newDepositsToInsert.push(d);
            }
        });

        const customerMap = new Map();
        if (Array.isArray(customers)) {
            customers.forEach(c => {
                if (c && c.username) {
                    customerMap.set(String(c.username).trim().toLowerCase(), c);
                }
            });
        }

        const matchedList = [];
        const unmatchedMap = new Map();

        const rowsWithMatchStatus = newDepositsToInsert.map(d => {
            const c = customerMap.get(d.username.toLowerCase());
            if (c) {
                const rowObj = { ...d, isMatched: true, matchedAgent: c.createdBy || c.fullName || 'มีผู้ดูแล', customerId: c.id };
                matchedList.push(rowObj);
                return rowObj;
            } else {
                const existingUnmatched = unmatchedMap.get(d.username.toLowerCase()) || { username: d.username, totalAmount: 0, count: 0, deposit_date: d.deposit_date };
                existingUnmatched.totalAmount += d.amount;
                existingUnmatched.count += 1;
                unmatchedMap.set(d.username.toLowerCase(), existingUnmatched);
                return { ...d, isMatched: false, matchedAgent: null, customerId: null };
            }
        });

        const unmatchedUsersList = Array.from(unmatchedMap.values());

        setDepositPreviewData({
            fileName: file.name,
            fileSize: (file.size / 1024).toFixed(1) + ' KB',
            uploadedBy: activeAgentName || 'คุณอ้อ (หัวหน้า)',
            totalRows: parsedRows.length,
            totalAmount: parsedRows.reduce((sum, r) => sum + r.amount, 0),
            newDepositsToInsert: rowsWithMatchStatus,
            duplicateCount: duplicateCount,
            matchedRows: matchedList,
            unmatchedUsers: unmatchedUsersList,
            allRows: rowsWithMatchStatus,
            validationErrors: validationErrors
        });

        writeLog('DEPOSIT_SCAN', `อ่านไฟล์ [${file.name}] สำเร็จ: รอการยืนยันนำเข้า ${rowsWithMatchStatus.length} รายการ (ตรงกับพอร์ต ${matchedList.length} คน, ยูสเซอร์ใหม่ ${unmatchedUsersList.length} คน) โดย ${activeAgentName || 'คุณอ้อ (หัวหน้า)'}`, 'info', activeAgentName);

        if (newDepositsToInsert.length === 0) {
            alert(lang === 'TH'
                ? `⚠️ ตรวจพบข้อมูลซ้ำทั้งหมด!\n\nทุกรายการในไฟล์นี้ (${duplicateCount} รายการ) ได้รับการบันทึกในระบบไปเรียบร้อยแล้ว`
                : `⚠️ All records are duplicates!\n\nAll entries in this file (${duplicateCount} records) have already been recorded.`);
        }
    };

    const confirmDailyDepositImport = async () => {
        if (!depositPreviewData || isImportingDeposits) return;
        const { newDepositsToInsert, fileName, duplicateCount } = depositPreviewData;

        if (!Array.isArray(newDepositsToInsert) || newDepositsToInsert.length === 0) {
            alert(lang === 'TH' ? '⚠️ ไม่มีรายการยอดฝากใหม่ที่จะนำเข้า (ทุกรายการเคยบันทึกในระบบแล้ว)' : '⚠️ No new records to import.');
            return;
        }

        setIsImportingDeposits(true);
        const uploaderName = activeAgentName || 'คุณอ้อ (หัวหน้า)';
        writeLog('SYSTEM', `เริ่มบันทึกข้อมูลธุรกรรมยอดฝาก ${newDepositsToInsert.length} รายการ โดยบัญชี [${uploaderName}]...`, 'info', uploaderName);

        if (supabaseClient) {
            try {
                const CHUNK_SIZE = 100;
                for (let i = 0; i < newDepositsToInsert.length; i += CHUNK_SIZE) {
                    const chunk = newDepositsToInsert.slice(i, i + CHUNK_SIZE);
                    const payloadWithUploader = chunk.map(d => ({
                        username: d.username,
                        amount: d.amount,
                        deposit_date: d.deposit_date,
                        uploaded_by: uploaderName
                    }));

                    let { error: insertErr } = await supabaseClient.from('mc_deposits').insert(payloadWithUploader);
                    if (insertErr && (insertErr.code === '42703' || (insertErr.message && insertErr.message.includes('uploaded_by')))) {
                        const payloadClean = chunk.map(d => ({
                            username: d.username,
                            amount: d.amount,
                            deposit_date: d.deposit_date
                        }));
                        const res = await supabaseClient.from('mc_deposits').insert(payloadClean);
                        insertErr = res.error;
                    }
                    if (insertErr) throw insertErr;
                }
                writeLog('SUPABASE', `บันทึกรายการฝากใหม่เข้า mc_deposits เรียบร้อย (${newDepositsToInsert.length} รายการ)`, 'success', uploaderName);
            } catch (sbErr) {
                console.error('Supabase mc_deposits insert error:', sbErr);
                writeLog('SUPABASE', `บันทึก mc_deposits ไม่สำเร็จ: ${sbErr.message || JSON.stringify(sbErr)}`, 'danger', uploaderName);
            }
        }

        // Update uploader map
        const updatedUploaderMap = { ...(depositUploaderMap || {}) };
        newDepositsToInsert.forEach(d => {
            const sig = `${String(d.username).toLowerCase()}_${parseFloat(d.amount || 0)}_${d.deposit_date}`;
            updatedUploaderMap[sig] = uploaderName;
        });
        setDepositUploaderMap(updatedUploaderMap);
        try {
            localStorage.setItem('mc_deposit_uploaders', JSON.stringify(updatedUploaderMap));
        } catch (e) {}

        // Match with portfolio customers and update
        let matchCount = 0;
        if (customers && customers.length > 0) {
            const depositBatchMap = new Map();
            newDepositsToInsert.forEach(d => {
                const u = d.username.toLowerCase();
                depositBatchMap.set(u, (depositBatchMap.get(u) || 0) + d.amount);
            });

            const updated = customers.map(cust => {
                if (!cust || !cust.username) return cust;
                const custUser = String(cust.username).trim().toLowerCase();
                if (depositBatchMap.has(custUser)) {
                    matchCount++;
                    const depositAmount = depositBatchMap.get(custUser);
                    const oldTotal = cust.totalDeposit || 0;
                    const newTotal = oldTotal + depositAmount;

                    writeLog('MATCH_ENGINE', `ตรวจพบการฝากเงินใหม่: [${cust.username}] ฝากยอดใหม่ ฿${depositAmount.toLocaleString()} | ผู้ดูแล: ${cust.createdBy}`, 'success', uploaderName);

                    const firstDepAmount = (cust.hasDeposited && cust.returnedDepositAmount > 0)
                        ? cust.returnedDepositAmount
                        : depositAmount;

                    return {
                        ...cust,
                        hasDeposited: true,
                        returnedDepositAmount: firstDepAmount,
                        totalDeposit: newTotal
                    };
                }
                return cust;
            });

            setCustomers(updated);
            try { localStorage.setItem('mc_customers', JSON.stringify(updated)); } catch (e) {}

            if (supabaseClient) {
                for (const c of updated) {
                    if (!c || !c.username) continue;
                    const cUser = String(c.username).trim().toLowerCase();
                    if (depositBatchMap.has(cUser)) {
                        pushCustomerToCloud(supabaseClient, c).catch(e => console.error(e));
                    }
                }
            }
        }

        if (supabaseClient) {
            fetchRecentDeposits();
        }

        setUploadedDepositFileName(fileName);
        writeLog('DEPOSIT_UPLOAD', `นำเข้าไฟล์ยอดฝาก [${fileName}] (${newDepositsToInsert.length} รายการ) สำเร็จ โดย ${uploaderName}`, 'success', uploaderName);

        const summaryMsg = lang === 'TH' 
            ? `✅ ยืนยันการนำเข้าข้อมูลธุรกรรมยอดฝากสำเร็จเรียบร้อย!\n\n• บันทึกรายการใหม่: ${newDepositsToInsert.length} รายการ\n• ข้ามรายการซ้ำ: ${duplicateCount} รายการ\n• จับคู่ลูกค้าในพอร์ตสำเร็จ: ${matchCount} คน\n• บัญชีผู้นำเข้า: ${uploaderName}\n• ไฟล์: ${fileName}`
            : `✅ Deposit import confirmed!\n\n• Inserted: ${newDepositsToInsert.length} records\n• Skipped duplicates: ${duplicateCount}\n• Matched: ${matchCount} leads\n• Uploaded By: ${uploaderName}\n• File: ${fileName}`;

        alert(summaryMsg);
        setDepositPreviewData(null);
        setIsImportingDeposits(false);
    };

    const downloadDepositTemplate = (format) => {
        const today = new Date().toISOString().split('T')[0];
        const sampleRows = [
            {
                'username': 'somchai88',
                'amount': 1500,
                'deposit_date': today,
                'type': 'ฝากเงิน (Deposit)',
                'note': 'ตัวอย่างยอดฝากแรก'
            },
            {
                'username': 'jaidee99',
                'amount': 3500,
                'deposit_date': today,
                'type': 'ฝากเงิน (Deposit)',
                'note': 'ตัวอย่างฝากผ่าน QR Code'
            }
        ];

        if (format === 'csv') {
            const headers = ['username', 'amount', 'deposit_date', 'type', 'note'];
            const csvRows = [
                headers.join(','),
                ...sampleRows.map(row => [
                    `"${row.username}"`,
                    row.amount,
                    `"${row.deposit_date}"`,
                    `"${row.type}"`,
                    `"${row.note}"`
                ].join(','))
            ];
            const csvContent = '\uFEFF' + csvRows.join('\r\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `deposit_template_standard_${today}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } else {
            const ws = XLSX.utils.json_to_sheet(sampleRows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'DepositTemplate');
            XLSX.writeFile(wb, `deposit_template_standard_${today}.xlsx`);
        }
    };

    const handleQuickAddSingleCustomer = async (username, amount, depositDate) => {
        const createdByAgent = activeAgentName || 'คุณอ้อ (หัวหน้า)';
        const cleanUser = String(username || '').trim();
        if (!cleanUser) return;

        if (!window.confirm(lang === 'TH' 
            ? `ต้องการเพิ่มยูสเซอร์ [${cleanUser}] เป็นลูกค้าใหม่ในพอร์ตของคุณ [${createdByAgent}] ทันทีหรือไม่?` 
            : `Add [${cleanUser}] as a new customer in your portfolio [${createdByAgent}]?`)) {
            return;
        }

        const newCust = {
            id: 'CUST_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            createdAt: new Date().toISOString(),
            username: cleanUser,
            fullName: cleanUser,
            phone: '-',
            lineOA: '-',
            lineLek: 'รอแอด',
            sourceChannel: 'ยอดฝากนำเข้า (Deposit Import)',
            totalDeposit: parseFloat(amount) || 0,
            createdBy: createdByAgent,
            campaignMonth: selectedMonth || currentMonthStr,
            followUp: {},
            notes: `สร้างจากประวัติรายการฝากเงินวันที่ ${depositDate || new Date().toISOString().split('T')[0]}`,
            hasDeposited: true,
            returnedDepositAmount: parseFloat(amount) || 0,
            referrer: ''
        };

        const updated = [...customers, newCust];
        setCustomers(updated);
        try { localStorage.setItem('mc_customers', JSON.stringify(updated)); } catch (e) {}

        if (supabaseClient) {
            pushCustomerToCloud(supabaseClient, newCust).catch(e => console.error(e));
        }
        writeLog('CUSTOMER_ADD', `เพิ่มลูกค้ายูสเซอร์ใหม่ [${cleanUser}] เข้าพอร์ตของ ${createdByAgent}`, 'success', createdByAgent);
        alert(lang === 'TH' ? `✅ เพิ่มลูกค้า [${cleanUser}] เข้าพอร์ตของคุณ [${createdByAgent}] เรียบร้อยแล้ว!` : `Customer [${cleanUser}] added!`);
    };

    const quickAddUnmatchedUsersToPortfolio = async (unmatchedList) => {
        if (!Array.isArray(unmatchedList) || unmatchedList.length === 0) return;
        const createdByAgent = activeAgentName || 'คุณอ้อ (หัวหน้า)';

        if (!window.confirm(lang === 'TH' 
            ? `ยืนยันการเพิ่มยูสเซอร์ใหม่ทั้งหมด ${unmatchedList.length} คน เข้าพอร์ตลูกค้าของคุณ [${createdByAgent}] ทันที?` 
            : `Confirm adding all ${unmatchedList.length} new users into portfolio [${createdByAgent}]?`)) {
            return;
        }

        const newCusts = unmatchedList.map((u, idx) => ({
            id: 'CUST_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7) + '_' + idx,
            createdAt: new Date().toISOString(),
            username: u.username,
            fullName: u.username,
            phone: '-',
            lineOA: '-',
            lineLek: 'รอแอด',
            sourceChannel: 'ยอดฝากนำเข้า (Deposit Import)',
            totalDeposit: u.totalAmount || 0,
            createdBy: createdByAgent,
            campaignMonth: selectedMonth || currentMonthStr,
            followUp: {},
            notes: `สร้างอัตโนมัติจากการนำเข้าไฟล์ ${depositPreviewData ? depositPreviewData.fileName : 'ยอดฝาก'}`,
            hasDeposited: true,
            returnedDepositAmount: u.totalAmount || 0,
            referrer: ''
        }));

        const updated = [...customers, ...newCusts];
        setCustomers(updated);
        try { localStorage.setItem('mc_customers', JSON.stringify(updated)); } catch (e) {}

        if (supabaseClient) {
            for (const nc of newCusts) {
                pushCustomerToCloud(supabaseClient, nc).catch(e => console.error(e));
            }
        }

        setDepositPreviewData(prev => {
            if (!prev) return null;
            const updatedAll = prev.allRows.map(r => {
                const found = newCusts.find(nc => nc.username.toLowerCase() === r.username.toLowerCase());
                if (found) {
                    return { ...r, isMatched: true, matchedAgent: createdByAgent };
                }
                return r;
            });
            return {
                ...prev,
                unmatchedUsers: [],
                allRows: updatedAll
            };
        });

        writeLog('CUSTOMER_ADD', `เพิ่มลูกค้ายูสเซอร์ใหม่จากไฟล์ยอดฝาก ${newCusts.length} คน เข้าพอร์ตของ ${createdByAgent}`, 'success', createdByAgent);
        alert(lang === 'TH' ? `✅ เพิ่มลูกค้าใหม่ ${newCusts.length} คน เข้าพอร์ตของคุณ [${createdByAgent}] เรียบร้อยแล้ว!` : `Added ${newCusts.length} new customers to portfolio!`);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header Banner */}
            <div className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ padding: '12px', borderRadius: '14px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                        <UploadCloud size={28} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: theme === 'light' ? '#0f172a' : '#fff' }}>
                            {lang === 'TH' ? 'ศูนย์อัปโหลดไฟล์ประวัติฝากรายวัน (Daily Deposit Transaction Processing)' : 'Daily Deposit Transaction Processing Center'}
                        </h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                            {lang === 'TH' 
                                ? `อัปโหลดไฟล์ธุรกรรมฝากเงิน Excel (.xlsx / .xls) หรือ CSV ตรวจสอบพรีวิว ยืนยันนำเข้า และผูกยอดสะสมอัตโนมัติประจำรอบ ${selectedMonth}` 
                                : `Upload Excel (.xlsx / .xls) or CSV deposit files with preview, confirmation, and auto-matching for ${selectedMonth}`}
                        </p>
                    </div>
                </div>

                {/* Uploader Account Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 16px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.12)', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px' }}>
                        {(activeAgentName || 'A').charAt(0)}
                    </div>
                    <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {lang === 'TH' ? 'บัญชีผู้นำเข้าไฟล์' : 'Upload Account'}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#c084fc' }}>
                            {activeAgentName || 'คุณอ้อ (หัวหน้า)'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Drag & Drop Upload Card */}
            <div className="panel" style={{ padding: '36px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '18px' }}>
                <div 
                    id="tour-upload-box"
                    className="upload-box" 
                    onClick={() => document.getElementById('deposit-page-input-file').click()}
                    style={{ maxWidth: '640px', width: '100%', padding: '36px 24px', border: '2px dashed rgba(168, 85, 247, 0.4)', borderRadius: '18px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', background: 'rgba(168, 85, 247, 0.02)', transition: 'all 0.2s ease' }}
                >
                    <div style={{ padding: '16px', borderRadius: '18px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                        <FileCheck2 size={40} />
                    </div>
                    <div>
                        <h4 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: theme === 'light' ? '#0f172a' : '#fff' }}>
                            {lang === 'TH' ? 'คลิกเลือกไฟล์ หรือลากไฟล์ยอดฝากเงินรายวันมาวางที่นี่' : 'Click to select or drag & drop daily deposit file here'}
                        </h4>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', marginBottom: 0 }}>
                            {uploadedDepositFileName ? (
                                <span style={{ color: '#34d399', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                    <CheckCircle2 size={15} />
                                    {lang === 'TH' ? `ประมวลผลสำเร็จล่าสุด: ${uploadedDepositFileName}` : `Latest processed: ${uploadedDepositFileName}`}
                                </span>
                            ) : (
                                lang === 'TH' 
                                    ? 'รองรับไฟล์ Excel (.xlsx / .xls) และ CSV พร้อมระบบพรีวิวตรวจสอบก่อนบันทึกจริง' 
                                    : 'Supports Excel (.xlsx, .xls) and CSV. Previews and validates before saving.'
                            )}
                        </p>
                    </div>
                    <input 
                        type="file" 
                        id="deposit-page-input-file" 
                        style={{ display: 'none' }} 
                        accept=".xlsx, .xls, .csv" 
                        onChange={handleFileUpload} 
                    />
                </div>

                {/* Standard Template Download Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', width: '100%', maxWidth: '640px', marginTop: '2px' }}>
                    <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={() => downloadDepositTemplate('csv')}
                        style={{ padding: '8px 16px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                        <Download size={14} style={{ color: '#38bdf8' }} />
                        <span>{lang === 'TH' ? '📥 ดาวน์โหลดเทมเพลตมาตรฐาน (.csv)' : '📥 Download Template (.csv)'}</span>
                    </button>
                    <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={() => downloadDepositTemplate('xlsx')}
                        style={{ padding: '8px 16px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                        <FileSpreadsheet size={14} style={{ color: '#34d399' }} />
                        <span>{lang === 'TH' ? '📥 ดาวน์โหลดเทมเพลตมาตรฐาน (.xlsx)' : '📥 Download Template (.xlsx)'}</span>
                    </button>
                </div>

                {/* Guidance Information */}
                <div style={{ maxWidth: '640px', width: '100%', marginTop: '6px', padding: '16px 20px', borderRadius: '14px', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'left', fontSize: '12px' }}>
                    <div style={{ fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Info size={15} style={{ color: '#c084fc' }} />
                        <span>{lang === 'TH' ? 'รูปแบบไฟล์ที่แนะนำสำหรับการประมวลผลอัตโนมัติ:' : 'Recommended column formats for auto-matching:'}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontFamily: 'monospace', background: 'rgba(255,255,255,0.06)', color: '#cbd5e1' }}>{lang === 'TH' ? 'คอลัมน์: username / ยูสเซอร์ (จำเป็น)' : 'Column: username (required)'}</span>
                        <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontFamily: 'monospace', background: 'rgba(255,255,255,0.06)', color: '#cbd5e1' }}>{lang === 'TH' ? 'คอลัมน์: amount / ยอดฝาก (จำเป็น)' : 'Column: amount (required)'}</span>
                        <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontFamily: 'monospace', background: 'rgba(255,255,255,0.06)', color: '#cbd5e1' }}>{lang === 'TH' ? 'คอลัมน์: date / วันที่ (จำเป็น)' : 'Column: date (required)'}</span>
                    </div>
                </div>
            </div>

            {/* Preview Panel when file is chosen */}
            {depositPreviewData && (
                <div className="panel" style={{ border: '2px solid rgba(168, 85, 247, 0.5)', background: 'rgba(15, 23, 42, 0.85)', boxShadow: '0 10px 40px rgba(168, 85, 247, 0.15)', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                                <FileSpreadsheet size={24} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#fff' }}>
                                    {lang === 'TH' ? '📋 ยืนยันการนำเข้าข้อมูลยอดฝาก (Deposit Import Confirmation)' : '📋 Deposit Import Confirmation'}
                                </h3>
                                <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                                    {lang === 'TH' ? `ไฟล์: ${depositPreviewData.fileName} (${depositPreviewData.fileSize}) | บัญชีผู้นำเข้า: ` : `File: ${depositPreviewData.fileName} (${depositPreviewData.fileSize}) | Uploader: `}
                                    <strong style={{ color: '#c084fc' }}>{depositPreviewData.uploadedBy}</strong>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Stat Cards Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                        <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{lang === 'TH' ? 'รายการทั้งหมดในไฟล์' : 'Total Records'}</div>
                            <div style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
                                {depositPreviewData.totalRows.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-muted)' }}>{lang === 'TH' ? 'รายการ' : 'records'}</span>
                            </div>
                        </div>

                        <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                            <div style={{ fontSize: '11px', color: '#34d399' }}>{lang === 'TH' ? 'ยอดเงินฝากรวม' : 'Total Deposit'}</div>
                            <div style={{ fontSize: '20px', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>
                                ฿{depositPreviewData.totalAmount.toLocaleString()}
                            </div>
                        </div>

                        <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
                            <div style={{ fontSize: '11px', color: '#38bdf8' }}>{lang === 'TH' ? 'ตรงกับลูกค้าในพอร์ต' : 'Matched Portfolio Leads'}</div>
                            <div style={{ fontSize: '20px', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
                                {depositPreviewData.matchedRows.length.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-muted)' }}>{lang === 'TH' ? 'คน' : 'leads'}</span>
                            </div>
                        </div>

                        <div style={{ padding: '14px', borderRadius: '12px', background: depositPreviewData.unmatchedUsers.length > 0 ? 'rgba(234, 179, 8, 0.1)' : 'rgba(255,255,255,0.03)', border: depositPreviewData.unmatchedUsers.length > 0 ? '1px solid rgba(234, 179, 8, 0.3)' : '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ fontSize: '11px', color: depositPreviewData.unmatchedUsers.length > 0 ? '#facc15' : 'var(--text-muted)' }}>{lang === 'TH' ? 'ยูสเซอร์ใหม่ (ไม่มีในพอร์ต)' : 'Unmatched / New Users'}</div>
                            <div style={{ fontSize: '20px', fontWeight: 800, color: depositPreviewData.unmatchedUsers.length > 0 ? '#facc15' : '#fff', marginTop: '4px' }}>
                                {depositPreviewData.unmatchedUsers.length.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-muted)' }}>{lang === 'TH' ? 'คน' : 'leads'}</span>
                            </div>
                        </div>

                        <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                            <div style={{ fontSize: '11px', color: '#fb7185' }}>{lang === 'TH' ? 'ข้ามรายการซ้ำในระบบ' : 'Duplicates Skipped'}</div>
                            <div style={{ fontSize: '20px', fontWeight: 800, color: '#fb7185', marginTop: '4px' }}>
                                {depositPreviewData.duplicateCount.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-muted)' }}>{lang === 'TH' ? 'รายการ' : 'duplicates'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Unmatched Users Quick Add Banner */}
                    {depositPreviewData.unmatchedUsers && depositPreviewData.unmatchedUsers.length > 0 && (
                        <div style={{
                            padding: '16px 20px',
                            borderRadius: '14px',
                            background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(249, 115, 22, 0.12) 100%)',
                            border: '1px solid rgba(234, 179, 8, 0.4)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '14px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 300px' }}>
                                <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(234, 179, 8, 0.2)', color: '#facc15' }}>
                                    <UserPlus size={22} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 800, color: '#facc15', fontSize: '14px' }}>
                                        {lang === 'TH' 
                                            ? `🔔 ตรวจพบยูสเซอร์ใหม่ ${depositPreviewData.unmatchedUsers.length} คน ที่ยังไม่มีในพอร์ตตาม` 
                                            : `🔔 Found ${depositPreviewData.unmatchedUsers.length} new users not currently in follow-up portfolio`}
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                        {lang === 'TH'
                                            ? `คุณต้องการเพิ่มยูสเซอร์ใหม่เหล่านี้เป็นลูกค้าในพอร์ตของคุณ [${depositPreviewData.uploadedBy}] ทันทีหรือไม่?`
                                            : `Would you like to add these new users into your customer portfolio [${depositPreviewData.uploadedBy}] right now?`}
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => quickAddUnmatchedUsersToPortfolio(depositPreviewData.unmatchedUsers)}
                                style={{ padding: '10px 20px', fontSize: '13px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)', border: 'none', color: '#000' }}
                            >
                                <UserCheck size={16} />
                                <span>{lang === 'TH' ? `➕ เพิ่มยูสเซอร์ใหม่ทั้งหมดเข้าพอร์ตทันที (${depositPreviewData.unmatchedUsers.length} คน)` : `➕ Quick-Add All to Portfolio (${depositPreviewData.unmatchedUsers.length})`}</span>
                            </button>
                        </div>
                    )}

                    {/* Preview Table */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{lang === 'TH' ? 'ตัวอย่างรายการที่เตรียมนำเข้า:' : 'Preview of records to import:'}</span>
                            <span>{lang === 'TH' ? `แสดง ${Math.min(depositPreviewData.allRows.length, 15)} จาก ${depositPreviewData.allRows.length} รายการ` : `Showing ${Math.min(depositPreviewData.allRows.length, 15)} of ${depositPreviewData.allRows.length}`}</span>
                        </div>
                        <div className="table-wrapper" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th style={{ width: '40px' }}>#</th>
                                        <th>{lang === 'TH' ? 'วันที่ทำรายการ' : 'Date'}</th>
                                        <th>{lang === 'TH' ? 'ยูสเซอร์ (Username)' : 'Username'}</th>
                                        <th style={{ textAlign: 'right' }}>{lang === 'TH' ? 'ยอดเงินฝาก' : 'Deposit'}</th>
                                        <th>{lang === 'TH' ? 'สถานะการจับคู่' : 'Match Status'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {depositPreviewData.allRows.slice(0, 15).map((row, idx) => (
                                        <tr key={idx}>
                                            <td style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                                            <td style={{ fontSize: '12px' }}>📅 {row.deposit_date}</td>
                                            <td>
                                                <strong style={{ fontFamily: 'monospace', color: '#38bdf8', fontSize: '13px' }}>
                                                    👤 {row.username}
                                                </strong>
                                            </td>
                                            <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#34d399', fontSize: '13px' }}>
                                                ฿{Number(row.amount || 0).toLocaleString()}
                                            </td>
                                            <td>
                                                {row.isMatched ? (
                                                    <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '3px 8px', borderRadius: '10px', fontSize: '11px' }}>
                                                        {lang === 'TH' ? `✅ ตรงกับพอร์ต (${row.matchedAgent || 'มีผู้ดูแล'})` : `✅ Matched (${row.matchedAgent || 'Assigned'})`}
                                                    </span>
                                                ) : (
                                                    <span className="badge" style={{ background: 'rgba(234, 179, 8, 0.12)', color: '#facc15', border: '1px solid rgba(234, 179, 8, 0.3)', padding: '3px 8px', borderRadius: '10px', fontSize: '11px' }}>
                                                        {lang === 'TH' ? '⚪ ยูสเซอร์ใหม่ (ไม่มีในพอร์ต)' : '⚪ New / Unmatched User'}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px' }}>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setDepositPreviewData(null)}
                            disabled={isImportingDeposits}
                            style={{ padding: '8px 18px', fontSize: '12px' }}
                        >
                            {lang === 'TH' ? '❌ ยกเลิก' : '❌ Cancel'}
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={confirmDailyDepositImport}
                            disabled={isImportingDeposits || (depositPreviewData.newDepositsToInsert && depositPreviewData.newDepositsToInsert.length === 0)}
                            style={{ padding: '10px 24px', fontSize: '13px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                        >
                            {isImportingDeposits ? (
                                <>
                                    <RefreshCw size={16} className="spin" />
                                    <span>{lang === 'TH' ? 'กำลังนำเข้าข้อมูล...' : 'Importing...'}</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle size={16} />
                                    <span>{lang === 'TH' ? `✅ ยืนยันการนำเข้าข้อมูล (${depositPreviewData.newDepositsToInsert.length} รายการ)` : `✅ Confirm Import (${depositPreviewData.newDepositsToInsert.length} records)`}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Section 2: Recent Deposit Transactions History Table */}
            <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                            <History size={20} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                                {lang === 'TH' ? '🕒 ประวัติรายการฝากเงินล่าสุด (Recent Deposit History)' : '🕒 Recent Deposit History'}
                            </h3>
                            <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                                {lang === 'TH' ? 'แสดง 50 รายการฝากล่าสุดที่บันทึกขึ้นระบบ Supabase (mc_deposits)' : 'Showing latest 50 deposit records from Supabase (mc_deposits)'}
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <input 
                            type="text" 
                            placeholder={lang === 'TH' ? '🔍 ค้นหายูสเซอร์ลูกค้า...' : '🔍 Search username...'}
                            value={depositSearchQuery}
                            onChange={(e) => setDepositSearchQuery(e.target.value)}
                            className="select-input"
                            style={{ width: '200px', padding: '6px 12px', fontSize: '12px' }}
                        />
                        <button 
                            className="btn btn-secondary"
                            onClick={fetchRecentDeposits}
                            disabled={isLoadingDeposits}
                            style={{ padding: '6px 14px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                            <RefreshCw size={13} className={isLoadingDeposits ? 'spin' : ''} />
                            <span>{isLoadingDeposits ? (lang === 'TH' ? 'กำลังโหลด...' : 'Loading...') : (lang === 'TH' ? 'รีเฟรช' : 'Refresh')}</span>
                        </button>
                    </div>
                </div>

                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th style={{ width: '60px' }}># ID</th>
                                <th>{lang === 'TH' ? 'วันที่ทำรายการ' : 'Date'}</th>
                                <th>{lang === 'TH' ? 'ยูสเซอร์ลูกค้า (Username)' : 'Username'}</th>
                                <th style={{ textAlign: 'right' }}>{lang === 'TH' ? 'ยอดเงินฝาก' : 'Deposit'}</th>
                                <th>{lang === 'TH' ? 'สถานะการจับคู่' : 'Matching Status'}</th>
                                <th>{lang === 'TH' ? 'ผู้นำเข้าไฟล์ (Uploaded By)' : 'Uploaded By'}</th>
                                <th>{lang === 'TH' ? 'เวลาบันทึกลงระบบ' : 'Recorded At'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                const q = (depositSearchQuery || '').toLowerCase().trim();
                                const list = recentDeposits.filter(d => {
                                    if (!q) return true;
                                    return (d.username || '').toLowerCase().includes(q);
                                });

                                if (list.length === 0) {
                                    return (
                                        <tr>
                                            <td colSpan="7" style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                    <Inbox size={32} style={{ opacity: 0.5 }} />
                                                    <span>{q ? (lang === 'TH' ? 'ไม่พบรายการฝากที่ตรงกับคำค้นหา' : 'No records match search') : (lang === 'TH' ? 'ยังไม่มีประวัติรายการฝากเงินในระบบ' : 'No deposit records')}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }

                                return list.map((dep, idx) => {
                                    const depUser = (dep.username || '').trim().toLowerCase();
                                    const matchedCust = customers.find(c => c && c.username && c.username.trim().toLowerCase() === depUser);
                                    const createdTime = dep.created_at ? new Date(dep.created_at).toLocaleString('th-TH') : '-';
                                    const depDate = dep.deposit_date || (dep.created_at ? dep.created_at.substring(0, 10) : '-');
                                    const sig = `${depUser}_${parseFloat(dep.amount || 0)}_${dep.deposit_date}`;
                                    const uploaderName = dep.uploaded_by || depositUploaderMap[dep.id] || depositUploaderMap[sig] || 'คุณอ้อ (หัวหน้า)';

                                    return (
                                        <tr key={dep.id || idx}>
                                            <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '11px' }}>
                                                #{dep.id || (idx + 1)}
                                            </td>
                                            <td>
                                                <span style={{ fontWeight: 600, fontSize: '12px', color: theme === 'light' ? '#0f172a' : '#e2e8f0' }}>
                                                    📅 {depDate}
                                                </span>
                                            </td>
                                            <td>
                                                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8', fontSize: '13px' }}>
                                                    👤 {dep.username || '-'}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <strong style={{ color: '#34d399', fontSize: '14px', fontFamily: 'monospace' }}>
                                                    ฿{Number(dep.amount || 0).toLocaleString()}
                                                </strong>
                                            </td>
                                            <td>
                                                {matchedCust ? (
                                                    <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                                        <span>{lang === 'TH' ? '✅ ตามสำเร็จ:' : '✅ Converted:'}</span>
                                                        <strong>{matchedCust.createdBy || (lang === 'TH' ? 'มีผู้ดูแล' : 'Assigned')}</strong>
                                                    </span>
                                                ) : (
                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                        <span className="badge" style={{ background: 'rgba(148, 163, 184, 0.1)', color: 'var(--text-muted)', border: theme === 'light' ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.08)', padding: '4px 8px', borderRadius: '12px', fontSize: '11px' }}>
                                                            {lang === 'TH' ? '⚪ ลูกค้าทั่วไป' : '⚪ General User'}
                                                        </span>
                                                        <button 
                                                            type="button"
                                                            className="btn btn-secondary"
                                                            onClick={() => handleQuickAddSingleCustomer(dep.username, dep.amount, dep.deposit_date)}
                                                            style={{ padding: '3px 8px', fontSize: '11px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid rgba(168, 85, 247, 0.4)', color: '#c084fc', background: 'rgba(168, 85, 247, 0.1)' }}
                                                        >
                                                            <UserPlus size={12} />
                                                            <span>{lang === 'TH' ? '➕ เพิ่มเข้าพอร์ต' : '➕ Add'}</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                                                    <span style={{ 
                                                        width: '22px', 
                                                        height: '22px', 
                                                        borderRadius: '50%', 
                                                        background: 'rgba(168, 85, 247, 0.2)', 
                                                        color: '#c084fc', 
                                                        display: 'inline-flex', 
                                                        alignItems: 'center', 
                                                        justifyContent: 'center', 
                                                        fontSize: '11px',
                                                        fontWeight: 700 
                                                    }}>
                                                        {(uploaderName || 'A').charAt(0)}
                                                    </span>
                                                    <span style={{ fontWeight: 600, color: theme === 'light' ? '#334155' : '#cbd5e1' }}>
                                                        {uploaderName}
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                {createdTime}
                                            </td>
                                        </tr>
                                    );
                                });
                            })()}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UploadDepositsView;

import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { useApp } from '../../context/AppContext';
import { getTodayLocalDateStr, formatKeyedDateTime } from '../../utils/dateFormatters';
import { formatChannelDisplayName } from '../../utils/customerFormatters';
import { pushCustomerToCloud } from '../../services/supabase';
import { 
  UserPlus, 
  UserCheck, 
  Calendar, 
  Search, 
  History, 
  Lock, 
  AlertCircle, 
  CheckCircle2, 
  User,
  FileSpreadsheet,
  UploadCloud,
  Download,
  AlertTriangle,
  XCircle,
  Users,
  RefreshCw,
  FileCheck2,
  Trash2,
  Filter,
  Info,
  CheckCircle,
  ArrowRight,
  ShieldCheck,
  X
} from 'lucide-react';

export default function NewCustomerView() {
  const {
    customers,
    setCustomers,
    agents,
    activeAgent,
    activeAgentName,
    isSupervisor,
    sourceChannels,
    selectedMonth,
    lang,
    theme,
    supabaseClient,
    writeLog,
    setAddConfirmModalData,
    addSuccessModalData
  } = useApp();

  // Form states
  const [newCustAssignedAgent, setNewCustAssignedAgent] = useState(activeAgentName || '');
  const [inputRegistrationDate, setInputRegistrationDate] = useState(getTodayLocalDateStr());
  const [formFullName, setFormFullName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formLineOA, setFormLineOA] = useState('');
  const [formLineLek, setFormLineLek] = useState('รอแอด');
  const [formSource, setFormSource] = useState('facebook');
  const [formReferrer, setFormReferrer] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Reset form fields
  const resetForm = () => {
    setFormFullName('');
    setFormUsername('');
    setFormPhone('');
    setFormLineOA('');
    setFormLineLek('รอแอด');
    setFormSource('facebook');
    setFormReferrer('');
    setFormNotes('');
  };

  // Auto-reset form fields as soon as customer is saved / confirmed
  React.useEffect(() => {
    if (addSuccessModalData) {
      resetForm();
    }
  }, [addSuccessModalData]);

  // History table filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [lineLekFilter, setLineLekFilter] = useState('ALL');

  const nonDeletedCustomers = useMemo(() => {
    return customers.filter(c => !c.deletedAt);
  }, [customers]);

  // Mode Switch: 'single' (กรอกทีละคน) | 'bulk' (นำเข้าไฟล์ Excel/CSV เฉพาะ Supervisor)
  const [activeTab, setActiveTab] = useState('single');

  // Enforce Supervisor-only permission for Bulk Import (Double Check)
  const hasSupervisorAccess = Boolean(isSupervisor || activeAgent?.role === 'SUPERVISOR');

  React.useEffect(() => {
    if (!hasSupervisorAccess && activeTab === 'bulk') {
      setActiveTab('single');
    }
  }, [hasSupervisorAccess, activeTab]);

  // Bulk Lead Import States
  const [bulkFileName, setBulkFileName] = useState('');
  const [bulkFileSize, setBulkFileSize] = useState('');
  const [bulkPreviewRows, setBulkPreviewRows] = useState(null);
  const [bulkRegistrationDate, setBulkRegistrationDate] = useState(getTodayLocalDateStr());
  const [bulkAssignMode, setBulkAssignMode] = useState('single'); // 'single' | 'round_robin'
  const [bulkTargetAgent, setBulkTargetAgent] = useState(activeAgentName || '');
  const [selectedRoundRobinAgents, setSelectedRoundRobinAgents] = useState([]);
  const [bulkFilter, setBulkFilter] = useState('ALL'); // 'ALL' | 'VALID' | 'ISSUES'
  const [skipIssues, setSkipIssues] = useState(true);
  const [isImportingBulk, setIsImportingBulk] = useState(false);
  const [bulkImportSuccess, setBulkImportSuccess] = useState(null);
  const [duplicateModalData, setDuplicateModalData] = useState(null);
  const bulkFileInputRef = useRef(null);

  // Download Sample Lead Template
  const downloadLeadTemplate = (format = 'xlsx') => {
    const today = getTodayLocalDateStr();
    const sampleRows = [
      {
        'ชื่อ-นามสกุล': 'คุณกิตติศักดิ์ รัตนวิบูลย์',
        'ยูสเซอร์เนม': 'mc99011',
        'เบอร์โทรศัพท์': '0812345601',
        'LINE OA': '@kitti_line',
        'สถานะไลน์เล็ก': 'รอแอด',
        'ช่องทางสมัคร': 'facebook',
        'หมายเหตุ': 'ทักจากเพจการตลาด สนใจโปรฝากแรก'
      },
      {
        'ชื่อ-นามสกุล': 'คุณนภัสสร อัครเดช',
        'ยูสเซอร์เนม': 'mc99012',
        'เบอร์โทรศัพท์': '0823456702',
        'LINE OA': 'napas_line',
        'สถานะไลน์เล็ก': 'มี',
        'ช่องทางสมัคร': 'line',
        'หมายเหตุ': 'แอดไลน์เล็กแล้ว แจ้งรอฝากเย็นนี้'
      },
      {
        'ชื่อ-นามสกุล': 'คุณธีรเทพ สุวรรณมาศ',
        'ยูสเซอร์เนม': 'mc99013',
        'เบอร์โทรศัพท์': '0834567803',
        'LINE OA': '@theeratep_99',
        'สถานะไลน์เล็ก': 'รอแอด',
        'ช่องทางสมัคร': 'tiktok',
        'หมายเหตุ': 'ทักจากคลิป TikTok สมัครเปิดยูสแล้ว'
      },
      {
        'ชื่อ-นามสกุล': 'คุณปิยะดา เกียรติสกุล',
        'ยูสเซอร์เนม': '',
        'เบอร์โทรศัพท์': '0845678904',
        'LINE OA': 'piyada_k',
        'สถานะไลน์เล็ก': 'รอแอด',
        'ช่องทางสมัคร': 'facebook',
        'หมายเหตุ': 'ทักสอบถามโปร ยังไม่ได้เปิดยูส'
      },
      {
        'ชื่อ-นามสกุล': 'คุณวรพล ธนาพิพัฒน์',
        'ยูสเซอร์เนม': 'mc99015',
        'เบอร์โทรศัพท์': '0856789005',
        'LINE OA': '-',
        'สถานะไลน์เล็ก': 'ไม่มี',
        'ช่องทางสมัคร': 'ค้นหาหน้า Google',
        'หมายเหตุ': 'สมัครผ่านหน้าเว็บ ไม่มีไลน์'
      },
      {
        'ชื่อ-นามสกุล': 'คุณศิรินทิพย์ ภักดีชน',
        'ยูสเซอร์เนม': 'mc99016',
        'เบอร์โทรศัพท์': '0867890106',
        'LINE OA': '@sirin_vip',
        'สถานะไลน์เล็ก': 'มี',
        'ช่องทางสมัคร': 'facebook',
        'หมายเหตุ': 'ลูกค้าแอดมินแนะนำมา ดึงเข้ากลุ่มแล้ว'
      },
      {
        'ชื่อ-นามสกุล': 'คุณอภิสิทธิ์ วงศ์สวัสดิ์',
        'ยูสเซอร์เนม': 'mc99017',
        'เบอร์โทรศัพท์': '0878901207',
        'LINE OA': 'apisit_w',
        'สถานะไลน์เล็ก': 'รอแอด',
        'ช่องทางสมัคร': 'tiktok',
        'หมายเหตุ': 'สมัครเรียบร้อย แนะนำวิธีฝากแล้ว'
      },
      {
        'ชื่อ-นามสกุล': 'คุณพิมลวรรณ สุขสมบัติ',
        'ยูสเซอร์เนม': '',
        'เบอร์โทรศัพท์': '0889012308',
        'LINE OA': '-',
        'สถานะไลน์เล็ก': 'รอแอด',
        'ช่องทางสมัคร': 'line',
        'หมายเหตุ': 'ทักแชทสอบถามเรทฝาก-ถอน'
      },
      {
        'ชื่อ-นามสกุล': 'คุณชานนท์ มั่นคง',
        'ยูสเซอร์เนม': 'mc99019',
        'เบอร์โทรศัพท์': '0890123409',
        'LINE OA': '@chanon_mc',
        'สถานะไลน์เล็ก': 'มี',
        'ช่องทางสมัคร': 'facebook',
        'หมายเหตุ': 'คีย์นำเข้าจากแคมเปญวันหยุด'
      },
      {
        'ชื่อ-นามสกุล': 'คุณจันทิมา ศรีสุวรรณ',
        'ยูสเซอร์เนม': 'mc99020',
        'เบอร์โทรศัพท์': '0891234510',
        'LINE OA': '@jan_sri',
        'สถานะไลน์เล็ก': 'รอแอด',
        'ช่องทางสมัคร': 'tiktok',
        'หมายเหตุ': 'ทักแนะนำเพื่อนมา สนใจเปิดยูส'
      }
    ];

    if (format === 'csv') {
      const headers = ['ชื่อ-นามสกุล', 'ยูสเซอร์เนม', 'เบอร์โทรศัพท์', 'LINE OA', 'สถานะไลน์เล็ก', 'ช่องทางสมัคร', 'หมายเหตุ'];
      const csvRows = [
        headers.join(','),
        ...sampleRows.map(row => [
          `"${row['ชื่อ-นามสกุล']}"`,
          `"${row['ยูสเซอร์เนม']}"`,
          `"${row['เบอร์โทรศัพท์']}"`,
          `"${row['LINE OA']}"`,
          `"${row['สถานะไลน์เล็ก']}"`,
          `"${row['ช่องทางสมัคร']}"`,
          `"${row['หมายเหตุ']}"`
        ].join(','))
      ];
      const csvContent = '\uFEFF' + csvRows.join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MC_Customer_Template_10_Leads_${today}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const ws = XLSX.utils.json_to_sheet(sampleRows);
      ws['!cols'] = [
        { wch: 25 },
        { wch: 15 },
        { wch: 15 },
        { wch: 18 },
        { wch: 15 },
        { wch: 18 },
        { wch: 35 }
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Marketing_Leads');
      XLSX.writeFile(wb, `MC_Customer_Template_10_Leads_${today}.xlsx`);
    }
  };

  // Handle Bulk Lead File Upload & Validation (Supervisor Only)
  const handleBulkFileUpload = (e) => {
    if (!hasSupervisorAccess) {
      alert(lang === 'TH' ? '⚠️ สิทธิ์เฉพาะหัวหน้างาน (Supervisor) เท่านั้นที่สามารถนำเข้าไฟล์ลูกค้าได้' : '⚠️ Supervisor privilege required.');
      return;
    }
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' });

        if (!Array.isArray(jsonData) || jsonData.length === 0) {
          alert(lang === 'TH' ? '⚠️ ไม่พบข้อมูลในไฟล์ที่เลือก กรุณาตรวจสอบไฟล์อีกครั้ง' : '⚠️ No data found in the selected file.');
          return;
        }

        const normalizeKey = (key) => {
          return String(key || '')
            .trim()
            .toLowerCase()
            .replace(/[\s\-_]+/g, '');
        };

        const seenFilePhones = new Set();
        const seenFileUsernames = new Set();

        const validatedList = jsonData.map((row, index) => {
          const getVal = (possibleKeys) => {
            for (const [k, v] of Object.entries(row)) {
              const normK = normalizeKey(k);
              if (possibleKeys.some(pk => normK === normalizeKey(pk) || normK.includes(normalizeKey(pk)))) {
                return v !== undefined && v !== null ? String(v).trim() : '';
              }
            }
            return '';
          };

          const rawFullName = getVal(['ชื่อ-นามสกุล', 'ชื่อ-สกุล', 'ชื่อสกุล', 'ชื่อลูกค้า', 'ชื่อ', 'fullname', 'full_name', 'name', 'customer_name']);
          const rawUsername = getVal(['ยูสเซอร์เนม', 'ยูสเซอร์', 'ยูส', 'username', 'user', 'userid', 'account']);
          const rawPhone = getVal(['เบอร์โทรศัพท์', 'เบอร์โทร', 'เบอร์', 'โทร', 'phone', 'tel', 'mobile', 'telephone']);
          const rawLineOA = getVal(['line_oa', 'lineoa', 'line_id', 'lineid', 'line', 'ไลน์', 'ไอดีไลน์']);
          const rawLineLek = getVal(['สถานะไลน์เล็ก', 'ไลน์เล็ก', 'line_lek', 'linelek']);
          const rawSource = getVal(['ช่องทางสมัคร', 'ช่องทาง', 'ที่มา', 'source_channel', 'source', 'channel']);
          const rawNotes = getVal(['หมายเหตุ', 'โน้ต', 'รายละเอียด', 'notes', 'note', 'remark']);
          const rawAgent = getVal(['ผู้รับผิดชอบ', 'พนักงาน', 'เจ้าหน้าที่', 'assigned_to', 'agent', 'created_by']);

          const cleanPhone = rawPhone.replace(/\D/g, '');
          const cleanUsername = rawUsername.trim().toLowerCase();
          const cleanFullName = rawFullName.trim();

          let lineLek = 'รอแอด';
          if (rawLineLek.includes('มี') || rawLineLek.toLowerCase() === 'has' || rawLineLek.toLowerCase() === 'yes') {
            lineLek = 'มี';
          } else if (rawLineLek.includes('ไม่มี') || rawLineLek.toLowerCase() === 'none' || rawLineLek.toLowerCase() === 'no') {
            lineLek = 'ไม่มี';
          }

          let sourceChannel = 'facebook';
          if (rawSource) {
            const sLower = rawSource.toLowerCase();
            const matchedCh = sourceChannels.find(ch => sLower.includes(ch.toLowerCase()) || ch.toLowerCase().includes(sLower));
            sourceChannel = matchedCh || rawSource;
          }

          const issues = [];
          let status = 'VALID'; // 'VALID' | 'WARNING' | 'ERROR'

          // 1. Full Name check
          if (!cleanFullName) {
            issues.push({ type: 'MISSING_NAME', label: lang === 'TH' ? 'ไม่มีชื่อ-นามสกุล' : 'Missing Name', severity: 'error' });
            status = 'ERROR';
          }

          // 2. Phone check
          if (!cleanPhone) {
            issues.push({ type: 'MISSING_PHONE', label: lang === 'TH' ? 'ไม่มีเบอร์โทร' : 'Missing Phone', severity: 'error' });
            status = 'ERROR';
          } else if (cleanPhone.length < 9 || cleanPhone.length > 10) {
            issues.push({ type: 'INVALID_PHONE', label: lang === 'TH' ? `เบอร์ไม่ครบ 9-10 หลัก (${cleanPhone})` : `Invalid Phone (${cleanPhone})`, severity: 'error' });
            status = 'ERROR';
          } else {
            // Duplicate in file
            if (seenFilePhones.has(cleanPhone)) {
              issues.push({ type: 'DUP_FILE_PHONE', label: lang === 'TH' ? 'เบอร์ซ้ำกันเองในไฟล์นี้' : 'Duplicate phone in file', severity: 'warning' });
              if (status !== 'ERROR') status = 'WARNING';
            } else {
              seenFilePhones.add(cleanPhone);
            }

            // Duplicate in system (phone: match exact or last 9 digits)
            const targetPhoneKey = cleanPhone.length >= 9 ? cleanPhone.slice(-9) : cleanPhone;
            const sysDupPhone = nonDeletedCustomers.find(c => {
              const p = (c.phone || '').replace(/\D/g, '');
              if (p.length < 8) return false;
              const pKey = p.length >= 9 ? p.slice(-9) : p;
              return pKey === targetPhoneKey;
            });
            if (sysDupPhone) {
              issues.push({
                type: 'DUP_SYS_PHONE',
                label: lang === 'TH' 
                  ? `เบอร์ซ้ำในระบบ (${sysDupPhone.fullName || sysDupPhone.username || 'ลูกค้าเดิม'}${sysDupPhone.createdBy ? ` / ดูแลโดย ${sysDupPhone.createdBy}` : ''})` 
                  : `Phone duplicate with existing customer`,
                severity: 'warning'
              });
              if (status !== 'ERROR') status = 'WARNING';
            }
          }

          // 3. Username check
          let sysDupUser = null;
          if (cleanUsername) {
            if (/\s/.test(rawUsername)) {
              issues.push({ type: 'USER_SPACE', label: lang === 'TH' ? 'ยูสเซอร์มีช่องว่าง' : 'Username has spaces', severity: 'warning' });
              if (status !== 'ERROR') status = 'WARNING';
            }
            if (seenFileUsernames.has(cleanUsername)) {
              issues.push({ type: 'DUP_FILE_USER', label: lang === 'TH' ? 'ยูสเซอร์ซ้ำกันเองในไฟล์' : 'Duplicate username in file', severity: 'warning' });
              if (status !== 'ERROR') status = 'WARNING';
            } else {
              seenFileUsernames.add(cleanUsername);
            }

            sysDupUser = nonDeletedCustomers.find(c => c.username && c.username.trim().toLowerCase() === cleanUsername);
            if (sysDupUser) {
              issues.push({
                type: 'DUP_SYS_USER',
                label: lang === 'TH' 
                  ? `ยูสเซอร์ "${cleanUsername}" ซ้ำในระบบ (${sysDupUser.fullName || 'มีอยู่แล้ว'})` 
                  : `Username already exists in system`,
                severity: 'warning'
              });
              if (status !== 'ERROR') status = 'WARNING';
            }
          }

          // 4. LINE OA check (strip leading @ and match)
          let sysDupLine = null;
          const cleanLineOA = rawLineOA.trim().toLowerCase();
          const isLineIgnored = !cleanLineOA || ['-', '--', '---', 'ไม่มี', 'ไม่มีไลน์', 'none', 'no'].includes(cleanLineOA);
          if (!isLineIgnored && cleanLineOA.length >= 2) {
            const cleanLineKey = cleanLineOA.replace(/^@/, '');
            sysDupLine = nonDeletedCustomers.find(c => {
              const l = (c.lineOA || '').trim().toLowerCase();
              if (!l || ['-', '--', '---', 'ไม่มี', 'ไม่มีไลน์', 'none', 'no'].includes(l)) return false;
              const lKey = l.replace(/^@/, '');
              return lKey === cleanLineKey;
            });
            if (sysDupLine) {
              issues.push({
                type: 'DUP_SYS_LINE',
                label: lang === 'TH' ? `ไลน์ซ้ำในระบบ (${sysDupLine.fullName || sysDupLine.username})` : `LINE OA duplicate`,
                severity: 'warning'
              });
              if (status !== 'ERROR') status = 'WARNING';
            }
          }

          // Build structured system duplicate items for instant alert modal
          const systemDuplicates = [];
          if (sysDupPhone) {
            systemDuplicates.push({
              type: 'phone',
              fieldLabel: 'เบอร์โทรศัพท์',
              fieldIcon: '📞',
              importValue: rawPhone.trim(),
              matchedCustomer: {
                id: sysDupPhone.id,
                fullName: sysDupPhone.fullName || '-',
                username: sysDupPhone.username || '-',
                phone: sysDupPhone.phone || '-',
                lineOA: sysDupPhone.lineOA || '-',
                createdBy: sysDupPhone.createdBy || '-'
              }
            });
          }
          if (sysDupUser) {
            systemDuplicates.push({
              type: 'username',
              fieldLabel: 'ยูสเซอร์เนม',
              fieldIcon: '🆔',
              importValue: cleanUsername,
              matchedCustomer: {
                id: sysDupUser.id,
                fullName: sysDupUser.fullName || '-',
                username: sysDupUser.username || '-',
                phone: sysDupUser.phone || '-',
                lineOA: sysDupUser.lineOA || '-',
                createdBy: sysDupUser.createdBy || '-'
              }
            });
          }
          if (sysDupLine) {
            systemDuplicates.push({
              type: 'lineOA',
              fieldLabel: 'LINE OA',
              fieldIcon: '💬',
              importValue: rawLineOA.trim(),
              matchedCustomer: {
                id: sysDupLine.id,
                fullName: sysDupLine.fullName || '-',
                username: sysDupLine.username || '-',
                phone: sysDupLine.phone || '-',
                lineOA: sysDupLine.lineOA || '-',
                createdBy: sysDupLine.createdBy || '-'
              }
            });
          }

          return {
            rowIndex: index + 1,
            fullName: cleanFullName,
            username: cleanUsername,
            phone: rawPhone.trim(),
            cleanPhone,
            lineOA: rawLineOA.trim() || '-',
            lineLek,
            sourceChannel,
            notes: rawNotes.trim(),
            agentInRow: rawAgent.trim(),
            status,
            issues,
            systemDuplicates,
            hasSystemDuplicate: systemDuplicates.length > 0,
            isValid: status === 'VALID',
            hasWarning: status === 'WARNING',
            hasError: status === 'ERROR'
          };
        });

        setBulkPreviewRows(validatedList);
        setBulkFileName(file.name);
        setBulkFileSize((file.size / 1024).toFixed(1) + ' KB');
        setBulkImportSuccess(null);
        setBulkFilter('ALL');

        // 🔔 เด้งแจ้งเตือนทันทีเมื่อพบรายการซ้ำกับฐานข้อมูลในระบบ
        const rowsWithSysDuplicates = validatedList.filter(r => r.hasSystemDuplicate);
        if (rowsWithSysDuplicates.length > 0) {
          setDuplicateModalData({
            fileName: file.name,
            totalRows: validatedList.length,
            duplicates: rowsWithSysDuplicates
          });
        }

        writeLog('IMPORT_SCAN', `สแกนไฟล์ [${file.name}] สำเร็จ (${validatedList.length} รายการ: พร้อมนำเข้า ${validatedList.filter(r => r.isValid).length} คน, ซ้ำในระบบ ${rowsWithSysDuplicates.length} คน)`, 'info');

      } catch (err) {
        console.error('File parse error:', err);
        alert(lang === 'TH' ? `เกิดข้อผิดพลาดในการอ่านไฟล์: ${err.message}` : `Cannot parse file: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Execute Bulk Lead Import (Supervisor Only)
  const handleExecuteBulkImport = async () => {
    if (!hasSupervisorAccess) {
      alert(lang === 'TH' ? '⚠️ สิทธิ์เฉพาะหัวหน้างาน (Supervisor) เท่านั้นที่สามารถนำเข้าไฟล์ลูกค้าได้' : '⚠️ Supervisor privilege required.');
      return;
    }
    if (!bulkPreviewRows || bulkPreviewRows.length === 0 || isImportingBulk) return;

    const rowsToImport = bulkPreviewRows.filter(r => skipIssues ? r.isValid : !r.hasError);

    if (rowsToImport.length === 0) {
      alert(lang === 'TH' ? '⚠️ ไม่มีรายการที่พร้อมนำเข้า กรุณาตรวจสอบข้อมูลอีกครั้ง' : '⚠️ No valid records to import.');
      return;
    }

    const confirmMsg = lang === 'TH' 
      ? `ยืนยันการนำเข้ารายชื่อลูกค้าจำนวน ${rowsToImport.length} คน เข้าสู่พอร์ตงานใช่หรือไม่?` 
      : `Confirm importing ${rowsToImport.length} customer records to portfolio?`;
    if (!window.confirm(confirmMsg)) return;

    setIsImportingBulk(true);

    try {
      const now = new Date();
      let createdIso;
      if (bulkRegistrationDate) {
        const [y, m, d] = bulkRegistrationDate.split('-').map(Number);
        const dateWithTime = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
        createdIso = dateWithTime.toISOString();
      } else {
        createdIso = now.toISOString();
      }

      const activeAgentsList = agents.filter(a => a.isActive !== false && !a.isArchived);
      const campaignMonth = bulkRegistrationDate ? bulkRegistrationDate.substring(0, 7) : selectedMonth;

      const newCustomers = rowsToImport.map((row, idx) => {
        let assigned = bulkTargetAgent || activeAgentName || 'Agent';

        if (bulkAssignMode === 'round_robin' && effectiveRoundRobinAgents.length > 0) {
          assigned = effectiveRoundRobinAgents[idx % effectiveRoundRobinAgents.length];
        }

        if (row.agentInRow && agents.some(a => a.name === row.agentInRow)) {
          assigned = row.agentInRow;
        }

        return {
          id: Math.floor(Date.now() % 1000000000) + Math.floor(Math.random() * 99999) + idx,
          createdAt: createdIso,
          username: row.username,
          fullName: row.fullName,
          phone: row.phone,
          lineOA: row.lineOA || '-',
          lineLek: row.lineLek || 'รอแอด',
          sourceChannel: row.sourceChannel || 'facebook',
          referrer: '',
          totalDeposit: 0,
          createdBy: assigned,
          campaignMonth: campaignMonth,
          followUp: {},
          followUpByMonth: {},
          notes: row.notes || '',
          hasDeposited: false,
          returnedDepositAmount: 0
        };
      });

      // 1. Update React state & localStorage
      const updated = [...newCustomers, ...customers];
      setCustomers(updated);
      try {
        localStorage.setItem('mc_customers', JSON.stringify(updated));
      } catch (e) {}

      // 2. Push to Supabase Cloud
      if (supabaseClient) {
        for (const nc of newCustomers) {
          pushCustomerToCloud(supabaseClient, nc).catch(e => console.warn('Sync lead error:', e));
        }
      }

      // 3. Log Audit Trail
      const assignDesc = bulkAssignMode === 'round_robin'
        ? `กระจายเฉลี่ย (Round-Robin) ให้ ${effectiveRoundRobinAgents.length} คน (${effectiveRoundRobinAgents.join(', ')})`
        : `มอบหมายให้พนักงานคนเดียว [${bulkTargetAgent || activeAgentName}]`;
      writeLog('IMPORT', `📥 นำเข้ารายชื่อลูกค้าใหม่จากไฟล์ "${bulkFileName}" สำเร็จ: ${newCustomers.length} คน (${assignDesc}) โดย ${activeAgentName || 'คุณอ้อ (หัวหน้า)'}`, 'success');

      // 4. Success summary banner
      setBulkImportSuccess({
        count: newCustomers.length,
        fileName: bulkFileName,
        assignSummary: assignDesc
      });

      // 5. Reset preview & file
      setBulkPreviewRows(null);
      setBulkFileName('');

    } catch (err) {
      console.error('Bulk import error:', err);
      alert(lang === 'TH' ? `เกิดข้อผิดพลาดในการนำเข้า: ${err.message}` : `Import failed: ${err.message}`);
    } finally {
      setIsImportingBulk(false);
    }
  };

  // Validation: Username
  const cleanedAddUsername = formUsername.trim().toLowerCase();
  const hasAddUsernameSpace = /\s/.test(formUsername);
  const isAddUsernameEmpty = !formUsername.trim();
  const duplicateAddCustomer = useMemo(() => {
    if (!cleanedAddUsername) return null;
    return nonDeletedCustomers.find(c => c.username && c.username.trim().toLowerCase() === cleanedAddUsername);
  }, [cleanedAddUsername, nonDeletedCustomers]);
  const isAddUsernameDuplicate = Boolean(duplicateAddCustomer);

  // Validation: Phone
  const cleanedAddPhone = formPhone.replace(/\D/g, '');
  const isAddPhoneEmpty = !formPhone.trim();
  const duplicatePhoneCustomer = useMemo(() => {
    if (cleanedAddPhone.length < 8) return null;
    return nonDeletedCustomers.find(c => {
      const p = (c.phone || '').replace(/\D/g, '');
      return p.length >= 8 && p === cleanedAddPhone;
    });
  }, [cleanedAddPhone, nonDeletedCustomers]);
  const isAddPhoneDuplicate = Boolean(duplicatePhoneCustomer);

  // Validation: LINE OA
  const cleanedAddLineOA = formLineOA.trim().toLowerCase();
  const isLineOAIgnored = ['-', '--', '---', 'ไม่มี', 'ไม่มีไลน์', 'none', 'no'].includes(cleanedAddLineOA);
  const isAddLineOAEmpty = !formLineOA.trim();
  const duplicateLineOACustomer = useMemo(() => {
    if (isLineOAIgnored || cleanedAddLineOA.length < 2) return null;
    return nonDeletedCustomers.find(c => {
      const l = (c.lineOA || '').trim().toLowerCase();
      if (!l || ['-', '--', '---', 'ไม่มี', 'ไม่มีไลน์', 'none', 'no'].includes(l)) return false;
      return l === cleanedAddLineOA;
    });
  }, [cleanedAddLineOA, isLineOAIgnored, nonDeletedCustomers]);
  const isAddLineOADuplicate = Boolean(duplicateLineOACustomer);

  // Validation: Full name
  const isAddFullNameEmpty = !formFullName.trim();

  // Validation: Referrer (if sourceChannel is 'เพื่อนแนะนำ')
  const isReferrerSource = formSource === 'เพื่อนแนะนำ';
  const isReferrerEmpty = isReferrerSource && !formReferrer.trim();
  const isReferrerSelf = useMemo(() => {
    if (!isReferrerSource || !formReferrer.trim()) return false;
    const refClean = formReferrer.trim().toLowerCase();
    if (cleanedAddUsername && refClean === cleanedAddUsername) return true;
    const refDigits = formReferrer.trim().replace(/\D/g, '');
    if (cleanedAddPhone && refDigits.length >= 8 && refDigits === cleanedAddPhone) return true;
    return false;
  }, [isReferrerSource, formReferrer, cleanedAddUsername, cleanedAddPhone]);

  const matchedReferrerCustomer = useMemo(() => {
    if (!isReferrerSource || !formReferrer.trim()) return null;
    const refClean = formReferrer.trim().toLowerCase();
    const refDigits = formReferrer.trim().replace(/\D/g, '');
    return nonDeletedCustomers.find(c => {
      const cu = (c.username || '').trim().toLowerCase();
      if (cu && cu === refClean) return true;
      const cp = (c.phone || '').replace(/\D/g, '');
      if (refDigits.length >= 8 && cp.length >= 8 && cp === refDigits) return true;
      return false;
    });
  }, [isReferrerSource, formReferrer, nonDeletedCustomers]);

  const isReferrerNotFound = isReferrerSource && !isReferrerEmpty && !isReferrerSelf && !matchedReferrerCustomer;
  const isAddReferrerInvalid = isReferrerSource && (isReferrerEmpty || isReferrerSelf || isReferrerNotFound);

  // Overall form validity
  const isAddCustomerDisabled = isAddFullNameEmpty ||
    isAddUsernameEmpty ||
    isAddUsernameDuplicate ||
    hasAddUsernameSpace ||
    isAddPhoneEmpty ||
    isAddPhoneDuplicate ||
    isAddLineOAEmpty ||
    isAddLineOADuplicate ||
    isAddReferrerInvalid;

  const handleAddCustomerSubmit = (e) => {
    e.preventDefault();
    if (isAddCustomerDisabled) return;

    const now = new Date();
    let createdIso;
    if (inputRegistrationDate) {
      const [y, m, d] = inputRegistrationDate.split('-').map(Number);
      const dateWithTime = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
      createdIso = dateWithTime.toISOString();
    } else {
      createdIso = now.toISOString();
    }

    const pendingCust = {
      id: Math.floor(Date.now() % 1000000000) + Math.floor(Math.random() * 999),
      createdAt: createdIso,
      username: cleanedAddUsername,
      fullName: formFullName.trim(),
      phone: formPhone.trim(),
      lineOA: formLineOA.trim(),
      lineLek: formLineLek.trim(),
      sourceChannel: formSource,
      referrer: isReferrerSource ? (matchedReferrerCustomer?.username || formReferrer.trim()) : '',
      totalDeposit: 0,
      createdBy: (isSupervisor && newCustAssignedAgent) ? newCustAssignedAgent : (activeAgentName || 'Agent'),
      campaignMonth: inputRegistrationDate ? inputRegistrationDate.substring(0, 7) : selectedMonth,
      followUp: {},
      followUpByMonth: {},
      notes: formNotes.trim(),
      hasDeposited: false,
      returnedDepositAmount: 0
    };

    setAddConfirmModalData(pendingCust);
  };

  // Recently Added table list
  const recentCustomers = useMemo(() => {
    return nonDeletedCustomers.filter(c => {
      // Month filter
      if (selectedMonth !== 'ALL' && selectedMonth) {
        const custMonth = c.createdAt ? c.createdAt.substring(0, 7) : '';
        if (custMonth && custMonth !== selectedMonth) return false;
      }

      // Status filter
      const hasUser = Boolean(c.username && c.username.trim() !== '');
      if (statusFilter === 'NOT_REGISTERED' && hasUser) return false;
      if (statusFilter === 'REGISTERED' && !hasUser) return false;
      if (statusFilter === 'DEPOSITED' && !c.hasDeposited) return false;
      if (statusFilter === 'NOT_DEPOSITED' && (!hasUser || c.hasDeposited)) return false;

      // Line Lek filter
      if (lineLekFilter !== 'ALL') {
        const lk = c.lineLek || 'รอแอด';
        if (lineLekFilter === 'HAS' && lk !== 'มี' && lk !== 'มีไลน์เล็ก') return false;
        if (lineLekFilter === 'WAITING' && lk !== 'รอแอด' && lk !== 'รอแอดไลน์เล็ก') return false;
        if (lineLekFilter === 'NONE' && lk !== 'ไม่มี' && lk !== 'ไม่มีไลน์เล็ก') return false;
      }

      return true;
    });
  }, [nonDeletedCustomers, selectedMonth, statusFilter, lineLekFilter]);

  // Bulk import computed stats
  const bulkStats = useMemo(() => {
    if (!bulkPreviewRows) return { total: 0, valid: 0, warning: 0, error: 0, sysDuplicates: 0 };
    let valid = 0, warning = 0, error = 0, sysDuplicates = 0;
    bulkPreviewRows.forEach(r => {
      if (r.hasSystemDuplicate) sysDuplicates++;
      if (r.hasError) error++;
      else if (r.hasWarning) warning++;
      else valid++;
    });
    return {
      total: bulkPreviewRows.length,
      valid,
      warning,
      error,
      sysDuplicates
    };
  }, [bulkPreviewRows]);

  const filteredBulkRows = useMemo(() => {
    if (!bulkPreviewRows) return [];
    if (bulkFilter === 'VALID') return bulkPreviewRows.filter(r => r.isValid);
    if (bulkFilter === 'SYS_DUP') return bulkPreviewRows.filter(r => r.hasSystemDuplicate);
    if (bulkFilter === 'ISSUES') return bulkPreviewRows.filter(r => r.hasWarning || r.hasError);
    return bulkPreviewRows;
  }, [bulkPreviewRows, bulkFilter]);

  const activeAgentsList = useMemo(() => {
    return agents.filter(a => a.isActive !== false && !a.isArchived);
  }, [agents]);

  const effectiveRoundRobinAgents = useMemo(() => {
    if (selectedRoundRobinAgents.length > 0) {
      return selectedRoundRobinAgents;
    }
    return activeAgentsList.map(a => a.name);
  }, [selectedRoundRobinAgents, activeAgentsList]);

  const readyToImportCount = useMemo(() => {
    if (!bulkPreviewRows) return 0;
    return bulkPreviewRows.filter(r => skipIssues ? r.isValid : !r.hasError).length;
  }, [bulkPreviewRows, skipIssues]);

  const distributionSummary = useMemo(() => {
    if (effectiveRoundRobinAgents.length === 0) return [];
    const countMap = {};
    effectiveRoundRobinAgents.forEach(name => { countMap[name] = 0; });
    for (let i = 0; i < readyToImportCount; i++) {
      const aName = effectiveRoundRobinAgents[i % effectiveRoundRobinAgents.length];
      countMap[aName] = (countMap[aName] || 0) + 1;
    }
    return effectiveRoundRobinAgents.map(name => ({
      name,
      count: countMap[name] || 0
    }));
  }, [effectiveRoundRobinAgents, readyToImportCount]);

  return (
    <div>
      {/* Top Tab Switcher (Supervisor Only) */}
      {hasSupervisorAccess && (
        <div style={{ maxWidth: activeTab === 'bulk' && bulkPreviewRows ? '1280px' : '860px', margin: '0 auto 16px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setActiveTab('single')}
              className={`btn ${activeTab === 'single' ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                padding: '10px 18px',
                fontSize: '13.5px',
                fontWeight: 700,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: activeTab === 'single' ? '0 4px 14px rgba(124, 58, 237, 0.3)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <UserPlus size={16} />
              <span>{lang === 'TH' ? '👤 คีย์ทีละคน (Single Entry)' : '👤 Single Entry'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('bulk')}
              className={`btn ${activeTab === 'bulk' ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                padding: '10px 18px',
                fontSize: '13.5px',
                fontWeight: 700,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: activeTab === 'bulk' ? '0 4px 14px rgba(16, 185, 129, 0.3)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <FileSpreadsheet size={16} style={{ color: activeTab === 'bulk' ? '#ffffff' : '#34d399' }} />
              <span>{lang === 'TH' ? '📂 นำเข้าไฟล์ Excel / CSV (Bulk Import)' : '📂 Bulk Import (Excel/CSV)'}</span>
              {bulkPreviewRows && (
                <span style={{
                  background: '#10b981',
                  color: '#fff',
                  fontSize: '11px',
                  padding: '1px 7px',
                  borderRadius: '10px',
                  marginLeft: '4px'
                }}>
                  {bulkPreviewRows.length}
                </span>
              )}
            </button>
          </div>

          <div style={{
            fontSize: '11.5px',
            color: '#10b981',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            padding: '5px 12px',
            borderRadius: '20px'
          }}>
            <span>👑 สิทธิ์เฉพาะหัวหน้างาน (Supervisor Only)</span>
          </div>
        </div>
      )}

      {/* Success Notification Banner for Bulk Import */}
      {bulkImportSuccess && (
        <div style={{
          maxWidth: activeTab === 'bulk' && bulkPreviewRows ? '1280px' : '860px',
          margin: '0 auto 16px auto',
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          borderRadius: '12px',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CheckCircle size={22} style={{ color: '#34d399', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, color: '#34d399', fontSize: '14px' }}>
                {lang === 'TH' ? `🎉 นำเข้าลูกค้าสำเร็จจำนวน ${bulkImportSuccess.count} คน!` : `🎉 Successfully imported ${bulkImportSuccess.count} leads!`}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {lang === 'TH' ? `ไฟล์: ${bulkImportSuccess.fileName} • ${bulkImportSuccess.assignSummary} • บันทึกสู่ฐานข้อมูล & คลาวด์เรียบร้อยแล้ว` : `File: ${bulkImportSuccess.fileName} • Synced to Cloud`}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setBulkImportSuccess(null)}
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '11px' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* TAB 1: Single Entry Form */}
      {(!hasSupervisorAccess || activeTab === 'single') && (
        <div id="tour-newcust-panel" className="panel" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
          <div className="panel-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
            <h3 className="panel-title" style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserPlus style={{ color: 'var(--primary)' }} /> {lang === 'TH' ? 'เพิ่มลูกค้าใหม่รายคน' : 'Add New Customer'}
            </h3>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '-8px' }}>
            {lang === 'TH' ? 'คีย์ข้อมูลลูกค้ารายแรกเข้าพอร์ตงานทันที รองรับทั้งลูกค้าสมัครเปิดยูสเซอร์เนมแล้ว และลูกค้าทักแต่ยังไม่สมัคร' : 'Register new leads into portfolio immediately. Supports both registered usernames and uncompleted inquiries.'}
          </p>

        <form onSubmit={handleAddCustomerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>{lang === 'TH' ? 'ชื่อเจ้าหน้าที่บันทึก (ผู้รับผิดชอบหลัก)' : 'Recording Agent (Assigned Owner)'}</label>
              {isSupervisor ? (
                <select 
                  value={newCustAssignedAgent || activeAgentName} 
                  onChange={(e) => setNewCustAssignedAgent(e.target.value)}
                  className="select-input"
                >
                  {agents.filter(a => a.isActive !== false).map(a => (
                    <option key={a.id} value={a.name}>{a.name}</option>
                  ))}
                </select>
              ) : (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: theme === 'light' ? '#f1f5f9' : 'rgba(255,255,255,0.05)',
                  border: theme === 'light' ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 700,
                  fontSize: '13px',
                  color: theme === 'light' ? '#0f172a' : '#ffffff'
                }}>
                  <UserCheck style={{ width: '16px', height: '16px', color: '#38bdf8' }} />
                  <span>{activeAgentName || (lang === 'TH' ? 'เจ้าหน้าที่' : 'Agent')} ({lang === 'TH' ? 'บัญชีของคุณ' : 'Your Account'})</span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>{lang === 'TH' ? 'วันที่คีย์งาน (Registration Date)' : 'Registration Date'}</label>
              <input 
                type="date" 
                value={inputRegistrationDate} 
                onChange={(e) => setInputRegistrationDate(e.target.value)} 
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>{lang === 'TH' ? 'ชื่อ-นามสกุลลูกค้า (Customer Full Name)' : 'Customer Full Name'}</span>
                <span style={{ color: '#ef4444', fontWeight: 'bold' }}>*</span>
              </label>
              <input 
                type="text" 
                value={formFullName} 
                onChange={(e) => setFormFullName(e.target.value)} 
                placeholder={lang === 'TH' ? 'เช่น คุณสมชาย ใจดี...' : 'e.g. Somchai Jaidee...'} 
                style={{
                  borderColor: isAddFullNameEmpty && (formUsername || formPhone || formLineOA) ? 'rgba(239, 68, 68, 0.6)' : undefined
                }}
              />
              {isAddFullNameEmpty && (formUsername || formPhone || formLineOA) && (
                <span style={{ color: '#ef4444', fontSize: '11.5px', marginTop: '4px', display: 'block' }}>{lang === 'TH' ? '* จำเป็นต้องระบุชื่อ-นามสกุล' : '* Customer Full Name is required'}</span>
              )}
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>{lang === 'TH' ? 'ยูสเซอร์ลูกค้า (Username)' : 'Customer Username'}</span>
                  <span style={{ color: '#ef4444', fontWeight: 'bold' }}>*</span>
                </label>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{lang === 'TH' ? 'ห้ามซ้ำในระบบ / ห้ามมีเว้นวรรค' : 'Must be unique / No spaces'}</span>
              </div>
              <input 
                type="text" 
                value={formUsername} 
                onChange={(e) => setFormUsername(e.target.value)} 
                placeholder={lang === 'TH' ? 'ระบุยูสเซอร์ลูกค้า (เช่น mc88899)...' : 'Enter username (e.g. mc88899)...'} 
                style={{
                  borderColor: (isAddUsernameDuplicate || hasAddUsernameSpace) 
                    ? '#ef4444' 
                    : (formUsername.trim() ? '#10b981' : (formFullName || formPhone || formLineOA ? 'rgba(239, 68, 68, 0.6)' : undefined)),
                  backgroundColor: (isAddUsernameDuplicate || hasAddUsernameSpace) 
                    ? (theme === 'light' ? '#fef2f2' : 'rgba(239, 68, 68, 0.08)') 
                    : (formUsername.trim() ? (theme === 'light' ? '#f0fdf4' : 'rgba(16, 185, 129, 0.06)') : undefined)
                }}
              />
              {isAddUsernameDuplicate && (
                <span style={{ color: '#ef4444', fontSize: '11.5px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                  {lang === 'TH' ? `❌ ยูสเซอร์ "${formUsername.trim()}" ซ้ำกับลูกค้าในระบบแล้ว (${duplicateAddCustomer?.fullName ? `ของ ${duplicateAddCustomer.fullName}` : 'มีอยู่แล้ว'}) ไม่สามารถบันทึกได้` : `❌ Username "${formUsername.trim()}" already exists in system. Cannot save duplicate.`}
                </span>
              )}
              {!isAddUsernameDuplicate && hasAddUsernameSpace && (
                <span style={{ color: '#ef4444', fontSize: '11.5px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                  {lang === 'TH' ? '❌ ยูสเซอร์ห้ามมีเว้นวรรค (ช่องว่าง) กรุณาลบออก' : '❌ Username cannot contain spaces'}
                </span>
              )}
              {!isAddUsernameDuplicate && !hasAddUsernameSpace && formUsername.trim() && (
                <span style={{ color: '#10b981', fontSize: '11.5px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                  {lang === 'TH' ? '✓ ยูสเซอร์นี้ใช้งานได้ (ไม่ซ้ำในระบบ)' : '✓ Username is available'}
                </span>
              )}
              {isAddUsernameEmpty && (formFullName || formPhone || formLineOA) && (
                <span style={{ color: '#ef4444', fontSize: '11.5px', marginTop: '4px', display: 'block' }}>{lang === 'TH' ? '* จำเป็นต้องระบุยูสเซอร์ลูกค้า (ห้ามซ้ำ)' : '* Username is required (must be unique)'}</span>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>{lang === 'TH' ? 'เบอร์ติดต่อลูกค้า (Phone Number)' : 'Phone Number'}</span>
                  <span style={{ color: '#ef4444', fontWeight: 'bold' }}>*</span>
                </label>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{lang === 'TH' ? 'ห้ามซ้ำในระบบ' : 'Must be unique'}</span>
              </div>
              <input 
                type="text" 
                value={formPhone} 
                onChange={(e) => setFormPhone(e.target.value)} 
                placeholder={lang === 'TH' ? 'เช่น 089-123-4567...' : 'e.g. 089-123-4567...'} 
                style={{
                  borderColor: isAddPhoneDuplicate 
                    ? '#ef4444' 
                    : (isAddPhoneEmpty && (formFullName || formUsername || formLineOA) ? 'rgba(239, 68, 68, 0.6)' : (cleanedAddPhone.length >= 9 ? '#10b981' : undefined)),
                  backgroundColor: isAddPhoneDuplicate 
                    ? (theme === 'light' ? '#fef2f2' : 'rgba(239, 68, 68, 0.08)') 
                    : (cleanedAddPhone.length >= 9 ? (theme === 'light' ? '#f0fdf4' : 'rgba(16, 185, 129, 0.06)') : undefined)
                }}
              />
              {isAddPhoneDuplicate && (
                <span style={{ color: '#ef4444', fontSize: '11.5px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                  {lang === 'TH' 
                    ? `❌ เบอร์โทร "${formPhone.trim()}" ซ้ำกับลูกค้าในระบบแล้ว (${duplicatePhoneCustomer?.fullName ? `ของ ${duplicatePhoneCustomer.fullName} (ยูส: ${duplicatePhoneCustomer.username || '-'})` : 'มีอยู่แล้ว'}${duplicatePhoneCustomer?.createdBy ? ` / ดูแลโดย ${duplicatePhoneCustomer.createdBy}` : ''})` 
                    : `❌ Phone number "${formPhone.trim()}" already exists in system.`}
                </span>
              )}
              {!isAddPhoneDuplicate && cleanedAddPhone.length >= 9 && (
                <span style={{ color: '#10b981', fontSize: '11.5px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                  {lang === 'TH' ? '✓ เบอร์โทรนี้ใช้งานได้ (ไม่ซ้ำในระบบ)' : '✓ Phone number is available'}
                </span>
              )}
              {isAddPhoneEmpty && (formFullName || formUsername || formLineOA) && (
                <span style={{ color: '#ef4444', fontSize: '11.5px', marginTop: '4px', display: 'block' }}>{lang === 'TH' ? '* จำเป็นต้องระบุเบอร์ติดต่อ (ห้ามซ้ำ)' : '* Phone number is required (must be unique)'}</span>
              )}
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>{lang === 'TH' ? 'ไลน์ลูกค้า (LINE ID)' : 'LINE ID'}</span>
                  <span style={{ color: '#ef4444', fontWeight: 'bold' }}>*</span>
                </label>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{lang === 'TH' ? 'ห้ามซ้ำในระบบ (หากไม่มีใส่ -)' : 'Must be unique (enter - if none)'}</span>
              </div>
              <input 
                type="text" 
                value={formLineOA} 
                onChange={(e) => setFormLineOA(e.target.value)} 
                placeholder={lang === 'TH' ? 'เช่น @line_id หรือ line_user (หากไม่มีใส่ -)...' : 'e.g. @line_id or line_user...'} 
                style={{
                  borderColor: isAddLineOADuplicate 
                    ? '#ef4444' 
                    : (isAddLineOAEmpty && (formFullName || formUsername || formPhone) ? 'rgba(239, 68, 68, 0.6)' : (!isLineOAIgnored && cleanedAddLineOA.length >= 2 ? '#10b981' : undefined)),
                  backgroundColor: isAddLineOADuplicate 
                    ? (theme === 'light' ? '#fef2f2' : 'rgba(239, 68, 68, 0.08)') 
                    : (!isLineOAIgnored && cleanedAddLineOA.length >= 2 ? (theme === 'light' ? '#f0fdf4' : 'rgba(16, 185, 129, 0.06)') : undefined)
                }}
              />
              {isAddLineOADuplicate && (
                <span style={{ color: '#ef4444', fontSize: '11.5px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                  {lang === 'TH' 
                    ? `❌ ไลน์ "${formLineOA.trim()}" ซ้ำกับลูกค้าในระบบแล้ว (${duplicateLineOACustomer?.fullName ? `ของ ${duplicateLineOACustomer.fullName}` : 'มีอยู่แล้ว'})` 
                    : `❌ LINE ID "${formLineOA.trim()}" already exists in system.`}
                </span>
              )}
              {!isAddLineOADuplicate && !isLineOAIgnored && cleanedAddLineOA.length >= 2 && (
                <span style={{ color: '#10b981', fontSize: '11.5px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                  {lang === 'TH' ? '✓ ไลน์นี้ใช้งานได้ (ไม่ซ้ำในระบบ)' : '✓ LINE ID is available'}
                </span>
              )}
              {isAddLineOAEmpty && (formFullName || formUsername || formPhone) && (
                <span style={{ color: '#ef4444', fontSize: '11.5px', marginTop: '4px', display: 'block' }}>{lang === 'TH' ? '* จำเป็นต้องระบุไลน์ (หรือใส่ - หากไม่มี)' : '* LINE ID is required (or enter -)'}</span>
              )}
            </div>

            <div className="form-group">
              <label>{lang === 'TH' ? 'สถานะไลน์เล็ก (Line Lek Status)' : 'LINE Lek Status'}</label>
              <select 
                value={formLineLek} 
                onChange={(e) => setFormLineLek(e.target.value)} 
                className="select-input"
              >
                <option value="รอแอด">{lang === 'TH' ? '🟡 รอแอด' : '🟡 Pending Add'}</option>
                <option value="มี">{lang === 'TH' ? '🟢 มี' : '🟢 Has LINE'}</option>
                <option value="ไม่มี">{lang === 'TH' ? '⚪ ไม่มี' : '⚪ No LINE'}</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>{lang === 'TH' ? 'ช่องทางสมัคร (Source Channel)' : 'Source Channel'}</label>
            <select value={formSource} onChange={(e) => setFormSource(e.target.value)}>
              {sourceChannels.map(ch => (
                <option key={ch} value={ch}>{formatChannelDisplayName(ch, lang)}</option>
              ))}
            </select>
            {formSource === 'เพื่อนแนะนำ' && (
              <div style={{ marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ color: '#f59e0b', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                    <span>{lang === 'TH' ? '🎁 ยูสเซอร์ผู้แนะนำ / เบอร์เพื่อนที่แนะนำมา (Referrer Username / Phone)' : '🎁 Referrer Username / Phone Number'}</span>
                    <span style={{ color: '#ef4444', fontWeight: 'bold' }}>*</span>
                  </label>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{lang === 'TH' ? 'ต้องมียูสเซอร์ในระบบ' : 'Must exist in system'}</span>
                </div>
                <input 
                  type="text" 
                  list="referrerSuggestionsList"
                  value={formReferrer} 
                  onChange={(e) => setFormReferrer(e.target.value)} 
                  placeholder={lang === 'TH' ? 'กรอกยูสเซอร์เนมหรือเบอร์โทรเพื่อนที่แนะนำมา...' : 'Enter referrer username or phone number...'} 
                  style={{ 
                    borderColor: (isReferrerNotFound || isReferrerSelf)
                      ? '#ef4444' 
                      : (matchedReferrerCustomer ? '#10b981' : (isReferrerEmpty ? 'rgba(239, 68, 68, 0.6)' : 'rgba(245, 158, 11, 0.5)')),
                    backgroundColor: (isReferrerNotFound || isReferrerSelf)
                      ? (theme === 'light' ? '#fef2f2' : 'rgba(239, 68, 68, 0.08)') 
                      : (matchedReferrerCustomer ? (theme === 'light' ? '#f0fdf4' : 'rgba(16, 185, 129, 0.06)') : 'rgba(245, 158, 11, 0.05)')
                  }}
                />
                <datalist id="referrerSuggestionsList">
                  {customers.filter(c => c && c.username).slice(0, 300).map((c, i) => (
                    <option key={i} value={c.username}>
                      {c.fullName ? `${c.fullName} (${c.phone || ''})` : c.phone || ''}
                    </option>
                  ))}
                </datalist>

                {isReferrerNotFound && (
                  <span style={{ color: '#ef4444', fontSize: '11.5px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                    {lang === 'TH' 
                      ? `❌ ไม่พบยูสเซอร์หรือยูสเซอร์ไม่ถูกต้อง (ไม่พบข้อมูล "${formReferrer.trim()}" ในระบบ)` 
                      : `❌ Referrer user "${formReferrer.trim()}" not found in system.`}
                  </span>
                )}

                {isReferrerSelf && (
                  <span style={{ color: '#ef4444', fontSize: '11.5px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                    {lang === 'TH' ? '❌ ไม่สามารถระบุตนเองเป็นผู้แนะนำได้' : '❌ Cannot specify oneself as referrer'}
                  </span>
                )}

                {matchedReferrerCustomer && (
                  <span style={{ color: '#10b981', fontSize: '11.5px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                    {lang === 'TH' 
                      ? `✓ พบข้อมูลผู้แนะนำ: ${matchedReferrerCustomer.fullName ? `${matchedReferrerCustomer.fullName} ` : ''}(ยูส: ${matchedReferrerCustomer.username || '-'}${matchedReferrerCustomer.createdBy ? ` / ดูแลโดย: ${matchedReferrerCustomer.createdBy}` : ''})` 
                      : `✓ Referrer found: ${matchedReferrerCustomer.fullName || ''} (${matchedReferrerCustomer.username || ''})`}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>{lang === 'TH' ? 'โน้ตหมายเหตุก่อนการตาม' : 'Initial Follow-up Notes'}</label>
            <textarea 
              rows="3"
              value={formNotes} 
              onChange={(e) => setFormNotes(e.target.value)} 
              placeholder={lang === 'TH' ? 'เช่น ทักส่งข้อความแนะโปรฯ...' : 'e.g. Sent introductory promotion msg...'} 
              style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--text-main)', borderRadius: '8px', padding: '10px' }}
            />
          </div>

          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: (formFullName || formUsername || formPhone || formLineOA || formNotes || formReferrer) ? '1fr auto' : '1fr', gap: '10px' }}>
              <button 
                type="submit" 
                disabled={isAddCustomerDisabled}
                className={`btn ${isAddCustomerDisabled ? 'disabled' : ''}`} 
                style={{ 
                  padding: '13px 20px', 
                  fontSize: '14px', 
                  fontWeight: 600,
                  justifyContent: 'center',
                  opacity: isAddCustomerDisabled ? 0.45 : 1,
                  cursor: isAddCustomerDisabled ? 'not-allowed' : 'pointer',
                  backgroundColor: isAddCustomerDisabled ? (theme === 'light' ? '#cbd5e1' : 'rgba(255,255,255,0.08)') : 'var(--primary)',
                  color: isAddCustomerDisabled ? (theme === 'light' ? '#64748b' : '#94a3b8') : '#ffffff',
                  border: isAddCustomerDisabled ? (theme === 'light' ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.1)') : 'none',
                  boxShadow: isAddCustomerDisabled ? 'none' : '0 4px 14px rgba(124, 58, 237, 0.35)',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {isAddCustomerDisabled ? <Lock style={{ width: '16px', height: '16px' }} /> : <UserPlus style={{ width: '16px', height: '16px' }} />}
                <span>{isAddCustomerDisabled ? (lang === 'TH' ? 'กรุณากรอกข้อมูลและยูสเซอร์ให้ครบถ้วนเพื่อบันทึก' : 'Please fill all required fields') : (lang === 'TH' ? 'บันทึกลูกค้าเข้าพอร์ตงาน' : 'Save Customer to Portfolio')}</span>
              </button>
              {(formFullName || formUsername || formPhone || formLineOA || formNotes || formReferrer) && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn btn-secondary"
                  style={{
                    padding: '13px 18px',
                    fontSize: '13px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap'
                  }}
                  title={lang === 'TH' ? 'ล้างข้อมูลที่กรอกทั้งหมดออก' : 'Clear form fields'}
                >
                  🔄 {lang === 'TH' ? 'ล้างฟอร์ม' : 'Clear Form'}
                </button>
              )}
            </div>

            {isAddCustomerDisabled && (
              <div style={{
                background: isAddUsernameDuplicate || isAddPhoneDuplicate || isAddLineOADuplicate || hasAddUsernameSpace || isAddReferrerInvalid
                  ? (theme === 'light' ? '#fef2f2' : 'rgba(239, 68, 68, 0.1)')
                  : (theme === 'light' ? '#f8fafc' : 'rgba(255,255,255,0.03)'),
                border: isAddUsernameDuplicate || isAddPhoneDuplicate || isAddLineOADuplicate || hasAddUsernameSpace || isAddReferrerInvalid
                  ? '1px solid rgba(239, 68, 68, 0.3)' 
                  : (theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.06)'),
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '12.5px',
                color: isAddUsernameDuplicate || isAddPhoneDuplicate || isAddLineOADuplicate || hasAddUsernameSpace || isAddReferrerInvalid
                  ? (theme === 'light' ? '#b91c1c' : '#fca5a5') 
                  : (theme === 'light' ? '#64748b' : '#94a3b8'),
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                <span>
                  {isAddUsernameDuplicate 
                    ? (lang === 'TH' ? `ยูสเซอร์ "${formUsername.trim()}" ซ้ำกับลูกค้าเดิมในระบบ ไม่สามารถบันทึกได้` : `Username "${formUsername.trim()}" already exists.`)
                    : isAddPhoneDuplicate
                      ? (lang === 'TH' ? `เบอร์โทร "${formPhone.trim()}" ซ้ำกับลูกค้าเดิมในระบบ` : `Phone "${formPhone.trim()}" already exists.`)
                      : isAddLineOADuplicate
                        ? (lang === 'TH' ? `ไลน์ "${formLineOA.trim()}" ซ้ำกับลูกค้าเดิมในระบบ` : `LINE ID "${formLineOA.trim()}" already exists.`)
                        : hasAddUsernameSpace 
                          ? (lang === 'TH' ? 'ยูสเซอร์เนมห้ามมีเว้นวรรค' : 'Username cannot contain spaces.')
                          : (isReferrerSource && isReferrerNotFound)
                            ? (lang === 'TH' ? `ไม่พบยูสเซอร์เพื่อนที่แนะนำ "${formReferrer.trim()}"` : `Referrer user not found.`)
                            : (lang === 'TH' ? `ยังไม่สามารถบันทึกได้: ขาด ${[isAddFullNameEmpty && 'ชื่อ-นามสกุล', isAddUsernameEmpty && 'ยูสเซอร์', isAddPhoneEmpty && 'เบอร์ติดต่อ', isAddLineOAEmpty && 'ไลน์', (isReferrerSource && isReferrerEmpty) && 'ยูสเซอร์ผู้แนะนำ'].filter(Boolean).join(', ')}` : `Cannot save yet: Missing required fields`)}
                </span>
              </div>
            )}
          </div>
        </form>
      </div>
      )}

      {/* TAB 2: Bulk Import (Excel / CSV) - Supervisor Only */}
      {hasSupervisorAccess && activeTab === 'bulk' && (
        <div className="panel" style={{ maxWidth: bulkPreviewRows ? '1280px' : '860px', margin: '0 auto', width: '100%' }}>
          <div className="panel-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 className="panel-title" style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <FileSpreadsheet style={{ color: '#10b981' }} /> {lang === 'TH' ? 'นำเข้ารายชื่อลูกค้าใหม่จากไฟล์ Excel / CSV' : 'Bulk Lead Import (Excel / CSV)'}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                {lang === 'TH' ? 'อัปโหลดไฟล์นำเข้ารายชื่อลูกค้าใหม่เข้าพอร์ตพร้อมกัน ตรวจจับเบอร์ซ้ำและกระจายเคสให้อัตโนมัติ' : 'Import bulk leads from Excel/CSV with auto duplicate detection & lead distribution.'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => downloadLeadTemplate('xlsx')}
                className="btn btn-secondary"
                style={{ padding: '7px 13px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                title={lang === 'TH' ? 'ดาวน์โหลดไฟล์ตัวอย่าง Excel (.xlsx)' : 'Download Excel Template'}
              >
                <Download size={14} style={{ color: '#34d399' }} />
                <span>{lang === 'TH' ? 'โหลดตัวอย่าง (.xlsx)' : 'Template (.xlsx)'}</span>
              </button>
              <button
                type="button"
                onClick={() => downloadLeadTemplate('csv')}
                className="btn btn-secondary"
                style={{ padding: '7px 13px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                title={lang === 'TH' ? 'ดาวน์โหลดไฟล์ตัวอย่าง CSV' : 'Download CSV Template'}
              >
                <Download size={14} style={{ color: '#38bdf8' }} />
                <span>{lang === 'TH' ? 'โหลดตัวอย่าง (.csv)' : 'Template (.csv)'}</span>
              </button>
            </div>
          </div>

          <input
            ref={bulkFileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleBulkFileUpload}
            style={{ display: 'none' }}
          />

          {!bulkPreviewRows ? (
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Drag & Drop Upload Zone */}
              <div
                onClick={() => bulkFileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleBulkFileUpload({ target: { files: e.dataTransfer.files } });
                  }
                }}
                style={{
                  border: '2px dashed rgba(16, 185, 129, 0.45)',
                  borderRadius: '16px',
                  padding: '44px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: theme === 'light' ? '#f0fdf4' : 'rgba(16, 185, 129, 0.03)',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <div style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 24px rgba(16, 185, 129, 0.25)'
                }}>
                  <UploadCloud size={34} />
                </div>
                <div>
                  <h4 style={{ fontSize: '16.5px', fontWeight: 700, margin: 0, color: theme === 'light' ? '#0f172a' : '#ffffff' }}>
                    {lang === 'TH' ? 'คลิกเลือกไฟล์ หรือลากไฟล์ Excel / CSV มาวางที่นี่' : 'Click to upload or drag & drop Excel / CSV here'}
                  </h4>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '6px', marginBottom: 0 }}>
                    {lang === 'TH' ? 'รองรับไฟล์นามสกุล .xlsx, .xls และ .csv (ระบบจะตรวจสอบความถูกต้องและพรีวิวก่อนบันทึก)' : 'Supports .xlsx, .xls, .csv files. Automatic validation & preview before saving.'}
                  </p>
                </div>
              </div>

              {/* Guidelines Box */}
              <div style={{
                background: theme === 'light' ? '#f8fafc' : 'rgba(255,255,255,0.02)',
                border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.06)',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '12.5px'
              }}>
                <div style={{ fontWeight: 700, color: theme === 'light' ? '#0f172a' : '#ffffff', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <Info size={16} style={{ color: '#38bdf8' }} />
                  <span>{lang === 'TH' ? 'คำแนะนำคอลัมน์ในไฟล์ที่ระบบตรวจจับอัตโนมัติ (ทั้งภาษาไทย & อังกฤษ):' : 'Supported Columns Guide:'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '8px', color: 'var(--text-muted)' }}>
                  <div>• <strong style={{ color: theme === 'light' ? '#0f172a' : '#ffffff' }}>ชื่อ-นามสกุล (full_name)</strong> <span style={{ color: '#ef4444' }}>*จำเป็น</span></div>
                  <div>• <strong style={{ color: theme === 'light' ? '#0f172a' : '#ffffff' }}>เบอร์โทรศัพท์ (phone)</strong> <span style={{ color: '#ef4444' }}>*จำเป็น (9-10 หลัก)</span></div>
                  <div>• <strong style={{ color: theme === 'light' ? '#0f172a' : '#ffffff' }}>ยูสเซอร์เนม (username)</strong> (ไม่บังคับ ลูกค้ายังไม่สมัครเว้นว่างได้)</div>
                  <div>• <strong style={{ color: theme === 'light' ? '#0f172a' : '#ffffff' }}>LINE OA (line_oa)</strong> (ไม่บังคับ หรือใส่ -)</div>
                  <div>• <strong style={{ color: theme === 'light' ? '#0f172a' : '#ffffff' }}>สถานะไลน์เล็ก (line_lek)</strong> ('มี' / 'รอแอด' / 'ไม่มี')</div>
                  <div>• <strong style={{ color: theme === 'light' ? '#0f172a' : '#ffffff' }}>ช่องทางสมัคร (source_channel)</strong> (facebook / line / tiktok ฯลฯ)</div>
                  <div>• <strong style={{ color: theme === 'light' ? '#0f172a' : '#ffffff' }}>หมายเหตุ (notes)</strong> (โน้ตเริ่มต้น)</div>
                  <div>• <strong style={{ color: theme === 'light' ? '#0f172a' : '#ffffff' }}>ผู้รับผิดชอบ (created_by)</strong> (ระบุชื่อพนักงานเฉพาะเจาะจงได้)</div>
                </div>
              </div>

              {/* Pre-upload Distribution Preference Card */}
              <div style={{
                background: theme === 'light' ? '#f0fdf4' : 'rgba(16, 185, 129, 0.04)',
                border: theme === 'light' ? '1px solid #bbf7d0' : '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '13px', color: theme === 'light' ? '#0f172a' : '#ffffff' }}>
                    <Users size={16} style={{ color: '#10b981' }} />
                    <span>{lang === 'TH' ? 'ตั้งค่าการกระจายงานล่วงหน้าสำหรับไฟล์นี้:' : 'Pre-set Lead Distribution Mode:'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setBulkAssignMode('single')}
                      className={`btn ${bulkAssignMode === 'single' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '6px 12px', fontSize: '11.5px', borderRadius: '8px' }}
                    >
                      👤 {lang === 'TH' ? 'กำหนดให้พนักงานคนเดียว' : 'Single Agent'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkAssignMode('round_robin')}
                      className={`btn ${bulkAssignMode === 'round_robin' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '6px 12px', fontSize: '11.5px', borderRadius: '8px', color: bulkAssignMode === 'round_robin' ? '#ffffff' : '#38bdf8' }}
                    >
                      🔄 {lang === 'TH' ? 'กระจายเฉลี่ยเท่าๆ กัน' : 'Round-Robin'}
                    </button>
                  </div>
                </div>

                {bulkAssignMode === 'single' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{lang === 'TH' ? 'เลือกผู้รับผิดชอบหลัก:' : 'Select Agent:'}</span>
                    <select
                      value={bulkTargetAgent || activeAgentName}
                      onChange={(e) => setBulkTargetAgent(e.target.value)}
                      className="select-input"
                      style={{ fontSize: '12px', padding: '6px 12px', minWidth: '180px' }}
                    >
                      {agents.filter(a => a.isActive !== false && !a.isArchived).map(a => (
                        <option key={a.id} value={a.name}>👤 {a.name} ({a.role || 'Agent'})</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={14} />
                    <span>{lang === 'TH' ? `เปิดโหมดกระจายเฉลี่ยอัตโนมัติให้พนักงาน ${effectiveRoundRobinAgents.length} คน (สามารถเลือกพนักงานที่เข้าร่วมได้หลังเลือกไฟล์)` : `Round-robin enabled across ${effectiveRoundRobinAgents.length} agents.`}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* File Info Bar */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
                padding: '12px 16px',
                borderRadius: '10px',
                background: theme === 'light' ? '#f1f5f9' : 'rgba(255,255,255,0.03)',
                border: theme === 'light' ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                    <FileSpreadsheet size={22} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: theme === 'light' ? '#0f172a' : '#ffffff' }}>
                      {bulkFileName}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      {lang === 'TH' ? `ขนาดไฟล์ ${bulkFileSize} • ทั้งหมด ${bulkPreviewRows.length} รายการ` : `Size: ${bulkFileSize} • Total: ${bulkPreviewRows.length} rows`}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => bulkFileInputRef.current?.click()}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <RefreshCw size={14} />
                  <span>{lang === 'TH' ? 'เปลี่ยนไฟล์ใหม่' : 'Change File'}</span>
                </button>
              </div>

              {/* Assignment & Date Settings */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '16px',
                padding: '16px',
                borderRadius: '12px',
                background: theme === 'light' ? '#ffffff' : 'rgba(255,255,255,0.02)',
                border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.06)'
              }}>
                {/* Registration Date */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>{lang === 'TH' ? '📅 วันที่คีย์งาน (Registration Date)' : 'Registration Date'}</label>
                  <input
                    type="date"
                    value={bulkRegistrationDate}
                    onChange={(e) => setBulkRegistrationDate(e.target.value)}
                  />
                </div>

                {/* Assignment Mode: Single vs Round-Robin */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{lang === 'TH' ? '👥 การกระจายงานให้พนักงาน (Lead Distribution):' : 'Lead Assignment Mode:'}</span>
                  </label>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Toggle Mode Buttons */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setBulkAssignMode('single')}
                        className={`btn ${bulkAssignMode === 'single' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '7px 10px', fontSize: '12px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <User size={13} />
                        <span>{lang === 'TH' ? 'กำหนดให้คนเดียว' : 'Single Agent'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkAssignMode('round_robin')}
                        className={`btn ${bulkAssignMode === 'round_robin' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '7px 10px', fontSize: '12px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: bulkAssignMode === 'round_robin' ? '#ffffff' : '#38bdf8' }}
                      >
                        <RefreshCw size={13} />
                        <span>{lang === 'TH' ? 'กระจายเฉลี่ยเท่าๆ กัน' : 'Round-Robin'}</span>
                      </button>
                    </div>

                    {/* Mode 1: Single Agent Select */}
                    {bulkAssignMode === 'single' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <select
                          value={bulkTargetAgent || activeAgentName}
                          onChange={(e) => setBulkTargetAgent(e.target.value)}
                          className="select-input"
                          style={{ width: '100%', fontSize: '13px', padding: '8px 12px' }}
                        >
                          {agents.filter(a => a.isActive !== false && !a.isArchived).map(a => (
                            <option key={a.id} value={a.name}>
                              👤 {a.name} ({a.role || 'Agent'})
                            </option>
                          ))}
                        </select>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {lang === 'TH' 
                            ? `* มอบหมายให้คุณ [${bulkTargetAgent || activeAgentName}] ทั้งหมด (${readyToImportCount} คน)` 
                            : `All leads will be assigned to ${bulkTargetAgent || activeAgentName}`}
                        </span>
                      </div>
                    ) : (
                      /* Mode 2: Round Robin Multi-Select & Live Breakdown */
                      <div style={{
                        padding: '10px 12px',
                        background: theme === 'light' ? '#f0fdf4' : 'rgba(56, 189, 248, 0.05)',
                        border: theme === 'light' ? '1px solid #bbf7d0' : '1px solid rgba(56, 189, 248, 0.2)',
                        borderRadius: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#38bdf8' }}>
                            {lang === 'TH' ? `พนักงานที่เข้าร่วมกระจายเคส (${effectiveRoundRobinAgents.length} คน):` : `Participating Agents (${effectiveRoundRobinAgents.length}):`}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedRoundRobinAgents(activeAgentsList.map(a => a.name))}
                            className="btn btn-secondary"
                            style={{ padding: '2px 8px', fontSize: '10.5px' }}
                          >
                            {lang === 'TH' ? '✓ เลือกทุกคน' : 'Select All'}
                          </button>
                        </div>

                        {/* Agent Toggle Pills */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                          {activeAgentsList.map(a => {
                            const isSelected = effectiveRoundRobinAgents.includes(a.name);
                            return (
                              <button
                                key={a.id}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    if (effectiveRoundRobinAgents.length <= 1) {
                                      alert(lang === 'TH' ? 'ต้องเลือกพนักงานอย่างน้อย 1 คน' : 'At least one agent must be selected');
                                      return;
                                    }
                                    setSelectedRoundRobinAgents(effectiveRoundRobinAgents.filter(n => n !== a.name));
                                  } else {
                                    setSelectedRoundRobinAgents([...effectiveRoundRobinAgents, a.name]);
                                  }
                                }}
                                style={{
                                  padding: '3px 9px',
                                  borderRadius: '16px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  border: isSelected ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                                  background: isSelected ? (theme === 'light' ? '#dcfce7' : 'rgba(16, 185, 129, 0.2)') : (theme === 'light' ? '#f1f5f9' : 'rgba(255,255,255,0.04)'),
                                  color: isSelected ? (theme === 'light' ? '#15803d' : '#34d399') : 'var(--text-muted)',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                {isSelected ? '✓ ' : '+ '} {a.name}
                              </button>
                            );
                          })}
                        </div>

                        {/* Live Expected Distribution Breakdown */}
                        {readyToImportCount > 0 && (
                          <div style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '6px', marginTop: '2px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                              {lang === 'TH' ? `📊 สรุปจำนวนเคสเฉลี่ยที่แต่ละคนจะได้รับ (รวม ${readyToImportCount} คน):` : `Expected Distribution:`}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                              {distributionSummary.map((item, idx) => (
                                <span 
                                  key={idx} 
                                  style={{ 
                                    fontSize: '10.5px', 
                                    padding: '2px 7px', 
                                    borderRadius: '6px', 
                                    background: theme === 'light' ? '#ffffff' : 'rgba(255,255,255,0.06)',
                                    border: theme === 'light' ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.1)',
                                    fontWeight: 600,
                                    color: item.count > 0 ? (theme === 'light' ? '#0f172a' : '#ffffff') : 'var(--text-muted)'
                                  }}
                                >
                                  {item.name}: <strong style={{ color: '#10b981' }}>{item.count} คน</strong>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Statistics Badges */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                <div style={{ padding: '10px 14px', borderRadius: '10px', background: theme === 'light' ? '#f8fafc' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{lang === 'TH' ? 'รายการทั้งหมด' : 'Total Rows'}</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: theme === 'light' ? '#0f172a' : '#ffffff' }}>{bulkStats.total}</div>
                </div>
                <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  <div style={{ fontSize: '11px', color: '#34d399' }}>{lang === 'TH' ? '🟢 พร้อมนำเข้า' : '🟢 Ready'}</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#34d399' }}>{bulkStats.valid}</div>
                </div>
                <div 
                  onClick={() => {
                    if (bulkStats.sysDuplicates > 0) {
                      setDuplicateModalData({
                        fileName: bulkFileName,
                        totalRows: bulkPreviewRows.length,
                        duplicates: bulkPreviewRows.filter(r => r.hasSystemDuplicate)
                      });
                    }
                  }}
                  style={{ 
                    padding: '10px 14px', 
                    borderRadius: '10px', 
                    background: bulkStats.sysDuplicates > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.1)', 
                    border: bulkStats.sysDuplicates > 0 ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(245, 158, 11, 0.3)',
                    cursor: bulkStats.sysDuplicates > 0 ? 'pointer' : 'default',
                    transition: 'all 0.2s ease'
                  }}
                  title={bulkStats.sysDuplicates > 0 ? (lang === 'TH' ? 'คลิกเพื่อเปิดหน้าต่างดูรายการที่ซ้ำในระบบ' : 'Click to view system duplicates') : undefined}
                >
                  <div style={{ fontSize: '11px', color: bulkStats.sysDuplicates > 0 ? '#f87171' : '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{lang === 'TH' ? (bulkStats.sysDuplicates > 0 ? '⚠️ ซ้ำในระบบ (เด้งดู)' : '🟡 พบข้อมูลซ้ำ') : 'Duplicates'}</span>
                    {bulkStats.sysDuplicates > 0 && <span style={{ fontSize: '10px', textDecoration: 'underline' }}>{lang === 'TH' ? 'คลิกดู' : 'View'}</span>}
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: bulkStats.sysDuplicates > 0 ? '#f87171' : '#fbbf24' }}>
                    {bulkStats.warning} {bulkStats.sysDuplicates > 0 ? `(${bulkStats.sysDuplicates} ซ้ำเดิม)` : ''}
                  </div>
                </div>
                <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  <div style={{ fontSize: '11px', color: '#f87171' }}>{lang === 'TH' ? '🔴 ข้อมูลไม่ครบ' : '🔴 Invalid'}</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#f87171' }}>{bulkStats.error}</div>
                </div>
              </div>

              {/* Filters & Skip Option */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginTop: '4px' }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{lang === 'TH' ? 'ตัวกรองตาราง:' : 'Filter:'}</span>
                  <button
                    type="button"
                    onClick={() => setBulkFilter('ALL')}
                    className={`btn ${bulkFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '4px 8px', fontSize: '11px' }}
                  >
                    {lang === 'TH' ? `ทั้งหมด (${bulkStats.total})` : `All (${bulkStats.total})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkFilter('VALID')}
                    className={`btn ${bulkFilter === 'VALID' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '4px 8px', fontSize: '11px', color: '#34d399' }}
                  >
                    {lang === 'TH' ? `เฉพาะที่พร้อมนำเข้า (${bulkStats.valid})` : `Valid (${bulkStats.valid})`}
                  </button>
                  {bulkStats.sysDuplicates > 0 && (
                    <button
                      type="button"
                      onClick={() => setBulkFilter('SYS_DUP')}
                      className={`btn ${bulkFilter === 'SYS_DUP' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '4px 8px', fontSize: '11px', color: '#f87171', borderColor: 'rgba(239,68,68,0.4)' }}
                    >
                      {lang === 'TH' ? `⚠️ ซ้ำในระบบ (${bulkStats.sysDuplicates})` : `Sys Dups (${bulkStats.sysDuplicates})`}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setBulkFilter('ISSUES')}
                    className={`btn ${bulkFilter === 'ISSUES' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '4px 8px', fontSize: '11px', color: '#fbbf24' }}
                  >
                    {lang === 'TH' ? `เฉพาะที่มีข้อสังเกต (${bulkStats.warning + bulkStats.error})` : `Issues (${bulkStats.warning + bulkStats.error})`}
                  </button>
                  {bulkStats.sysDuplicates > 0 && (
                    <button
                      type="button"
                      onClick={() => setDuplicateModalData({
                        fileName: bulkFileName,
                        totalRows: bulkPreviewRows.length,
                        duplicates: bulkPreviewRows.filter(r => r.hasSystemDuplicate)
                      })}
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '11px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}
                      title={lang === 'TH' ? 'คลิกเพื่อเปิดหน้าต่างสรุปรายการที่ซ้ำในระบบ' : 'Open Duplicate Alert Window'}
                    >
                      <AlertTriangle size={13} />
                      <span>{lang === 'TH' ? '🔔 เปิดดูแจ้งเตือนซ้ำ' : 'View Duplicate Alert'}</span>
                    </button>
                  )}
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={skipIssues}
                    onChange={(e) => setSkipIssues(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>{lang === 'TH' ? 'ข้ามแถวที่ซ้ำหรือมีปัญหาโดยอัตโนมัติ (นำเข้าเฉพาะแถวที่ผ่านเกณฑ์)' : 'Auto-skip duplicates and invalid rows'}</span>
                </label>
              </div>

              {/* Preview Table */}
              <div className="table-wrapper" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>#</th>
                      <th>{lang === 'TH' ? 'สถานะ' : 'Status'}</th>
                      <th>{lang === 'TH' ? 'ชื่อ-นามสกุล' : 'Full Name'}</th>
                      <th>{lang === 'TH' ? 'ยูสเซอร์' : 'Username'}</th>
                      <th>{lang === 'TH' ? 'เบอร์ติดต่อ' : 'Phone'}</th>
                      <th>{lang === 'TH' ? 'LINE OA' : 'LINE OA'}</th>
                      <th>{lang === 'TH' ? 'ไลน์เล็ก' : 'LINE Lek'}</th>
                      <th>{lang === 'TH' ? 'ช่องทาง' : 'Source'}</th>
                      <th>{lang === 'TH' ? 'ผู้รับผิดชอบ' : 'Assigned Agent'}</th>
                      <th>{lang === 'TH' ? 'รายละเอียด / ข้อสังเกต' : 'Issues / Notes'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBulkRows.length === 0 ? (
                      <tr>
                        <td colSpan="10" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                          {lang === 'TH' ? 'ไม่พบข้อมูลตามตัวกรองที่เลือก' : 'No rows match filter.'}
                        </td>
                      </tr>
                    ) : (
                      filteredBulkRows.map((row, idx) => {
                        let willBeAssigned = bulkTargetAgent || activeAgentName || 'Agent';
                        if (bulkAssignMode === 'round_robin' && effectiveRoundRobinAgents.length > 0) {
                          willBeAssigned = effectiveRoundRobinAgents[idx % effectiveRoundRobinAgents.length];
                        }
                        if (row.agentInRow && agents.some(a => a.name === row.agentInRow)) {
                          willBeAssigned = row.agentInRow;
                        }

                        return (
                          <tr key={idx} style={{ background: row.hasError ? 'rgba(239, 68, 68, 0.05)' : (row.hasSystemDuplicate ? 'rgba(239, 68, 68, 0.04)' : (row.hasWarning ? 'rgba(245, 158, 11, 0.03)' : undefined)) }}>
                            <td style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{row.rowIndex}</td>
                            <td>
                              {row.isValid ? (
                                <span className="badge badge-saved" style={{ fontSize: '11px' }}>🟢 {lang === 'TH' ? 'พร้อมนำเข้า' : 'Ready'}</span>
                              ) : row.hasError ? (
                                <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '11px' }}>🔴 {lang === 'TH' ? 'ไม่ครบถ้วน' : 'Invalid'}</span>
                              ) : row.hasSystemDuplicate ? (
                                <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '11px' }}>⚠️ {lang === 'TH' ? 'ซ้ำในระบบ' : 'Sys Duplicate'}</span>
                              ) : (
                                <span className="badge badge-pending" style={{ fontSize: '11px' }}>🟡 {lang === 'TH' ? 'ซ้ำในไฟล์' : 'Duplicate'}</span>
                              )}
                            </td>
                            <td><strong style={{ color: theme === 'light' ? '#0f172a' : '#ffffff' }}>{row.fullName || '-'}</strong></td>
                            <td>
                              {row.username ? (
                                <span style={{ color: '#38bdf8', fontWeight: 600 }}>{row.username}</span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{lang === 'TH' ? '(ยังไม่สมัคร)' : '(Not Reg)'}</span>
                              )}
                            </td>
                            <td>
                              <span style={{ fontWeight: 600, color: row.cleanPhone.length >= 9 ? undefined : '#ef4444' }}>
                                {row.phone || '-'}
                              </span>
                            </td>
                            <td><span style={{ color: '#34d399' }}>{row.lineOA}</span></td>
                            <td>
                              {row.lineLek === 'มี' ? (
                                <span className="badge badge-saved">🟢 มี</span>
                              ) : row.lineLek === 'ไม่มี' ? (
                                <span className="badge">⚪ ไม่มี</span>
                              ) : (
                                <span className="badge badge-pending">🟡 รอแอด</span>
                              )}
                            </td>
                            <td>
                              <span className="badge" style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.3)', fontSize: '11px' }}>
                                {formatChannelDisplayName(row.sourceChannel, lang)}
                              </span>
                            </td>
                            <td>
                              <span className="badge badge-owner" style={{ fontSize: '11px' }}>
                                <User size={12} />
                                <span>{willBeAssigned}</span>
                              </span>
                            </td>
                            <td>
                              {row.systemDuplicates && row.systemDuplicates.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '4px' }}>
                                  {row.systemDuplicates.map((dup, i) => (
                                    <div key={i} style={{ padding: '3px 6px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)', fontSize: '11px', color: '#f87171' }}>
                                      <strong>{dup.fieldIcon} {dup.fieldLabel}ซ้ำ:</strong> {dup.importValue}
                                      <div style={{ color: 'var(--text-muted)', fontSize: '10.5px' }}>
                                        (ตรงกับ: {dup.matchedCustomer.fullName} {dup.matchedCustomer.createdBy ? `• ผู้ดูแล: ${dup.matchedCustomer.createdBy}` : ''})
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {row.issues.filter(iss => !iss.type.startsWith('DUP_SYS_')).length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  {row.issues.filter(iss => !iss.type.startsWith('DUP_SYS_')).map((iss, i) => (
                                    <span key={i} style={{ fontSize: '11px', color: iss.severity === 'error' ? '#ef4444' : '#f59e0b', fontWeight: 500 }}>
                                      {iss.severity === 'error' ? '❌' : '⚠️'} {iss.label}
                                    </span>
                                  ))}
                                </div>
                              ) : (!row.systemDuplicates || row.systemDuplicates.length === 0) ? (
                                <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{row.notes || '-'}</span>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Execution Actions Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button
                  type="button"
                  onClick={() => {
                    setBulkPreviewRows(null);
                    setBulkFileName('');
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '10px 16px', fontSize: '13px' }}
                >
                  <Trash2 size={15} />
                  <span>{lang === 'TH' ? 'ยกเลิก / ล้างไฟล์' : 'Cancel / Clear'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExecuteBulkImport}
                  disabled={readyToImportCount === 0 || isImportingBulk}
                  className={`btn ${readyToImportCount === 0 || isImportingBulk ? 'disabled' : 'btn-primary'}`}
                  style={{
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: 700,
                    borderRadius: '10px',
                    boxShadow: readyToImportCount > 0 ? '0 4px 16px rgba(16, 185, 129, 0.4)' : 'none',
                    background: readyToImportCount > 0 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : undefined,
                    color: '#ffffff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: readyToImportCount === 0 || isImportingBulk ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isImportingBulk ? (
                    <>
                      <RefreshCw size={16} className="spin-slow" />
                      <span>{lang === 'TH' ? 'กำลังบันทึกลงระบบ...' : 'Importing leads...'}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      <span>
                        {lang === 'TH' 
                          ? `ยืนยันนำเข้ารายชื่อลูกค้า (${readyToImportCount} คน) เข้าสู่ระบบ` 
                          : `Confirm Import (${readyToImportCount} Leads)`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recently Added Log */}
      <div className="panel" style={{ marginTop: '24px' }}>
        <div className="panel-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
          <h3 className="panel-title" style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History style={{ color: 'var(--primary)' }} /> {lang === 'TH' ? 'ประวัติรายการที่เพิ่มเข้าไป (Recently Added Log)' : 'Recently Added Customers Log'}
          </h3>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '-8px' }}>
          {lang === 'TH' ? `แสดงรายชื่อลูกค้าที่เพิ่มเข้าพอร์ตงานประจำรอบเดือน ${selectedMonth} (รวม ${recentCustomers.length} รายการ)` : `Displaying customers added to portfolio for month ${selectedMonth} (Total: ${recentCustomers.length})`}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '12px 0 10px 0' }}>
          {/* Status Filter */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{lang === 'TH' ? '📌 กรองตามสถานะ:' : '📌 Filter Status:'}</span>
            <button className={`btn ${statusFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => setStatusFilter('ALL')}>
              {lang === 'TH' ? 'ทั้งหมด' : 'All'}
            </button>
            <button className={`btn ${statusFilter === 'NOT_REGISTERED' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '4px 10px', fontSize: '11px', color: '#fbbf24' }} onClick={() => setStatusFilter('NOT_REGISTERED')}>
              {lang === 'TH' ? '🟠 ทักไม่สมัคร' : '🟠 Inquired (Not Reg)'}
            </button>
            <button className={`btn ${statusFilter === 'REGISTERED' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '4px 10px', fontSize: '11px', color: '#38bdf8' }} onClick={() => setStatusFilter('REGISTERED')}>
              {lang === 'TH' ? '🔵 ทักสมัคร' : '🔵 Registered'}
            </button>
            <button className={`btn ${statusFilter === 'DEPOSITED' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '4px 10px', fontSize: '11px', color: '#34d399' }} onClick={() => setStatusFilter('DEPOSITED')}>
              {lang === 'TH' ? '🟢 สมัครและฝาก' : '🟢 Reg & Deposited'}
            </button>
            <button className={`btn ${statusFilter === 'NOT_DEPOSITED' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '4px 10px', fontSize: '11px', color: '#f43f5e' }} onClick={() => setStatusFilter('NOT_DEPOSITED')}>
              {lang === 'TH' ? '🔴 สมัครไม่ฝาก' : '🔴 Reg (No Deposit)'}
            </button>
          </div>

          {/* Line Lek Status Filter */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{lang === 'TH' ? '💬 กรองสถานะไลน์เล็ก:' : '💬 Filter LINE Lek:'}</span>
            <button className={`btn ${lineLekFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => setLineLekFilter('ALL')}>
              {lang === 'TH' ? 'ทั้งหมด' : 'All'}
            </button>
            <button className={`btn ${lineLekFilter === 'HAS' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '4px 10px', fontSize: '11px', color: '#34d399' }} onClick={() => setLineLekFilter('HAS')}>
              {lang === 'TH' ? '🟢 มีไลน์' : '🟢 Has LINE'}
            </button>
            <button className={`btn ${lineLekFilter === 'WAITING' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '4px 10px', fontSize: '11px', color: '#fbbf24' }} onClick={() => setLineLekFilter('WAITING')}>
              {lang === 'TH' ? '🟡 รอแอด' : '🟡 Pending Add'}
            </button>
            <button className={`btn ${lineLekFilter === 'NONE' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '4px 10px', fontSize: '11px', color: '#f43f5e' }} onClick={() => setLineLekFilter('NONE')}>
              {lang === 'TH' ? '🔴 ไม่มีไลน์' : '🔴 No LINE'}
            </button>
          </div>
        </div>

        <div className="table-wrapper" style={{ marginTop: '12px' }}>
          <table>
            <thead>
              <tr>
                <th>{lang === 'TH' ? 'ชื่อ-นามสกุล' : 'Full Name'}</th>
                <th>{lang === 'TH' ? 'ยูสเซอร์ลูกค้า' : 'Username'}</th>
                <th style={{ whiteSpace: 'nowrap' }}>{lang === 'TH' ? 'วัน-เวลาที่คีย์ข้อมูล' : 'Date & Time Added'}</th>
                <th>{lang === 'TH' ? 'ข้อมูลการติดต่อ' : 'Contact Info'}</th>
                <th>{lang === 'TH' ? 'สถานะไลน์เล็ก' : 'LINE Lek Status'}</th>
                <th>{lang === 'TH' ? 'ช่องทาง' : 'Source'}</th>
                <th>{lang === 'TH' ? 'ผู้รับผิดชอบ (Owner)' : 'Assigned Owner'}</th>
                <th>{lang === 'TH' ? 'โน้ตเริ่มต้น' : 'Initial Note'}</th>
              </tr>
            </thead>
            <tbody>
              {recentCustomers.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                    {lang === 'TH' ? 'ไม่พบประวัติข้อมูลลูกค้าในเงื่อนไขการกรองนี้' : 'No customer records found matching this filter.'}
                  </td>
                </tr>
              ) : (
                recentCustomers.map(cust => (
                  <tr key={cust.id}>
                    <td><strong style={{ color: theme === 'light' ? '#0f172a' : '#ffffff', fontWeight: 700 }}>{cust.fullName || '-'}</strong></td>
                    <td>
                      {cust.username ? (
                        <strong style={{ color: theme === 'light' ? '#0f172a' : '#ffffff' }}>{cust.username}</strong>
                      ) : (
                        <span style={{ color: '#fbbf24', fontSize: '11px', fontWeight: 600 }}>{lang === 'TH' ? '(ยังไม่สมัคร)' : '(Not Reg)'}</span>
                      )}
                    </td>
                    <td>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: theme === 'light' ? 'rgba(56, 189, 248, 0.08)' : 'rgba(56, 189, 248, 0.12)',
                        border: theme === 'light' ? '1px solid rgba(56, 189, 248, 0.25)' : '1px solid rgba(56, 189, 248, 0.3)',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        whiteSpace: 'nowrap'
                      }}>
                        <Calendar style={{ width: '12px', height: '12px', color: '#38bdf8', flexShrink: 0 }} />
                        <span style={{ fontSize: '11.5px', fontWeight: 600, color: theme === 'light' ? '#0284c7' : '#7dd3fc' }}>
                          {formatKeyedDateTime(cust.createdAt)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px' }}>
                        {cust.phone && <span>📞 {cust.phone}</span>}
                        {cust.lineOA && <span style={{ color: '#34d399' }}>💬 {cust.lineOA}</span>}
                      </div>
                    </td>
                    <td>
                      {cust.lineLek === 'มี' || cust.lineLek === 'มีไลน์เล็ก' ? (
                        <span className="badge badge-saved">🟢 {lang === 'TH' ? 'มี' : 'Has LINE'}</span>
                      ) : cust.lineLek === 'ไม่มี' || cust.lineLek === 'ไม่มีไลน์เล็ก' ? (
                        <span className="badge" style={{ background: theme === 'light' ? '#f1f5f9' : 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>⚪ {lang === 'TH' ? 'ไม่มี' : 'No LINE'}</span>
                      ) : (
                        <span className="badge badge-pending">🟡 {lang === 'TH' ? 'รอแอด' : 'Pending'}</span>
                      )}
                    </td>
                    <td>
                      <span className="badge" style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.3)' }}>
                        {formatChannelDisplayName(cust.sourceChannel, lang)}
                      </span>
                    </td>
                    <td>
                      {cust.createdBy ? (
                        <span className="badge badge-owner">
                          <User style={{ width: '13px', height: '13px', flexShrink: 0 }} />
                          <span>{cust.createdBy}</span>
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>-</span>
                      )}
                    </td>
                    <td style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cust.notes || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DUPLICATE DETECTION ALERT MODAL (เด้งแจ้งเตือนทันทีเมื่อพบรายการซ้ำกับฐานข้อมูล) */}
      {duplicateModalData && typeof document !== 'undefined' && createPortal(
        <div 
          className="modal-overlay" 
          style={{ zIndex: 1400 }} 
          onClick={() => setDuplicateModalData(null)}
        >
          <div 
            className="modal-content" 
            style={{ maxWidth: '840px', width: '92%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px' }} 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '2px solid rgba(245, 158, 11, 0.4)',
                  color: '#fbbf24',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 0 20px rgba(245, 158, 11, 0.25)'
                }}>
                  <AlertTriangle size={26} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: theme === 'light' ? '#0f172a' : '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{lang === 'TH' ? 'ตรวจพบข้อมูลซ้ำกับฐานข้อมูลเดิมในระบบ!' : 'Duplicate Records Detected in Database!'}</span>
                    <span style={{ fontSize: '12px', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '2px 8px', borderRadius: '12px' }}>
                      {duplicateModalData.duplicates.length} {lang === 'TH' ? 'รายการ' : 'records'}
                    </span>
                  </h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                    {lang === 'TH' 
                      ? `ระบบตรวจพบว่ามีเบอร์โทรศัพท์, ยูสเซอร์ หรือ LINE OA ในไฟล์ [${duplicateModalData.fileName}] ตรงกับลูกค้าที่มีอยู่ในระบบแล้ว รายการเหล่านี้จะไม่ถูกบันทึกซ้ำซ้อน`
                      : `Found duplicate phone numbers, usernames, or LINE OA in file [${duplicateModalData.fileName}] matching existing customer records.`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDuplicateModalData(null)}
                className="btn btn-secondary"
                style={{ padding: '6px', borderRadius: '8px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Warning Banner */}
            <div style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: '10px',
              padding: '10px 14px',
              fontSize: '12px',
              color: '#fbbf24',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Info size={16} style={{ flexShrink: 0 }} />
              <span>
                {lang === 'TH' 
                  ? '💡 ระบบได้ตั้งค่า "ข้ามรายการซ้ำอัตโนมัติ" ให้เรียบร้อยแล้ว คุณสามารถตรวจสอบรายการที่ซ้ำด้านล่าง และกดดำเนินการต่อได้ทันที'
                  : '💡 System has auto-skipped these duplicate rows. You can review duplicates below and proceed.'}
              </span>
            </div>

            {/* Duplicate Records Table */}
            <div className="table-wrapper" style={{ maxHeight: '380px', overflowY: 'auto', border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.08)', borderRadius: '10px' }}>
              <table style={{ margin: 0 }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: theme === 'light' ? '#f1f5f9' : '#1e1e2d' }}>
                  <tr>
                    <th style={{ width: '45px' }}>#</th>
                    <th>{lang === 'TH' ? 'ข้อมูลในไฟล์ที่นำเข้า' : 'File Record'}</th>
                    <th>{lang === 'TH' ? 'จุดที่ตรวจพบซ้ำ' : 'Duplicate Type'}</th>
                    <th>{lang === 'TH' ? 'ตรงกับลูกค้าเดิมในฐานข้อมูล' : 'Existing Customer in Database'}</th>
                  </tr>
                </thead>
                <tbody>
                  {duplicateModalData.duplicates.map((item, idx) => (
                    <tr key={idx} style={{ background: 'rgba(245, 158, 11, 0.03)' }}>
                      <td style={{ color: 'var(--text-muted)', fontSize: '11.5px', fontWeight: 600 }}>
                        {item.rowIndex}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <strong style={{ color: theme === 'light' ? '#0f172a' : '#ffffff', fontSize: '13px' }}>
                            {item.fullName || '-'}
                          </strong>
                          <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                            {item.username && <span>🆔 {item.username}</span>}
                            {item.phone && <span>📞 {item.phone}</span>}
                            {item.lineOA && item.lineOA !== '-' && <span>💬 {item.lineOA}</span>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {(item.systemDuplicates || []).map((dup, i) => (
                            <span 
                              key={i} 
                              className="badge" 
                              style={{ 
                                background: 'rgba(239, 68, 68, 0.15)', 
                                color: '#f87171', 
                                border: '1px solid rgba(239, 68, 68, 0.3)', 
                                fontSize: '11px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                width: 'fit-content'
                              }}
                            >
                              <span>{dup.fieldIcon}</span>
                              <strong>{dup.fieldLabel}ซ้ำ:</strong>
                              <span>{dup.importValue}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11.5px' }}>
                          {(item.systemDuplicates || []).map((dup, i) => {
                            const mc = dup.matchedCustomer;
                            return (
                              <div key={i} style={{ padding: '5px 8px', borderRadius: '6px', background: theme === 'light' ? '#f8fafc' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <strong style={{ color: theme === 'light' ? '#0f172a' : '#ffffff' }}>{mc.fullName}</strong>
                                  {mc.username && <span style={{ color: '#38bdf8', fontSize: '11px' }}>({mc.username})</span>}
                                </div>
                                <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  {mc.phone && <span>📞 {mc.phone}</span>}
                                  {mc.createdBy && (
                                    <span style={{ color: '#c084fc', fontWeight: 600 }}>
                                      👤 ดูแลโดย: {mc.createdBy}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button
                type="button"
                onClick={() => {
                  setBulkFilter('SYS_DUP');
                  setDuplicateModalData(null);
                }}
                className="btn btn-secondary"
                style={{ padding: '9px 16px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Filter size={15} />
                <span>{lang === 'TH' ? 'ดูเฉพาะรายการซ้ำในตารางพรีวิว' : 'Filter Duplicate Rows in Preview'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSkipIssues(true);
                  setDuplicateModalData(null);
                }}
                className="btn btn-primary"
                style={{
                  padding: '10px 20px',
                  fontSize: '13px',
                  fontWeight: 700,
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                  border: 'none',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <CheckCircle2 size={16} />
                <span>{lang === 'TH' ? 'รับทราบ / ข้ามรายการที่ซ้ำอัตโนมัติ' : 'Acknowledge & Auto-Skip Duplicates'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export { NewCustomerView };

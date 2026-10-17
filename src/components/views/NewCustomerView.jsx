import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { getTodayLocalDateStr, formatKeyedDateTime } from '../../utils/dateFormatters';
import { formatChannelDisplayName } from '../../utils/customerFormatters';
import { 
  UserPlus, 
  UserCheck, 
  Calendar, 
  Search, 
  History, 
  Lock, 
  AlertCircle, 
  CheckCircle2, 
  User 
} from 'lucide-react';

export default function NewCustomerView() {
  const {
    customers,
    agents,
    activeAgent,
    activeAgentName,
    isSupervisor,
    sourceChannels,
    selectedMonth,
    lang,
    theme,
    setAddConfirmModalData
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

  // History table filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [lineLekFilter, setLineLekFilter] = useState('ALL');

  const nonDeletedCustomers = useMemo(() => {
    return customers.filter(c => !c.deletedAt);
  }, [customers]);

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

  return (
    <div>
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
    </div>
  );
}

export { NewCustomerView };

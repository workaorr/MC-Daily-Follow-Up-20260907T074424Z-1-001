import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { QUICK_REMARK_PRESETS } from '../../constants/presets';
import { formatKeyedDateTime } from '../../utils/dateFormatters';
import { Clock, Edit3, MessageSquare, UserCheck } from 'lucide-react';

export const EditCustomerModal = () => {
    const {
        selectedCustForModal,
        setSelectedCustForModal,
        customers,
        setCustomers,
        agents,
        activeAgentName,
        isSupervisor,
        theme,
        lang,
        supabaseClient,
        writeLog
    } = useApp();

    if (!selectedCustForModal) return null;

    const [fullName, setFullName] = useState(selectedCustForModal.fullName || '');
    const [username, setUsername] = useState(selectedCustForModal.username || '');
    const [phone, setPhone] = useState(selectedCustForModal.phone || '');
    const [lineOA, setLineOA] = useState(selectedCustForModal.lineOA || '');
    const [lineLek, setLineLek] = useState(selectedCustForModal.lineLek || 'รอแอด');
    const [assignedOwner, setAssignedOwner] = useState(selectedCustForModal.createdBy || activeAgentName);
    const [notes, setNotes] = useState(selectedCustForModal.notes || '');

    useEffect(() => {
        setFullName(selectedCustForModal.fullName || '');
        setUsername(selectedCustForModal.username || '');
        setPhone(selectedCustForModal.phone || '');
        setLineOA(selectedCustForModal.lineOA || '');
        setLineLek(selectedCustForModal.lineLek || 'รอแอด');
        setAssignedOwner(selectedCustForModal.createdBy || activeAgentName);
        setNotes(selectedCustForModal.notes || '');
    }, [selectedCustForModal, activeAgentName]);

    const handleSave = () => {
        const fullNameVal = fullName.trim();
        const usernameVal = username.trim().toLowerCase();
        const phoneVal = phone.trim();
        const lineOAVal = lineOA.trim();
        const lineLekVal = lineLek;
        const noteVal = notes.trim();
        const agentVal = assignedOwner;

        // Duplicate username check
        if (usernameVal && customers.some(c => c.id !== selectedCustForModal.id && c.username && c.username.toLowerCase() === usernameVal)) {
            alert(lang === 'TH' 
                ? `⚠️ ไม่สามารถบันทึกได้! ยูสเซอร์เนม "${usernameVal}" ซ้ำกับลูกค้ารายอื่นในระบบแล้ว` 
                : `⚠️ Cannot save! Username "${usernameVal}" already belongs to another customer.`);
            return;
        }

        // Duplicate phone check
        const cleanEditPhone = phoneVal.replace(/\D/g, '');
        if (cleanEditPhone && cleanEditPhone.length >= 8) {
            const dupPhoneCust = customers.find(c => c.id !== selectedCustForModal.id && c.phone && String(c.phone).replace(/\D/g, '') === cleanEditPhone);
            if (dupPhoneCust) {
                alert(lang === 'TH' 
                    ? `⚠️ ไม่สามารถบันทึกได้! เบอร์โทรศัพท์ "${phoneVal}" ซ้ำกับลูกค้ารายอื่นในระบบแล้ว (ของ: ${dupPhoneCust.fullName ? `${dupPhoneCust.fullName} (ยูสเซอร์: ${dupPhoneCust.username || '-'})` : dupPhoneCust.username || 'ในระบบ'})` 
                    : `⚠️ Cannot save! Phone number "${phoneVal}" already belongs to another customer.`);
                return;
            }
        }

        // Duplicate LINE ID check
        const cleanEditLineOA = lineOAVal.toLowerCase().replace(/^@/, '');
        const isEditLineIgnored = !cleanEditLineOA || cleanEditLineOA === '-' || cleanEditLineOA === 'ไม่มี' || cleanEditLineOA === 'none' || cleanEditLineOA === 'n/a';
        if (!isEditLineIgnored && cleanEditLineOA.length >= 2) {
            const dupLineCust = customers.find(c => {
                if (!c || c.id === selectedCustForModal.id || !c.lineOA) return false;
                const cl = String(c.lineOA).trim().toLowerCase().replace(/^@/, '');
                if (!cl || cl === '-' || cl === 'ไม่มี' || cl === 'none' || cl === 'n/a') return false;
                return cl === cleanEditLineOA;
            });
            if (dupLineCust) {
                alert(lang === 'TH' 
                    ? `⚠️ ไม่สามารถบันทึกได้! ไลน์ "${lineOAVal}" ซ้ำกับลูกค้ารายอื่นในระบบแล้ว (ของ: ${dupLineCust.fullName ? `${dupLineCust.fullName} (ยูสเซอร์: ${dupLineCust.username || '-'})` : dupLineCust.username || 'ในระบบ'}) โดย 1 บัญชีไลน์ใช้ได้ 1 ยูสเซอร์เท่านั้นครับ` 
                    : `⚠️ Cannot save! LINE ID "${lineOAVal}" already belongs to another customer.`);
                return;
            }
        }

        const oldCust = selectedCustForModal;
        const changes = [];
        if (oldCust) {
            if ((oldCust.fullName || '') !== fullNameVal) {
                changes.push(`ชื่อ-สกุล: ${oldCust.fullName || '(ว่าง)'} -> ${fullNameVal || '(ว่าง)'}`);
            }
            if (!oldCust.username && usernameVal) {
                changes.push(`✨ เพิ่มยูสเซอร์เนมทีหลัง: ${usernameVal}`);
            } else if ((oldCust.username || '').toLowerCase() !== usernameVal) {
                changes.push(`✏️ เปลี่ยนยูสเซอร์เนม: ${oldCust.username || '(ไม่มี)'} -> ${usernameVal}`);
            }
            if ((oldCust.phone || '') !== phoneVal) {
                changes.push(`📞 เบอร์โทร: ${oldCust.phone || '-'} -> ${phoneVal || '-'}`);
            }
            if ((oldCust.lineOA || '') !== lineOAVal) {
                changes.push(`📱 LINE OA: ${oldCust.lineOA || '-'} -> ${lineOAVal || '-'}`);
            }
            if ((oldCust.lineLek || 'รอแอด') !== lineLekVal) {
                changes.push(`💬 ไลน์เล็ก: ${oldCust.lineLek || 'รอแอด'} -> ${lineLekVal}`);
            }
            if (oldCust.createdBy !== agentVal) {
                changes.push(`👤 โอนผู้ดูแลเคส: ${oldCust.createdBy} -> ${agentVal}`);
            }
            if ((oldCust.notes || '') !== noteVal) {
                changes.push(`📝 บันทึกโน้ต: "${noteVal || 'ลบโน้ต'}"`);
            }
        }

        const updateTime = new Date().toISOString();
        const updated = customers.map(c => {
            if (c.id === selectedCustForModal.id) {
                return {
                    ...c,
                    fullName: fullNameVal,
                    username: usernameVal,
                    notes: noteVal,
                    createdBy: agentVal,
                    phone: phoneVal,
                    lineOA: lineOAVal,
                    lineLek: lineLekVal,
                    updatedBy: activeAgentName,
                    updatedAt: updateTime
                };
            }
            return c;
        });

        setCustomers(updated);
        try { localStorage.setItem('mc_customers', JSON.stringify(updated)); } catch (e) {}

        if (supabaseClient) {
            supabaseClient
                .from('mc_customers')
                .update({ 
                    full_name: fullNameVal,
                    username: usernameVal,
                    notes: noteVal, 
                    created_by: agentVal,
                    phone: phoneVal,
                    line_oa: lineOAVal,
                    line_lek: lineLekVal,
                    updated_by: activeAgentName,
                    updated_at: updateTime
                })
                .eq('id', selectedCustForModal.id)
                .then(({ error }) => {
                    if (error) writeLog('SUPABASE', `อัปเดตข้อมูลผ่านโมดูลคลาวด์ล้มเหลว: ${error.message}`, 'danger');
                });
        }

        const changeDetail = changes.length > 0 ? changes.join(' | ') : 'อัปเดตข้อมูลลูกค้า';
        const custDisplayName = fullNameVal || usernameVal || oldCust.username || `ID#${selectedCustForModal.id}`;
        writeLog('CUSTOMER_AUDIT', `[แก้ไขข้อมูลลูกค้า] คุณ${custDisplayName} -> ${changeDetail}`, 'info', activeAgentName);

        setSelectedCustForModal(null);
    };

    const addPresetToNotes = (presetText) => {
        setNotes(prev => (prev ? `${prev.trim()} | ${presetText}` : presetText));
    };

    return (
        <div className="modal-overlay" onClick={() => setSelectedCustForModal(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                    <div>
                        <h4 style={{ fontWeight: 600, margin: 0 }}>
                            {lang === 'TH' ? 'แก้ไขเคสลูกค้า: ' : 'Edit Customer Case: '}
                            {selectedCustForModal.fullName || selectedCustForModal.username || (lang === 'TH' ? '(ยังไม่สมัคร)' : '(Not Reg)')}
                        </h4>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={13} style={{ color: '#38bdf8' }} />
                                <span>{lang === 'TH' ? 'วัน-เวลาที่คีย์ข้อมูล:' : 'Keyed Date & Time:'} <strong>{formatKeyedDateTime(selectedCustForModal.createdAt)}</strong></span>
                            </span>
                            {selectedCustForModal.updatedBy && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '6px', color: '#34d399', fontWeight: 600 }}>
                                    <Edit3 size={12} />
                                    <span>{lang === 'TH' ? 'แก้ไขล่าสุดโดย:' : 'Last edited by:'} <strong>{selectedCustForModal.updatedBy}</strong> {selectedCustForModal.updatedAt ? ('(' + formatKeyedDateTime(selectedCustForModal.updatedAt) + ')') : ''}</span>
                                </span>
                            )}
                        </div>
                    </div>
                    <button 
                        style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }} 
                        onClick={() => setSelectedCustForModal(null)}
                    >
                        &times;
                    </button>
                </div>

                <div className="modal-field">
                    <label>{lang === 'TH' ? 'พนักงานผู้รับผิดชอบหลัก (ผู้ดูแลเคส)' : 'Assigned Owner (Case Manager)'}</label>
                    {isSupervisor ? (
                        <select 
                            className="select-input" 
                            value={assignedOwner}
                            onChange={(e) => setAssignedOwner(e.target.value)}
                        >
                            {agents.filter(a => a.isActive !== false || a.name === selectedCustForModal.createdBy).map(a => (
                                <option key={a.id} value={a.name}>
                                    {a.name}{a.isActive === false ? ' (พักงาน)' : ''}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <div style={{
                            padding: '9px 12px',
                            borderRadius: '8px',
                            background: theme === 'light' ? '#f1f5f9' : 'rgba(255,255,255,0.05)',
                            border: theme === 'light' ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontWeight: 700,
                            fontSize: '13px',
                            color: theme === 'light' ? '#0f172a' : '#ffffff'
                        }}>
                            <UserCheck size={15} style={{ color: '#38bdf8' }} />
                            <span>{selectedCustForModal.createdBy || activeAgentName} ({lang === 'TH' ? 'เจ้าของเคส' : 'Case Owner'})</span>
                        </div>
                    )}
                </div>

                <div className="modal-field">
                    <label>{lang === 'TH' ? 'ชื่อ-นามสกุลลูกค้า (Customer Full Name)' : 'Customer Full Name'}</label>
                    <input 
                        type="text" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={lang === 'TH' ? 'เช่น คุณสมชาย ใจดี' : 'e.g. Somchai Jaidee'}
                    />
                </div>

                <div className="modal-field">
                    <label>{lang === 'TH' ? 'ยูสเซอร์เนมลูกค้า (Username - ระบุเมื่อลูกค้าสมัครทีหลัง)' : 'Customer Username (if registered later)'}</label>
                    <input 
                        type="text" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder={lang === 'TH' ? 'เช่น somchai_mc (ระบุเมื่อสมัครทีหลัง)...' : 'e.g. somchai_mc (specify if registered later)...'}
                    />
                </div>

                <div className="modal-field">
                    <label>{lang === 'TH' ? 'เบอร์ติดต่อลูกค้า' : 'Phone Number'}</label>
                    <input 
                        type="text" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                    />
                </div>

                <div className="modal-field">
                    <label>{lang === 'TH' ? 'ไลน์ลูกค้า (LINE ID)' : 'LINE ID'}</label>
                    <input 
                        type="text" 
                        value={lineOA}
                        onChange={(e) => setLineOA(e.target.value)}
                        placeholder={lang === 'TH' ? 'เช่น @line_id หรือ line_user...' : 'e.g. @line_id or line_user...'}
                    />
                </div>

                <div className="modal-field">
                    <label>{lang === 'TH' ? 'สถานะไลน์เล็ก (Line Lek Status)' : 'LINE Lek Status'}</label>
                    <select 
                        className="select-input" 
                        value={lineLek}
                        onChange={(e) => setLineLek(e.target.value)}
                    >
                        <option value="รอแอด">{lang === 'TH' ? '🟡 รอแอด' : '🟡 Pending Add'}</option>
                        <option value="มี">{lang === 'TH' ? '🟢 มี' : '🟢 Has LINE'}</option>
                        <option value="ไม่มี">{lang === 'TH' ? '⚪ ไม่มี' : '⚪ No LINE'}</option>
                    </select>
                </div>

                <div className="modal-field">
                    <label style={{ fontWeight: 700, fontSize: '13px', color: theme === 'light' ? '#0f172a' : '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MessageSquare size={15} style={{ color: '#a855f7' }} />
                        <span>{lang === 'TH' ? 'ประวัติบันทึกความคืบหน้าการติดตามลูกค้า' : 'Follow-Up Progress & Chat Notes'}</span>
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, width: '100%' }}>
                            ⚡ {lang === 'TH' ? 'คลิกเลือกข้อความสำเร็จรูป (กดปุ๊บเติมข้อความทันที):' : '1-Click Quick Remark Presets:'}
                        </span>
                        {QUICK_REMARK_PRESETS.map((preset, pIdx) => {
                            const textVal = lang === 'TH' ? preset.th : preset.en;
                            return (
                                <button
                                    key={pIdx}
                                    type="button"
                                    onClick={() => addPresetToNotes(textVal)}
                                    style={{
                                        padding: '4px 9px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        borderRadius: '12px',
                                        border: theme === 'light' ? '1px solid #cbd5e1' : '1px solid rgba(168, 85, 247, 0.35)',
                                        background: theme === 'light' ? '#f8fafc' : 'rgba(168, 85, 247, 0.14)',
                                        color: theme === 'light' ? '#334155' : '#e2e8f0',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    + {textVal}
                                </button>
                            );
                        })}
                    </div>
                    <textarea 
                        rows="4" 
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder={lang === 'TH' ? 'พิมพ์ฟีดแบ็คความเห็นจากลูกค้า เช่น ลูกค้าติดงาน นัดโอนช่วงค่ำ...' : 'Type customer feedback, notes, remarks...'}
                        style={{
                            color: theme === 'light' ? '#0f172a' : '#ffffff',
                            backgroundColor: theme === 'light' ? '#ffffff' : 'rgba(15, 23, 42, 0.85)',
                            border: theme === 'light' ? '1.5px solid #cbd5e1' : '1px solid rgba(168, 85, 247, 0.35)',
                            fontSize: '13.5px',
                            fontWeight: 500,
                            lineHeight: 1.6,
                            padding: '10px 12px',
                            borderRadius: '8px',
                            outline: 'none',
                            width: '100%',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                    <button className="btn btn-secondary" onClick={() => setSelectedCustForModal(null)}>
                        {lang === 'TH' ? 'ยกเลิก' : 'Cancel'}
                    </button>
                    <button className="btn btn-primary" onClick={handleSave}>
                        {lang === 'TH' ? 'บันทึกข้อมูล' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatKeyedDateTime } from '../../utils/dateFormatters';
import { formatLineLekDisplay } from '../../utils/customerFormatters';
import { pushCustomerToCloud } from '../../services/supabase';
import { ClipboardCheck, CheckCircle2, Edit3, X } from 'lucide-react';

export const AddConfirmModal = () => {
    const {
        addConfirmModalData,
        setAddConfirmModalData,
        setAddSuccessModalData,
        customers,
        setCustomers,
        activeAgentName,
        theme,
        lang,
        supabaseClient,
        writeLog
    } = useApp();

    if (!addConfirmModalData) return null;

    const handleConfirm = () => {
        const newCust = { ...addConfirmModalData };
        const updatedList = [newCust, ...customers];
        setCustomers(updatedList);
        try { localStorage.setItem('mc_customers', JSON.stringify(updatedList)); } catch (e) {}

        const custDisplayName = newCust.username || newCust.fullName || 'ลูกค้ารายใหม่';
        writeLog('REGISTRATION', `เพิ่มข้อมูลลูกค้าใหม่ [${custDisplayName}] สำเร็จ! ผู้รับผิดชอบ: ${newCust.createdBy}`, 'success');

        setAddConfirmModalData(null);
        setAddSuccessModalData(newCust);

        if (supabaseClient) {
            pushCustomerToCloud(supabaseClient, newCust).catch(err => console.error('Cloud push error:', err));
        }
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 1250 }} onClick={() => setAddConfirmModalData(null)}>
            <div className="modal-content" style={{ maxWidth: '490px' }} onClick={(e) => e.stopPropagation()}>
                <div style={{ textAlign: 'center', paddingTop: '4px' }}>
                    <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: 'rgba(56, 189, 248, 0.15)',
                        border: '2px solid rgba(56, 189, 248, 0.4)',
                        color: '#38bdf8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px auto',
                        boxShadow: '0 0 24px rgba(56, 189, 248, 0.25)'
                    }}>
                        <ClipboardCheck size={32} />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: theme === 'light' ? '#0f172a' : '#ffffff', margin: 0 }}>
                        {lang === 'TH' ? 'ตรวจสอบและยืนยันข้อมูลลูกค้า' : 'Confirm Customer Information'}
                    </h3>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '6px', marginBottom: '0' }}>
                        {lang === 'TH' 
                            ? 'กรุณาตรวจสอบความถูกต้อง คุณสามารถกดยืนยันบันทึก, กลับไปแก้ไข หรือยกเลิกได้ครับ' 
                            : 'Please review details. You can confirm & save, edit, or cancel.'}
                    </p>
                </div>

                {/* Summary Details Box */}
                <div style={{
                    background: theme === 'light' ? '#f8fafc' : 'rgba(255,255,255,0.03)',
                    border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '9px',
                    fontSize: '13px',
                    marginTop: '16px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{lang === 'TH' ? '👤 ชื่อลูกค้า:' : '👤 Full Name:'}</span>
                        <strong style={{ color: theme === 'light' ? '#0f172a' : '#ffffff', fontSize: '13.5px' }}>
                            {addConfirmModalData.fullName || '-'}
                        </strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{lang === 'TH' ? '🆔 ยูสเซอร์เนม:' : '🆔 Username:'}</span>
                        {addConfirmModalData.username ? (
                            <span style={{ fontWeight: 700, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.12)', padding: '2px 8px', borderRadius: '6px' }}>
                                {addConfirmModalData.username}
                            </span>
                        ) : (
                            <span style={{ color: '#fbbf24', fontSize: '12px', fontWeight: 600 }}>
                                {lang === 'TH' ? '(ยังไม่สมัคร)' : '(Not Reg)'}
                            </span>
                        )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{lang === 'TH' ? '🕒 วัน-เวลาที่คีย์ข้อมูล:' : '🕒 Keyed Date & Time:'}</span>
                        <span style={{ fontWeight: 700, color: '#22c55e', background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.25)', padding: '2px 8px', borderRadius: '6px', fontSize: '12px' }}>
                            {formatKeyedDateTime(addConfirmModalData.createdAt)}
                        </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{lang === 'TH' ? '📞 เบอร์โทรศัพท์:' : '📞 Phone:'}</span>
                        <span style={{ color: theme === 'light' ? '#334155' : '#cbd5e1' }}>
                            {addConfirmModalData.phone || '-'}
                        </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{lang === 'TH' ? '💬 ไลน์ลูกค้า:' : '💬 LINE ID:'}</span>
                        <span style={{ color: theme === 'light' ? '#334155' : '#cbd5e1' }}>
                            {addConfirmModalData.lineOA || '-'} ({lang === 'TH' ? 'ไลน์เล็ก:' : 'LINE Lek:'} {formatLineLekDisplay(addConfirmModalData.lineLek, lang)})
                        </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{lang === 'TH' ? '📢 ช่องทางที่มา:' : '📢 Channel:'}</span>
                        <span className="badge" style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.3)', padding: '2px 8px', borderRadius: '6px' }}>
                            {addConfirmModalData.sourceChannel}
                        </span>
                    </div>

                    {addConfirmModalData.sourceChannel === 'เพื่อนแนะนำ' && addConfirmModalData.referrer && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-muted)' }}>{lang === 'TH' ? '🤝 เพื่อนที่แนะนำ:' : '🤝 Referrer:'}</span>
                            <span style={{ fontWeight: 600, color: '#f59e0b' }}>
                                {addConfirmModalData.referrer}
                            </span>
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{lang === 'TH' ? '👨‍💼 ผู้รับผิดชอบ (Owner):' : '👨‍💼 Assigned Owner:'}</span>
                        <span style={{ fontWeight: 600, color: theme === 'light' ? '#0f172a' : '#ffffff' }}>
                            {addConfirmModalData.createdBy || activeAgentName}
                        </span>
                    </div>

                    {addConfirmModalData.notes && (
                        <div style={{ borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '6px', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{lang === 'TH' ? '📝 โน้ตเริ่มต้น:' : '📝 Initial Note:'}</span>
                            <span style={{ color: theme === 'light' ? '#475569' : '#94a3b8', fontSize: '11.5px', fontStyle: 'italic' }}>
                                "{addConfirmModalData.notes}"
                            </span>
                        </div>
                    )}
                </div>

                {/* Actions: ตกลง (คอนเฟิร์ม), แก้ไขข้อมูล, ยกเลิก */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 0.9fr', gap: '8px', marginTop: '16px' }}>
                    <button 
                        className="btn btn-primary" 
                        style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 700, justifyContent: 'center' }}
                        onClick={handleConfirm}
                    >
                        <CheckCircle2 size={15} />
                        <span>{lang === 'TH' ? 'ตกลง (คอนเฟิร์ม)' : 'Confirm & Save'}</span>
                    </button>
                    <button 
                        className="btn btn-secondary" 
                        style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 600, justifyContent: 'center' }}
                        onClick={() => setAddConfirmModalData(null)}
                    >
                        <Edit3 size={14} />
                        <span>{lang === 'TH' ? 'แก้ไขข้อมูล' : 'Edit'}</span>
                    </button>
                    <button 
                        className="btn" 
                        style={{ padding: '10px 10px', fontSize: '13px', fontWeight: 600, justifyContent: 'center', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.25)' }}
                        onClick={() => setAddConfirmModalData(null)}
                    >
                        <X size={14} />
                        <span>{lang === 'TH' ? 'ยกเลิก' : 'Cancel'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

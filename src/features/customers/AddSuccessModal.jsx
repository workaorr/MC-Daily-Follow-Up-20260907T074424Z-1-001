import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatKeyedDateTime } from '../../utils/dateFormatters';
import { formatLineLekDisplay } from '../../utils/customerFormatters';
import { CheckCircle2, Check, Edit3, Trash2, ListTodo } from 'lucide-react';

export const AddSuccessModal = () => {
    const {
        addSuccessModalData,
        setAddSuccessModalData,
        setSelectedCustForModal,
        setViewMode,
        customers,
        setCustomers,
        theme,
        lang,
        supabaseClient,
        writeLog
    } = useApp();

    if (!addSuccessModalData) return null;

    const handleCancelAndRemove = () => {
        const target = addSuccessModalData;
        const displayName = target.fullName || target.username || `ID#${target.id}`;
        if (window.confirm(lang === 'TH' ? `คุณต้องการยกเลิกและลบเคสลูกค้า "${displayName}" ออกจากระบบใช่หรือไม่?` : `Cancel and delete customer "${displayName}"?`)) {
            const nextList = (Array.isArray(customers) ? customers : []).filter(c => c.id !== target.id);
            setCustomers(nextList);
            try { localStorage.setItem('mc_customers', JSON.stringify(nextList)); } catch (e) {}

            if (supabaseClient) {
                supabaseClient.from('mc_customers').delete().eq('id', target.id).catch(e => console.error(e));
            }
            writeLog('REGISTRATION', `ยกเลิกและลบเคสลูกค้า [${displayName}] เรียบร้อย`, 'warning');
            setAddSuccessModalData(null);
        }
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={() => setAddSuccessModalData(null)}>
            <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
                <div style={{ textAlign: 'center', paddingTop: '6px' }}>
                    <div style={{
                        width: '62px',
                        height: '62px',
                        borderRadius: '50%',
                        background: 'rgba(34, 197, 94, 0.15)',
                        border: '2px solid rgba(34, 197, 94, 0.4)',
                        color: '#22c55e',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px auto',
                        boxShadow: '0 0 24px rgba(34, 197, 94, 0.25)'
                    }}>
                        <CheckCircle2 size={34} />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: theme === 'light' ? '#0f172a' : '#ffffff', margin: 0 }}>
                        {lang === 'TH' ? 'เพิ่มลูกค้าสำเร็จเรียบร้อย! 🎉' : 'Customer Added Successfully! 🎉'}
                    </h3>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '6px', marginBottom: '0' }}>
                        {lang === 'TH' ? 'บันทึกข้อมูลลูกค้าเข้าพอร์ตงานและซิงค์ข้อมูลเรียบร้อยแล้ว' : 'Customer profile saved to portfolio and synced successfully.'}
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
                        <strong style={{ color: theme === 'light' ? '#0f172a' : '#ffffff', fontSize: '13.5px' }}>{addSuccessModalData.fullName || '-'}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{lang === 'TH' ? '🆔 ยูสเซอร์เนม:' : '🆔 Username:'}</span>
                        {addSuccessModalData.username ? (
                            <span style={{ fontWeight: 700, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.12)', padding: '2px 8px', borderRadius: '6px' }}>
                                {addSuccessModalData.username}
                            </span>
                        ) : (
                            <span style={{ color: '#fbbf24', fontSize: '12px', fontWeight: 600 }}>{lang === 'TH' ? '(ยังไม่สมัคร)' : '(Not Reg)'}</span>
                        )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{lang === 'TH' ? '🕒 วัน-เวลาที่คีย์ข้อมูล:' : '🕒 Keyed Date & Time:'}</span>
                        <span style={{ fontWeight: 700, color: '#22c55e', background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.25)', padding: '2px 8px', borderRadius: '6px', fontSize: '12px' }}>
                            {formatKeyedDateTime(addSuccessModalData.createdAt)}
                        </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{lang === 'TH' ? '📞 เบอร์โทรศัพท์:' : '📞 Phone:'}</span>
                        <span style={{ color: theme === 'light' ? '#334155' : '#cbd5e1' }}>{addSuccessModalData.phone || '-'}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{lang === 'TH' ? '💬 ไลน์ลูกค้า:' : '💬 LINE ID:'}</span>
                        <span style={{ color: theme === 'light' ? '#334155' : '#cbd5e1' }}>{addSuccessModalData.lineOA || '-'} ({lang === 'TH' ? 'ไลน์เล็ก:' : 'LINE Lek:'} {formatLineLekDisplay(addSuccessModalData.lineLek, lang)})</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{lang === 'TH' ? '📢 ช่องทางที่มา:' : '📢 Channel:'}</span>
                        <span className="badge" style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.3)', padding: '2px 8px', borderRadius: '6px' }}>
                            {addSuccessModalData.sourceChannel}
                        </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{lang === 'TH' ? '👨‍💼 ผู้รับผิดชอบ (Owner):' : '👨‍💼 Assigned Owner:'}</span>
                        <span style={{ fontWeight: 600, color: theme === 'light' ? '#0f172a' : '#ffffff' }}>
                            {addSuccessModalData.createdBy}
                        </span>
                    </div>

                    {addSuccessModalData.notes && (
                        <div style={{ borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '6px', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{lang === 'TH' ? '📝 โน้ตเริ่มต้น:' : '📝 Initial Note:'}</span>
                            <span style={{ color: theme === 'light' ? '#475569' : '#94a3b8', fontSize: '11.5px', fontStyle: 'italic' }}>"{addSuccessModalData.notes}"</span>
                        </div>
                    )}
                </div>

                {/* Action Buttons: ตกลง, แก้ไขเคสนี้, ยกเลิกเคสนี้, ไปหน้าติดตามงาน */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px' }}>
                        <button 
                            className="btn btn-primary" 
                            style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 700, justifyContent: 'center' }}
                            onClick={() => setAddSuccessModalData(null)}
                        >
                            <Check size={15} />
                            <span>{lang === 'TH' ? 'ตกลง (เสร็จสิ้น)' : 'Done / OK'}</span>
                        </button>

                        <button 
                            className="btn btn-secondary" 
                            style={{ padding: '10px 12px', fontSize: '12.5px', fontWeight: 600, justifyContent: 'center' }}
                            onClick={() => {
                                const target = addSuccessModalData;
                                setAddSuccessModalData(null);
                                setSelectedCustForModal(target);
                            }}
                        >
                            <Edit3 size={14} />
                            <span>{lang === 'TH' ? 'แก้ไขเคสนี้' : 'Edit Case'}</span>
                        </button>

                        <button 
                            className="btn" 
                            style={{ padding: '10px 10px', fontSize: '12.5px', fontWeight: 600, justifyContent: 'center', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.25)' }}
                            onClick={handleCancelAndRemove}
                        >
                            <Trash2 size={14} />
                            <span>{lang === 'TH' ? 'ยกเลิกเคสนี้' : 'Cancel Case'}</span>
                        </button>
                    </div>

                    <button 
                        className="btn btn-secondary" 
                        style={{ padding: '8px 14px', fontSize: '12.5px', justifyContent: 'center', width: '100%', opacity: 0.85 }}
                        onClick={() => {
                            setAddSuccessModalData(null);
                            setViewMode('agent');
                        }}
                    >
                        <ListTodo size={14} />
                        <span>{lang === 'TH' ? 'ไปหน้าติดตามงาน (MC)' : 'MC Workspace'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

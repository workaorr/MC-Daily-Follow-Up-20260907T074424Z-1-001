import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { hashPasscode } from '../../utils/auth';
import { Key, AlertCircle, Check } from 'lucide-react';

export const ChangePasscodeModal = () => {
    const {
        showChangePasscodeModal,
        setShowChangePasscodeModal,
        activeAgentName,
        agents,
        setAgents,
        theme,
        lang,
        supabaseClient,
        writeLog
    } = useApp();

    if (!showChangePasscodeModal) return null;

    const [newPasscode, setNewPasscode] = useState('');
    const [confirmPasscode, setConfirmPasscode] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        const cleanNew = newPasscode.trim();
        const cleanConfirm = confirmPasscode.trim();

        if (!cleanNew || cleanNew.length < 4) {
            setErrorMsg(lang === 'TH' ? '⚠️ รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร' : '⚠️ Passcode must be at least 4 characters');
            return;
        }
        if (cleanNew === '1234') {
            setErrorMsg(lang === 'TH' ? '⚠️ กรุณาตั้งรหัสผ่านอื่นที่ไม่ใช่รหัสเริ่มต้น 1234 เพื่อความปลอดภัย' : '⚠️ Cannot use default 1234. Please choose a secure passcode');
            return;
        }
        if (cleanNew !== cleanConfirm) {
            setErrorMsg(lang === 'TH' ? '⚠️ รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน' : '⚠️ Passcodes do not match');
            return;
        }

        setIsSubmitting(true);
        try {
            const hashed = await hashPasscode(cleanNew);
            const updatedAgents = agents.map(a => a.name === activeAgentName ? { ...a, passcode: hashed } : a);
            setAgents(updatedAgents);
            try { localStorage.setItem('mc_agents', JSON.stringify(updatedAgents)); } catch (e) {}

            if (supabaseClient) {
                const currentAgent = agents.find(a => a.name === activeAgentName);
                let query = supabaseClient.from('mc_agents').update({ passcode: hashed });
                if (currentAgent && currentAgent.id && typeof currentAgent.id === 'number' && currentAgent.id < 1000000000) {
                    query = query.eq('id', currentAgent.id);
                } else {
                    query = query.eq('name', activeAgentName);
                }
                await query;
            }

            writeLog('SECURITY', `[ความปลอดภัย] บัญชี [${activeAgentName}] เปลี่ยนรหัสผ่านส่วนตัวใหม่เรียบร้อยแล้ว`, 'success', activeAgentName);
            setShowChangePasscodeModal(false);
            setNewPasscode('');
            setConfirmPasscode('');
            setErrorMsg('');
            alert(lang === 'TH' 
                ? `✅ เปลี่ยนรหัสผ่านสำหรับ [${activeAgentName}] สำเร็จแล้ว!\nรหัสผ่านใหม่ถูกเข้ารหัสด้วย SHA-256 + Salt ปลอดภัยสูงสุดเรียบร้อย` 
                : `✅ Passcode updated successfully for [${activeAgentName}]!`);
        } catch (err) {
            setErrorMsg(lang === 'TH' ? `❌ ไม่สามารถเปลี่ยนรหัสผ่านได้: ${err.message}` : `❌ Failed to update passcode: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={() => setShowChangePasscodeModal(false)}>
            <div className="modal-content" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
                    <h4 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '16px', color: theme === 'light' ? '#0f172a' : '#fff', margin: 0 }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171' }}>
                            <Key size={18} />
                        </div>
                        {lang === 'TH' ? 'เปลี่ยนรหัสผ่านส่วนตัว (Change Passcode)' : 'Change Personal Passcode'}
                    </h4>
                    <button 
                        style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', fontSize: '22px', cursor: 'pointer' }} 
                        onClick={() => setShowChangePasscodeModal(false)}
                    >
                        &times;
                    </button>
                </div>

                <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, marginTop: '10px' }}>
                    {lang === 'TH' 
                        ? `ตั้งรหัสผ่านใหม่สำหรับบัญชี [${activeAgentName}] เพื่อความปลอดภัย (รหัสผ่านจะถูกเข้ารหัส SHA-256 + Salt ปลอดภัยสูงสุด)` 
                        : `Set a new secure passcode for account [${activeAgentName}]. (Encrypted with SHA-256 + Salt)`}
                </p>

                {errorMsg && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#f87171',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        fontSize: '12.5px',
                        marginTop: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <AlertCircle size={16} style={{ flexShrink: 0 }} />
                        <span>{errorMsg}</span>
                    </div>
                )}

                <div className="modal-field" style={{ marginTop: '14px' }}>
                    <label style={{ fontWeight: 600, fontSize: '13px', color: theme === 'light' ? '#334155' : '#cbd5e1' }}>
                        {lang === 'TH' ? 'รหัสผ่านใหม่ (อย่างน้อย 4 ตัวอักษร):' : 'New Passcode (min 4 chars):'}
                    </label>
                    <input
                        type="password"
                        className="text-input"
                        style={{ width: '100%', padding: '10px 14px', fontSize: '14px', borderRadius: '10px', marginTop: '6px', boxSizing: 'border-box' }}
                        placeholder={lang === 'TH' ? 'กรอกรหัสผ่านใหม่' : 'Enter new passcode'}
                        value={newPasscode}
                        onChange={(e) => {
                            setNewPasscode(e.target.value);
                            setErrorMsg('');
                        }}
                        autoFocus
                    />
                </div>

                <div className="modal-field" style={{ marginTop: '12px' }}>
                    <label style={{ fontWeight: 600, fontSize: '13px', color: theme === 'light' ? '#334155' : '#cbd5e1' }}>
                        {lang === 'TH' ? 'ยืนยันรหัสผ่านใหม่อีกครั้ง:' : 'Confirm New Passcode:'}
                    </label>
                    <input
                        type="password"
                        className="text-input"
                        style={{ width: '100%', padding: '10px 14px', fontSize: '14px', borderRadius: '10px', marginTop: '6px', boxSizing: 'border-box' }}
                        placeholder={lang === 'TH' ? 'พิมพ์รหัสผ่านใหม่อีกครั้ง' : 'Confirm new passcode'}
                        value={confirmPasscode}
                        onChange={(e) => {
                            setConfirmPasscode(e.target.value);
                            setErrorMsg('');
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSubmit();
                        }}
                    />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '22px' }}>
                    <button 
                        type="button"
                        className="btn btn-secondary" 
                        onClick={() => setShowChangePasscodeModal(false)}
                        disabled={isSubmitting}
                    >
                        {lang === 'TH' ? 'ยกเลิก' : 'Cancel'}
                    </button>
                    <button 
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '10px 20px', fontWeight: 700, background: '#10b981', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                    >
                        <Check size={14} />
                        {lang === 'TH' ? 'บันทึกรหัสผ่านใหม่' : 'Save Passcode'}
                    </button>
                </div>
            </div>
        </div>
    );
};

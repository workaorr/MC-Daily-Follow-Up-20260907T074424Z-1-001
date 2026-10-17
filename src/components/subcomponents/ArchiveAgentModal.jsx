import React from 'react';
import { useApp } from '../../context/AppContext';
import { pushAgentToCloud } from '../../services/supabase';
import { Trash2 } from 'lucide-react';

export const ArchiveAgentModal = () => {
    const {
        archiveAgentModalData,
        setArchiveAgentModalData,
        agents,
        setAgents,
        activeAgentName,
        theme,
        lang,
        supabaseClient,
        writeLog
    } = useApp();

    if (!archiveAgentModalData) return null;

    const handleConfirmArchive = async () => {
        const target = archiveAgentModalData;
        const nowIso = new Date().toISOString();
        const updatedAgents = agents.map(a => {
            if (a.id === target.id || a.name === target.name) {
                const updatedAgent = {
                    ...a,
                    isActive: false,
                    isArchived: true,
                    archivedAt: nowIso,
                    archivedBy: activeAgentName || 'Supervisor',
                    permissions: {
                        ...(a.permissions || {}),
                        isArchived: true,
                        archivedAt: nowIso,
                        archivedBy: activeAgentName || 'Supervisor'
                    }
                };
                if (supabaseClient) {
                    pushAgentToCloud(supabaseClient, updatedAgent).catch(err => console.error(err));
                }
                return updatedAgent;
            }
            return a;
        });

        setAgents(updatedAgents);
        try { localStorage.setItem('mc_agents', JSON.stringify(updatedAgents)); } catch (e) {}
        writeLog('AGENT_ARCHIVE', `ย้ายพนักงาน [${target.name}] เข้าถังขยะ (Archived)`, 'warning');
        setArchiveAgentModalData(null);
    };

    return (
        <div 
            className="modal-backdrop" 
            style={{ 
                position: 'fixed', 
                inset: 0, 
                background: 'rgba(0,0,0,0.8)', 
                backdropFilter: 'blur(6px)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                zIndex: 99999, 
                padding: '20px' 
            }}
            onClick={() => setArchiveAgentModalData(null)}
        >
            <div 
                style={{ 
                    background: theme === 'light' ? '#ffffff' : '#0f172a', 
                    border: '1px solid rgba(239, 68, 68, 0.35)', 
                    borderRadius: '20px', 
                    maxWidth: '530px', 
                    width: '100%', 
                    padding: '28px', 
                    boxShadow: '0 25px 60px rgba(0,0,0,0.6)', 
                    color: 'var(--text-main)', 
                    animation: 'scaleIn 0.2s ease-out' 
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px', marginBottom: '18px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                        <Trash2 size={24} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#ef4444' }}>
                            {lang === 'TH' ? 'ย้ายพนักงานเข้า "ถังขยะ" (Archived)?' : 'Move Staff to Recycle Bin (Archived)?'}
                        </h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                            {lang === 'TH' 
                                ? `บัญชี: ${archiveAgentModalData.name} (${archiveAgentModalData.loginUsername ? `@${archiveAgentModalData.loginUsername}` : 'ไม่มี Username'})` 
                                : `Staff: ${archiveAgentModalData.name}`}
                        </p>
                    </div>
                </div>

                <div style={{ background: theme === 'light' ? '#f8fafc' : 'rgba(2, 6, 23, 0.55)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)', fontSize: '13px', lineHeight: '1.7', marginBottom: '22px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                        <span style={{ fontSize: '16px' }}>📦</span>
                        <span>
                            <strong>{lang === 'TH' ? 'สถานะอยู่ในถังขยะ:' : 'Archived Status:'}</strong>{' '}
                            {lang === 'TH' 
                                ? 'ข้อมูลจะไม่ถูกลบออกจาก Supabase ทันที แต่จะเปลี่ยนสถานะเป็น "อยู่ในถังขยะ (Archived)" และถูกระงับสิทธิ์การล็อกอินชั่วคราว' 
                                : 'Data is not deleted immediately from Supabase. Account is suspended and archived.'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                        <span style={{ fontSize: '16px' }}>⏳</span>
                        <span>
                            <strong>{lang === 'TH' ? 'เก็บรักษาไว้นาน 30 วัน:' : '30-Day Retention:'}</strong>{' '}
                            {lang === 'TH' 
                                ? 'ระบบจะเก็บรักษาข้อมูลไว้ในถังขยะ 30 วัน เผื่อกรณีเผลอกดผิด ก่อนจะอนุญาตให้ลบถาวรได้' 
                                : 'Stored safely in Recycle Bin for 30 days before permanent deletion.'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                        <span style={{ fontSize: '16px' }}>🔄</span>
                        <span>
                            <strong>{lang === 'TH' ? 'กู้คืนได้ตลอดเวลา:' : 'Restore Anytime:'}</strong>{' '}
                            {lang === 'TH' 
                                ? 'หัวหน้า (Supervisor) สามารถกด "กู้คืน (Restore)" ให้พนักงานกลับมาทำงานได้ตลอดเวลาจากเมนูถังขยะ' 
                                : 'Supervisors can restore this staff account anytime from Recycle Bin.'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <span style={{ fontSize: '16px' }}>👥</span>
                        <span>
                            <strong>{lang === 'TH' ? 'เคสลูกค้าเดิมปลอดภัย 100%:' : 'Customer Records Safe:'}</strong>{' '}
                            {lang === 'TH' 
                                ? 'รายชื่อลูกค้าและประวัติการดูแลเดิมที่พนักงานคนนี้เคยรับผิดชอบจะยังคงอยู่ครบถ้วน ไม่สูญหาย' 
                                : 'All assigned customer cases and history remain 100% safe and intact.'}
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={() => setArchiveAgentModalData(null)}
                        style={{ padding: '10px 18px', fontSize: '13px', fontWeight: 600, borderRadius: '10px' }}
                    >
                        {lang === 'TH' ? 'ยกเลิก' : 'Cancel'}
                    </button>
                    <button 
                        type="button" 
                        onClick={handleConfirmArchive}
                        style={{ padding: '10px 22px', fontSize: '13px', fontWeight: 700, background: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)' }}
                    >
                        <Trash2 size={15} />
                        {lang === 'TH' ? 'ย้ายเข้าถังขยะ' : 'Move to Trash'}
                    </button>
                </div>
            </div>
        </div>
    );
};

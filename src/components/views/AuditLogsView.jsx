import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { exportLogsToCSV } from '../../utils/exportCsv';
import { 
  ShieldAlert, 
  History, 
  Download, 
  FileText, 
  Search, 
  CheckCircle, 
  AlertTriangle 
} from 'lucide-react';

export default function AuditLogsView() {
  const {
    logs,
    setLogs,
    totalCloudLogsCount,
    setTotalCloudLogsCount,
    activeAgent,
    activeAgentName,
    isSupervisor,
    lang,
    theme,
    setViewMode,
    supabaseClient,
    writeLog
  } = useApp();

  const [auditTagFilter, setAuditTagFilter] = useState('ALL');
  const [auditSearch, setAuditSearch] = useState('');
  const [isLoadingMoreLogs, setIsLoadingMoreLogs] = useState(false);

  // Permission check
  const canBackOffice = isSupervisor || 
                        activeAgent?.username === 'ROOT_ADMIN' || 
                        activeAgent?.permissions?.canBackOffice;

  const matchesCategory = (l, cat) => {
    if (cat === 'ALL') return true;
    if (cat === 'SECURITY') return l.tag === 'AUTH' || l.tag === 'SECURITY' || l.tag === 'SESSION';
    if (cat === 'RECYCLE') return l.tag === 'CUSTOMER_DELETE' || l.tag === 'CUSTOMER_RESTORE' || l.tag === 'CUSTOMER_PURGE' || l.tag === 'STAFF_AUDIT';
    if (cat === 'EDIT_CUSTOMER') return l.tag === 'EDIT_CUSTOMER' || l.tag === 'CUSTOMER_AUDIT' || l.tag === 'CUSTOMER_UPDATE';
    if (cat === 'ADD_CUSTOMER') return l.tag === 'ADD_CUSTOMER' || l.tag === 'REGISTRATION' || l.tag === 'CUSTOMER_ADD';
    if (cat === 'FOLLOW_UP') return l.tag === 'FOLLOW_UP' || l.tag === 'CRM_ACTION';
    if (cat === 'DEPOSIT_MATCH') return l.tag === 'DEPOSIT_MATCH' || l.tag === 'MATCH_ENGINE' || l.tag === 'DEPOSIT_SCAN' || l.tag === 'DEPOSIT_UPLOAD';
    if (cat === 'BACKOFFICE') return l.tag === 'BACKOFFICE' || l.tag === 'STAFF_ADD' || l.tag === 'CHANNEL_ADD' || l.tag === 'CHANNEL_DELETE';
    if (cat === 'BACKUP') return l.tag === 'BACKUP' || l.tag === 'DISASTER_RECOVERY' || l.tag === 'BACKUP_EXPORT' || l.tag === 'BACKUP_RESTORE';
    if (cat === 'SUPABASE') return l.tag === 'SUPABASE';
    return l.tag === cat;
  };

  const filteredLogs = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    return logs.filter(l => {
      if (!matchesCategory(l, auditTagFilter)) return false;
      if (!q) return true;
      return (l.msg || '').toLowerCase().includes(q) ||
             (l.tag || '').toLowerCase().includes(q) ||
             (l.operator || '').toLowerCase().includes(q) ||
             (l.time || '').toLowerCase().includes(q);
    });
  }, [logs, auditTagFilter, auditSearch]);

  const handleLoadMoreLogs = async () => {
    if (!supabaseClient || isLoadingMoreLogs) return;
    setIsLoadingMoreLogs(true);
    try {
      const fromIdx = logs.length;
      const toIdx = fromIdx + 299;

      const { data, count, error } = await supabaseClient
        .from('mc_logs')
        .select('*', { count: 'exact' })
        .order('id', { ascending: false })
        .range(fromIdx, toIdx);

      if (error) throw error;

      if (count !== null) setTotalCloudLogsCount(count);

      if (data && data.length > 0) {
        const mapped = data.map(row => ({
          id: row.id,
          time: row.time || (row.created_at ? row.created_at.replace('T', ' ').substring(0, 19) : new Date().toLocaleString('th-TH')),
          tag: row.tag || 'SYSTEM',
          msg: row.message || row.msg || '',
          type: row.type || 'info',
          operator: row.operator || 'System'
        }));

        setLogs(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newUnique = mapped.filter(m => !existingIds.has(m.id));
          return [...prev, ...newUnique];
        });
      }
    } catch (err) {
      console.error('Failed to load more logs:', err);
      alert(lang === 'TH' ? `เกิดข้อผิดพลาดในการโหลดประวัติ: ${err.message}` : `Error loading logs: ${err.message}`);
    } finally {
      setIsLoadingMoreLogs(false);
    }
  };

  if (!canBackOffice) {
    return (
      <div 
        className="restricted-access-card" 
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(244, 63, 94, 0.25)',
          borderRadius: '24px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
          textAlign: 'center',
          maxWidth: '560px',
          margin: '40px auto'
        }}
      >
        <div style={{
          padding: '16px',
          borderRadius: '20px',
          background: 'rgba(244, 63, 94, 0.12)',
          color: '#fb7185',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          marginBottom: '16px'
        }}>
          <ShieldAlert style={{ width: '42px', height: '42px' }} />
        </div>
        <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>
          {lang === 'TH' ? '⛔ สิทธิ์การเข้าถึงพื้นที่สงวน (Access Restricted)' : '⛔ Access Restricted'}
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '24px' }}>
          {lang === 'TH' ? (
            <>บัญชีของคุณ [<strong>{activeAgentName}</strong>] มีระดับสิทธิ์เป็นพนักงาน (MC Agent) ยังไม่ได้รับอนุมัติสิทธิ์ในการเข้าถึงประวัติการแก้ไข Audit Logs หากต้องการเข้าใช้งาน กรุณาติดต่อหัวหน้า (Supervisor) เพื่อเปิดสิทธิ์การเข้าถึง "⚙️ จัดการหลังบ้าน & Audit Logs"</>
          ) : (
            <>Your account [<strong>{activeAgentName}</strong>] has MC Agent role and is not authorized to view Audit Logs. Please contact a Supervisor.</>
          )}
        </p>
        <button 
          className="btn btn-secondary"
          onClick={() => setViewMode('agent')}
          style={{ padding: '10px 20px', fontSize: '12px' }}
        >
          {lang === 'TH' ? 'กลับไปยังหน้าการติดตามลูกค้า (MC Agent)' : 'Back to Follow-Up Table (MC Agent)'}
        </button>
      </div>
    );
  }

  return (
    <div id="tour-logs-panel" className="panel" style={{ flexDirection: 'column', gap: '20px' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
        <div>
          <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History style={{ color: 'var(--primary)' }} /> {lang === 'TH' ? 'ประวัติการแก้ไขและบันทึกข้อมูลลูกค้า (Audit Trail Logs)' : 'Customer Audit Trail & Edit Logs'}
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {lang === 'TH' ? 'ระบบบันทึกประวัติการเพิ่ม แก้ไข ติ๊กติดตาม และการซิงค์ข้อมูลลูกค้าทุกคนอย่างครบถ้วน' : 'Detailed historical log of all customer edits, follow-ups, and cloud sync actions.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            type="button"
            className="btn btn-secondary" 
            style={{
              padding: '8px 16px',
              background: 'rgba(168, 85, 247, 0.2)',
              color: '#c084fc',
              border: '1px solid rgba(168, 85, 247, 0.4)',
              fontWeight: 700,
              cursor: isLoadingMoreLogs || (totalCloudLogsCount && logs.length >= totalCloudLogsCount) ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
            disabled={isLoadingMoreLogs || (totalCloudLogsCount && logs.length >= totalCloudLogsCount)}
            onClick={handleLoadMoreLogs}
          >
            {isLoadingMoreLogs ? (
              <span>⏳ {lang === 'TH' ? 'กำลังโหลด...' : 'Loading...'}</span>
            ) : totalCloudLogsCount && logs.length >= totalCloudLogsCount ? (
              <span>✅ {lang === 'TH' ? `โหลดครบแล้ว (${logs.length})` : `All Loaded (${logs.length})`}</span>
            ) : (
              <>
                <Download style={{ width: '13px', height: '13px' }} />
                <span>{lang === 'TH' ? `📥 โหลดประวัติเพิ่ม (+300) [${logs.length}${totalCloudLogsCount ? `/${totalCloudLogsCount.toLocaleString()}` : ''}]` : 'Load More (+300)'}</span>
              </>
            )}
          </button>

          <button 
            className="btn btn-secondary" 
            style={{ padding: '8px 16px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => exportLogsToCSV(filteredLogs, 'MC_Audit_Logs.csv', lang, activeAgentName)}
          >
            <FileText style={{ width: '14px', height: '14px' }} />
            <span>{lang === 'TH' ? 'ดาวน์โหลดประวัติ CSV (Export Audit Logs)' : 'Export Audit Logs to CSV'}</span>
          </button>
        </div>
      </div>

      {/* Categories and search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', th: 'ประวัติทั้งหมด', en: 'All Activity' },
            { id: 'SECURITY', th: '🔐 ความปลอดภัย & เข้าสู่ระบบ', en: 'Security & Auth' },
            { id: 'RECYCLE', th: '🗑️ ลบ/กู้คืนข้อมูล', en: 'Recycle & Deletions' },
            { id: 'EDIT_CUSTOMER', th: '✏️ ข้อมูล/ไลน์เล็ก', en: 'User & Line Edits' },
            { id: 'ADD_CUSTOMER', th: '👤 เพิ่มลูกค้าใหม่', en: 'New Customer Entry' },
            { id: 'FOLLOW_UP', th: '📞 ติ๊กติดตาม 1-31', en: 'Daily Follow-Ups' },
            { id: 'DEPOSIT_MATCH', th: '🟢 ปิดยอดฝากสำเร็จ', en: 'Deposit Matches' },
            { id: 'BACKOFFICE', th: '🏢 จัดการหลังบ้าน', en: 'Back Office' },
            { id: 'BACKUP', th: '💾 สำรองข้อมูล', en: 'Backup & Recovery' },
            { id: 'SUPABASE', th: '⚙️ ระบบคลาวด์', en: 'Cloud Sync' }
          ].map(cat => (
            <button 
              key={cat.id}
              className={`btn ${auditTagFilter === cat.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '4px 10px', fontSize: '11px' }}
              onClick={() => setAuditTagFilter(cat.id)}
            >
              {lang === 'TH' ? cat.th : cat.en}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '13px', height: '13px', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="select-input"
            placeholder={lang === 'TH' ? 'ค้นหาในประวัติ...' : 'Search in logs...'}
            value={auditSearch}
            onChange={(e) => setAuditSearch(e.target.value)}
            style={{ minWidth: '220px', paddingLeft: '30px' }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper" style={{ maxHeight: '620px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)' }}>
        <table>
          <thead>
            <tr>
              <th>{lang === 'TH' ? 'เวลาที่บันทึก' : 'Timestamp'}</th>
              <th>{lang === 'TH' ? 'หมวดหมู่' : 'Category'}</th>
              <th>{lang === 'TH' ? 'รายละเอียดกิจกรรม/การแก้ไข' : 'Action Details'}</th>
              <th>{lang === 'TH' ? 'ระดับประเภท' : 'Log Type'}</th>
              <th>{lang === 'TH' ? 'ผู้ดำเนินการ' : 'Operator'}</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                  {lang === 'TH' ? 'ยังไม่มีประวัติการแก้ไขในระบบ' : 'No audit log history found.'}
                </td>
              </tr>
            ) : (
              filteredLogs.map((l, index) => (
                <tr key={l.id || index}>
                  <td style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    ⏱️ {l.time}
                  </td>
                  <td>
                    <span className="badge badge-source">{l.tag}</span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{l.msg}</td>
                  <td>
                    <span className={`badge ${l.type === 'success' ? 'badge-saved' : l.type === 'danger' ? 'badge-pending' : 'badge-owner'}`}>
                      {(l.type || 'info').toUpperCase()}
                    </span>
                  </td>
                  <td style={{ color: 'var(--primary)', fontWeight: 600 }}>
                    👤 {l.operator || (lang === 'TH' ? 'ระบบกลาง' : 'System')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        marginTop: '16px',
        padding: '12px 16px',
        borderRadius: '10px',
        background: theme === 'light' ? '#f8fafc' : 'rgba(0,0,0,0.25)',
        border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.06)'
      }}>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {lang === 'TH' ? (
            <>แสดง <strong>{filteredLogs.length}</strong> รายการ (โหลดมาแล้ว <strong>{logs.length}</strong>{totalCloudLogsCount ? <> จากทั้งหมด <strong>{totalCloudLogsCount.toLocaleString()}</strong> รายการในคลาวด์</> : ''})</>
          ) : (
            <>Showing <strong>{filteredLogs.length}</strong> entries (loaded <strong>{logs.length}</strong>{totalCloudLogsCount ? <> of <strong>{totalCloudLogsCount.toLocaleString()}</strong> on cloud</> : ''})</>
          )}
        </div>

        <div>
          {totalCloudLogsCount && logs.length >= totalCloudLogsCount ? (
            <span style={{ fontSize: '11.5px', color: '#10b981', fontWeight: 600 }}>
              ✅ {lang === 'TH' ? 'โหลดข้อมูลจากคลาวด์ครบทั้งหมดแล้ว' : 'All cloud logs loaded'}
            </span>
          ) : (
            <button
              type="button"
              className="btn btn-secondary"
              disabled={isLoadingMoreLogs}
              onClick={handleLoadMoreLogs}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 600,
                borderColor: '#a855f7',
                color: '#c084fc',
                cursor: isLoadingMoreLogs ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {isLoadingMoreLogs ? (
                <span>⏳ {lang === 'TH' ? 'กำลังโหลดข้อมูล...' : 'Loading...'}</span>
              ) : (
                <>
                  <Download style={{ width: '13px', height: '13px' }} />
                  <span>{lang === 'TH' ? 'โหลดประวัติเพิ่มเติม (+300 รายการ)' : 'Load More Logs (+300)'}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export { AuditLogsView };

// Audit Logging Service for Local State & Supabase mc_logs Table

export const createLogEntry = (tag, msg, type = 'info', operator = 'System') => {
    const now = new Date();
    const timeStr = now.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit' }) + ' ' + now.toLocaleTimeString('th-TH');
    return {
        id: Date.now() + Math.random(),
        time: timeStr,
        tag: tag || 'SYSTEM',
        msg: msg || '',
        type: type || 'info',
        operator: operator || 'System'
    };
};

export const persistLogToCloud = (entry, supabaseClient) => {
    if (!supabaseClient) return;
    try {
        supabaseClient.from('mc_logs').insert([{
            tag: entry.tag || 'SYSTEM',
            msg: entry.msg || '',
            type: entry.type || 'info',
            operator: entry.operator || 'System'
        }]).then(({ error }) => {
            if (error) console.warn('Supabase mc_logs insert notice:', error.message);
        }).catch(err => console.warn('Supabase mc_logs insert exception:', err));
    } catch (e) {
        console.warn('Supabase mc_logs insert failed:', e);
    }
};

// Supabase Client Factory & Dynamic Connection Manager
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../constants/config';

export const getStoredSupabaseCredentials = () => {
    let url = SUPABASE_CONFIG.DEFAULT_URL;
    let key = SUPABASE_CONFIG.DEFAULT_KEY;
    try {
        const savedUrl = localStorage.getItem('mc_supabase_url');
        const savedKey = localStorage.getItem('mc_supabase_key');
        if (savedUrl && savedUrl.trim()) url = savedUrl.trim();
        if (savedKey && savedKey.trim()) key = savedKey.trim();
    } catch (e) {}
    return { url, key };
};

export const createSupabaseInstance = (url, key) => {
    if (!url || !key) return null;
    try {
        return createClient(url.trim(), key.trim(), {
            auth: {
                persistSession: true,
                autoRefreshToken: true
            }
        });
    } catch (e) {
        console.error('Supabase client initialization error:', e);
        return null;
    }
};

const initialCreds = getStoredSupabaseCredentials();
export const supabase = createSupabaseInstance(initialCreds.url, initialCreds.key);

export const pushCustomerToCloud = async (supabaseClient, cust) => {
    if (!supabaseClient || !cust) return { success: false };
    try {
        const cleanFollowUp = {
            ...(typeof cust.followUp === 'object' && cust.followUp !== null ? cust.followUp : {}),
            ...(typeof cust.followUpByMonth === 'object' && cust.followUpByMonth !== null ? cust.followUpByMonth : {})
        };
        if (cust.nextFollowUpDate) {
            cleanFollowUp._meta = {
                ...(cleanFollowUp._meta || {}),
                nextFollowUpDate: cust.nextFollowUpDate
            };
        }

        const payload = {
            id: cust.id,
            created_at: cust.createdAt || new Date().toISOString(),
            username: cust.username && String(cust.username).trim() ? String(cust.username).trim() : null,
            full_name: cust.fullName ? String(cust.fullName).trim() : '',
            phone: cust.phone || '',
            line_oa: cust.lineOA || '',
            line_lek: cust.lineLek || 'รอแอด',
            source_channel: cust.sourceChannel || 'Facebook',
            total_deposit: parseFloat(cust.totalDeposit || 0) || 0,
            created_by: cust.createdBy || 'ระบบกลาง',
            campaign_month: cust.campaignMonth || new Date().toISOString().substring(0, 7),
            follow_up: cleanFollowUp,
            follow_up_by_month: cust.followUpByMonth || {},
            notes: cust.notes || '',
            has_deposited: Boolean(cust.hasDeposited),
            returned_deposit_amount: parseFloat(cust.returnedDepositAmount || 0) || 0,
            referrer: cust.referrer || '',
            updated_by: cust.updatedBy || null,
            updated_at: cust.updatedAt || new Date().toISOString()
        };

        let { error } = await supabaseClient
            .from('mc_customers')
            .upsert(payload, { onConflict: 'id' });

        if (error) {
            console.warn('Primary upsert notice, retrying with core columns:', error.message);
            const msg = String(error.message || '');
            if (msg.includes('referrer')) delete payload.referrer;
            if (msg.includes('line_oa')) delete payload.line_oa;
            if (msg.includes('line_lek')) delete payload.line_lek;
            if (msg.includes('returned_deposit_amount')) delete payload.returned_deposit_amount;
            if (msg.includes('follow_up_by_month')) delete payload.follow_up_by_month;
            if (msg.includes('next_follow_up_date')) delete payload.next_follow_up_date;
            if (msg.includes('updated_by')) delete payload.updated_by;
            if (msg.includes('updated_at')) delete payload.updated_at;

            // If error wasn't a specific column match, fall back to core columns
            if (msg === error.message && !msg.includes('column')) {
                delete payload.referrer;
                delete payload.line_oa;
                delete payload.line_lek;
                delete payload.returned_deposit_amount;
                delete payload.follow_up_by_month;
                delete payload.next_follow_up_date;
                delete payload.updated_by;
                delete payload.updated_at;
            }

            const res = await supabaseClient
                .from('mc_customers')
                .upsert(payload, { onConflict: 'id' });
            error = res.error;
        }

        if (error) {
            console.error('Final pushCustomerToCloud failed:', error);
            throw error;
        }
        return { success: true };
    } catch (err) {
        console.warn('pushCustomerToCloud error:', err);
        return { success: false, error: err };
    }
};

export const pushAgentToCloud = async (supabaseClient, agent) => {
    if (!supabaseClient || !agent || !agent.name) return;
    try {
        const payload = {
            name: agent.name.trim(),
            role: agent.role || 'AGENT',
            login_username: (agent.loginUsername || '').trim(),
            permissions: {
                ...(agent.permissions || {}),
                isLocked: Boolean(agent.isLocked),
                lockedReason: agent.lockedReason || null,
                lockedAt: agent.lockedAt || null
            },
            is_active: agent.isActive !== false
        };
        if (agent.id && typeof agent.id === 'number' && agent.id < 1000000000) {
            payload.id = agent.id;
        }

        let { error } = await supabaseClient
            .from('mc_agents')
            .upsert(payload, { onConflict: 'name' });

        if (error && (error.message.includes('permissions') || error.message.includes('is_active') || error.code === '42703')) {
            delete payload.permissions;
            delete payload.is_active;
            const res = await supabaseClient
                .from('mc_agents')
                .upsert(payload, { onConflict: 'name' });
            error = res.error;
        }

        if (error) throw error;
        return { success: true };
    } catch (err) {
        console.warn('pushAgentToCloud error:', err);
        return { success: false, error: err };
    }
};

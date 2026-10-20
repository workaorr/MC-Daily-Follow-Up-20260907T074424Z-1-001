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
    if (!supabaseClient || !cust) return;
    try {
        const followUpByMonth = typeof cust.followUpByMonth === 'object' && cust.followUpByMonth !== null ? { ...cust.followUpByMonth } : {};
        if (cust.nextFollowUpDate !== undefined) {
            followUpByMonth._meta = {
                ...(followUpByMonth._meta || {}),
                nextFollowUpDate: cust.nextFollowUpDate || null
            };
        }

        const payload = {
            id: cust.id,
            created_at: cust.createdAt || new Date().toISOString(),
            username: cust.username && cust.username.trim() ? cust.username.trim() : null,
            full_name: cust.fullName || '',
            phone: cust.phone || '',
            line_oa: cust.lineOA || '',
            line_lek: cust.lineLek || 'รอแอด',
            source_channel: cust.sourceChannel || 'Facebook',
            total_deposit: cust.totalDeposit || 0,
            created_by: cust.createdBy || 'ระบบกลาง',
            campaign_month: cust.campaignMonth,
            follow_up: cust.followUp || {},
            follow_up_by_month: followUpByMonth,
            notes: cust.notes || '',
            has_deposited: cust.hasDeposited || false,
            returned_deposit_amount: cust.returnedDepositAmount || 0,
            referrer: cust.referrer || ''
        };

        if (cust.nextFollowUpDate) payload.next_follow_up_date = cust.nextFollowUpDate;
        if (cust.updatedBy) payload.updated_by = cust.updatedBy;
        if (cust.updatedAt) payload.updated_at = cust.updatedAt;

        let { error } = await supabaseClient
            .from('mc_customers')
            .upsert(payload, { onConflict: 'id' });

        if (error && (error.message.includes('next_follow_up_date') || error.message.includes('line_oa') || error.message.includes('line_lek') || error.message.includes('referrer') || error.message.includes('updated_by') || error.message.includes('updated_at'))) {
            delete payload.next_follow_up_date;
            delete payload.line_oa;
            delete payload.line_lek;
            delete payload.referrer;
            delete payload.updated_by;
            delete payload.updated_at;
            const res = await supabaseClient
                .from('mc_customers')
                .upsert(payload, { onConflict: 'id' });
            error = res.error;
        }

        if (error) throw error;
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

import { createClient } from '@supabase/supabase-js';
export const sb = createClient(import.meta.env.VITE_SUPABASE_URL || 'http://localhost', import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'x');
export const inr = p => '₹' + (Math.abs(p) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const toPaise = v => Math.round(parseFloat(v || 0) * 100);
// equal split in paise; leftover paise go to first participants, total always exact
export const splitEqual = (total, ids) => { const n = ids.length; if (!n) return []; const b = Math.floor(total / n), r = total % n; return ids.map((id, i) => ({ user_id: id, share: b + (i < r ? 1 : 0) })) };
export const nm = (p, mode) => !p ? '?' : mode === 'full_name' ? (p.full_name || p.username) : '@' + p.username;

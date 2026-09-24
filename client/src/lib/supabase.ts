import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
    throw new Error(
        'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy client/.env.example to client/.env.local.'
    );
}

// Browser client. The session lives in localStorage and is refreshed
// automatically; all access control is enforced by RLS in the database.
export const supabase = createClient<Database>(url, key);

// Dev-only handle for debugging realtime from the browser console.
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    (window as unknown as { __supabase: typeof supabase }).__supabase = supabase;
}

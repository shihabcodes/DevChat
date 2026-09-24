import 'server-only';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { Database } from '../database.types';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const noSession = { auth: { persistSession: false, autoRefreshToken: false } };

let admin: SupabaseClient<Database> | null = null;

/** Service client: bypasses RLS. Use only for server-owned tables and writes. */
export function adminClient(): SupabaseClient<Database> {
    const secret = process.env.SUPABASE_SECRET_KEY;
    if (!secret) throw new Error('SUPABASE_SECRET_KEY is not set');
    admin ??= createClient<Database>(url, secret, noSession);
    return admin;
}

/** A client that acts as the requesting user, so RLS applies to every query. */
export function userClient(accessToken: string): SupabaseClient<Database> {
    return createClient<Database>(url, publishableKey, {
        ...noSession,
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
}

export class HttpError extends Error {
    constructor(public status: number, message: string, public code?: string) {
        super(message);
    }
}

/** Verifies the bearer token with Supabase Auth and returns the user. */
export async function requireUser(req: Request): Promise<{ user: User; token: string }> {
    const header = req.headers.get('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) throw new HttpError(401, 'Sign in required');
    const { data, error } = await adminClient().auth.getUser(token);
    if (error || !data.user) throw new HttpError(401, 'Session expired. Please sign in again.');
    return { user: data.user, token };
}

export function errorResponse(err: unknown): Response {
    if (err instanceof HttpError) {
        return Response.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error('[api] unexpected error', err);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
}

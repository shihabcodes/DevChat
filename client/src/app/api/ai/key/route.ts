// The signed-in user's OpenAI key: GET status, POST to verify + save, DELETE to remove.
// The key is encrypted here and never sent back to the browser.

import OpenAI from 'openai';
import { adminClient, errorResponse, HttpError, requireUser } from '@/lib/server/supabase';
import { encrypt, maskKey } from '@/lib/server/crypto';

export const runtime = 'nodejs';

export async function GET(req: Request) {
    try {
        const { user } = await requireUser(req);
        const { data, error } = await adminClient()
            .from('user_ai_keys')
            .select('key_mask, updated_at')
            .eq('user_id', user.id)
            .maybeSingle();
        if (error) throw error;
        return Response.json({ hasKey: Boolean(data), mask: data?.key_mask ?? null, setAt: data?.updated_at ?? null });
    } catch (err) {
        return errorResponse(err);
    }
}

export async function POST(req: Request) {
    try {
        const { user } = await requireUser(req);
        const body = await req.json().catch(() => ({}));
        const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
        if (!/^sk-[A-Za-z0-9_-]{16,250}$/.test(apiKey)) {
            throw new HttpError(400, 'That does not look like an OpenAI API key (they start with "sk-").');
        }

        // Check the key works before storing it.
        try {
            await new OpenAI({ apiKey }).models.list();
        } catch (err) {
            const status = (err as { status?: number }).status;
            if (status === 401) throw new HttpError(400, 'OpenAI rejected this key. Check it and try again.');
            if (status !== 429) throw new HttpError(502, 'Could not reach OpenAI to verify the key. Try again shortly.');
            // 429 means the key is valid but rate-limited: fine to save.
        }

        const mask = maskKey(apiKey);
        const { error } = await adminClient().from('user_ai_keys').upsert({
            user_id: user.id,
            key_enc: encrypt(apiKey),
            key_mask: mask,
            updated_at: new Date().toISOString(),
        });
        if (error) throw error;
        return Response.json({ hasKey: true, mask }, { status: 201 });
    } catch (err) {
        return errorResponse(err);
    }
}

export async function DELETE(req: Request) {
    try {
        const { user } = await requireUser(req);
        const { error } = await adminClient().from('user_ai_keys').delete().eq('user_id', user.id);
        if (error) throw error;
        return Response.json({ hasKey: false });
    } catch (err) {
        return errorResponse(err);
    }
}

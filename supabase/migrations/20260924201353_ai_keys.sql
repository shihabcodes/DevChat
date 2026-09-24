-- Bring-your-own OpenAI keys, encrypted by the Next.js server (AES-256-GCM)
-- before they reach the database. Only the server's secret key can read or
-- write this table: RLS is on with no policies, and client roles have no
-- privileges at all.

create table public.user_ai_keys (
    user_id    uuid primary key references public.profiles (id) on delete cascade,
    key_enc    text not null,
    key_mask   text not null,
    updated_at timestamptz not null default now()
);

alter table public.user_ai_keys enable row level security;
revoke all on public.user_ai_keys from anon, authenticated;

-- Who asked for each explanation, so the server can rate-limit per user.
alter table public.message_explanations
    add column requested_by uuid references public.profiles (id) on delete set null;
create index message_explanations_requested_idx
    on public.message_explanations (requested_by, created_at desc);

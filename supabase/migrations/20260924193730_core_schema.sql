-- DevChat core schema: profiles, workspaces, members, invites, channels, messages.
--
-- Security model: every table has RLS on. Membership is the single source of
-- truth for access; it is checked through SECURITY DEFINER helpers so policies
-- on workspace_members don't recurse into themselves. Multi-row writes
-- (create/join workspace) go through RPC functions instead of direct inserts.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
    id           uuid primary key references auth.users (id) on delete cascade,
    display_name text not null check (char_length(display_name) between 1 and 40),
    avatar_url   text check (avatar_url is null or char_length(avatar_url) <= 500),
    created_at   timestamptz not null default now()
);

create table public.workspaces (
    id         uuid primary key default gen_random_uuid(),
    name       text not null check (char_length(name) between 1 and 60),
    owner_id   uuid not null references public.profiles (id) on delete cascade,
    created_at timestamptz not null default now()
);

create type public.workspace_role as enum ('owner', 'admin', 'member');

create table public.workspace_members (
    workspace_id uuid not null references public.workspaces (id) on delete cascade,
    user_id      uuid not null references public.profiles (id) on delete cascade,
    role         public.workspace_role not null default 'member',
    joined_at    timestamptz not null default now(),
    primary key (workspace_id, user_id)
);
create index workspace_members_user_idx on public.workspace_members (user_id);

-- Invite codes live apart from workspaces so plain members can't read them.
create table public.workspace_invites (
    workspace_id uuid primary key references public.workspaces (id) on delete cascade,
    code         text not null unique,
    created_at   timestamptz not null default now()
);

create table public.channels (
    id           uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces (id) on delete cascade,
    name         text not null check (name ~ '^[a-z0-9][a-z0-9_-]{0,39}$'),
    description  text not null default '' check (char_length(description) <= 200),
    created_by   uuid references public.profiles (id) on delete set null,
    created_at   timestamptz not null default now(),
    unique (workspace_id, name)
);

create table public.messages (
    id         uuid primary key default gen_random_uuid(),
    channel_id uuid not null references public.channels (id) on delete cascade,
    user_id    uuid not null references public.profiles (id) on delete cascade,
    type       text not null default 'text' check (type in ('text', 'code')),
    language   text not null default '' check (char_length(language) <= 40),
    content    text not null check (char_length(content) between 1 and 8000),
    edited_at  timestamptz,
    created_at timestamptz not null default now()
);
create index messages_channel_created_idx on public.messages (channel_id, created_at desc);
create index messages_user_created_idx on public.messages (user_id, created_at desc);

-- AI explanations are written only by the server (service role), never by
-- clients, so nobody can plant a fake "AI" answer on someone else's message.
create table public.message_explanations (
    message_id uuid primary key references public.messages (id) on delete cascade,
    content    text not null,
    model      text not null,
    created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Access helpers
-- ---------------------------------------------------------------------------

create function public.is_workspace_member(ws uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
    select exists (
        select 1 from public.workspace_members
        where workspace_id = ws and user_id = (select auth.uid())
    );
$$;

create function public.is_workspace_admin(ws uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
    select exists (
        select 1 from public.workspace_members
        where workspace_id = ws and user_id = (select auth.uid())
          and role in ('owner', 'admin')
    );
$$;

create function public.is_channel_member(ch uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
    select exists (
        select 1 from public.channels c
        join public.workspace_members m on m.workspace_id = c.workspace_id
        where c.id = ch and m.user_id = (select auth.uid())
    );
$$;

create function public.shares_workspace_with(other uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
    select exists (
        select 1 from public.workspace_members a
        join public.workspace_members b on b.workspace_id = a.workspace_id
        where a.user_id = (select auth.uid()) and b.user_id = other
    );
$$;

create function public.can_use_channel_topic(topic text)
returns boolean
language plpgsql stable security definer set search_path = ''
as $$
begin
    if topic !~ '^channel:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        return false;
    end if;
    return public.is_channel_member(substr(topic, 9)::uuid);
end;
$$;

create function public.new_invite_code()
returns text
language sql volatile set search_path = ''
as $$
    select substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)
        || substr(replace(gen_random_uuid()::text, '-', ''), 1, 4);
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Every auth user gets a profile.
create function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
    insert into public.profiles (id, display_name, avatar_url)
    values (
        new.id,
        left(coalesce(
            nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
            nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
            nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
            'Guest-' || upper(substr(new.id::text, 1, 6))
        ), 40),
        new.raw_user_meta_data ->> 'avatar_url'
    );
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- Messages: stamp edits, and throttle senders (max 10 messages / 10 seconds).
create function public.messages_before_write()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
    if tg_op = 'INSERT' then
        if (select count(*) from public.messages
            where user_id = new.user_id
              and created_at > now() - interval '10 seconds') >= 10 then
            raise exception 'Slow down: too many messages' using errcode = 'P0429';
        end if;
        new.created_at := now();
        new.edited_at := null;
    elsif tg_op = 'UPDATE' then
        if new.content is distinct from old.content then
            new.edited_at := now();
        end if;
    end if;
    return new;
end;
$$;

create trigger messages_before_write
    before insert or update on public.messages
    for each row execute function public.messages_before_write();

-- ---------------------------------------------------------------------------
-- RPCs for multi-step writes
-- ---------------------------------------------------------------------------

create function public.create_workspace(p_name text)
returns public.workspaces
language plpgsql security definer set search_path = ''
as $$
declare
    uid uuid := (select auth.uid());
    ws public.workspaces;
begin
    if uid is null then
        raise exception 'Not authenticated' using errcode = '42501';
    end if;
    if (select count(*) from public.workspaces where owner_id = uid) >= 20 then
        raise exception 'Workspace limit reached' using errcode = 'P0429';
    end if;
    insert into public.workspaces (name, owner_id) values (trim(p_name), uid) returning * into ws;
    insert into public.workspace_members (workspace_id, user_id, role) values (ws.id, uid, 'owner');
    insert into public.workspace_invites (workspace_id, code) values (ws.id, public.new_invite_code());
    insert into public.channels (workspace_id, name, description, created_by)
    values (ws.id, 'general', 'General discussion', uid);
    return ws;
end;
$$;

create function public.join_workspace(p_code text)
returns public.workspaces
language plpgsql security definer set search_path = ''
as $$
declare
    uid uuid := (select auth.uid());
    ws public.workspaces;
begin
    if uid is null then
        raise exception 'Not authenticated' using errcode = '42501';
    end if;
    select w.* into ws
    from public.workspace_invites i join public.workspaces w on w.id = i.workspace_id
    where i.code = trim(p_code);
    if ws.id is null then
        raise exception 'Invalid invite code' using errcode = 'P0002';
    end if;
    insert into public.workspace_members (workspace_id, user_id, role)
    values (ws.id, uid, 'member')
    on conflict do nothing;
    return ws;
end;
$$;

create function public.rotate_invite_code(p_workspace uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
    new_code text := public.new_invite_code();
begin
    if not public.is_workspace_admin(p_workspace) then
        raise exception 'Only workspace admins can rotate the invite code' using errcode = '42501';
    end if;
    update public.workspace_invites set code = new_code, created_at = now()
    where workspace_id = p_workspace;
    return new_code;
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges: nothing for anon; column-limited updates for authenticated.
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;
revoke all on all functions in schema public from anon, public;

revoke insert, update, delete on public.workspaces, public.workspace_members,
    public.workspace_invites, public.message_explanations from authenticated;
revoke insert, update on public.profiles from authenticated;
revoke update on public.channels, public.messages from authenticated;

grant update (display_name, avatar_url) on public.profiles to authenticated;
grant update (name) on public.workspaces to authenticated;
grant delete on public.workspaces, public.workspace_members to authenticated;
grant update (name, description) on public.channels to authenticated;
grant update (content) on public.messages to authenticated;

grant execute on function
    public.is_workspace_member(uuid), public.is_workspace_admin(uuid),
    public.is_channel_member(uuid), public.shares_workspace_with(uuid),
    public.can_use_channel_topic(text),
    public.create_workspace(text), public.join_workspace(text),
    public.rotate_invite_code(uuid)
to authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles             enable row level security;
alter table public.workspaces           enable row level security;
alter table public.workspace_members    enable row level security;
alter table public.workspace_invites    enable row level security;
alter table public.channels             enable row level security;
alter table public.messages             enable row level security;
alter table public.message_explanations enable row level security;

-- profiles
create policy "read own and teammates' profiles" on public.profiles
    for select to authenticated
    using (id = (select auth.uid()) or public.shares_workspace_with(id));
create policy "update own profile" on public.profiles
    for update to authenticated
    using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- workspaces
create policy "members read workspace" on public.workspaces
    for select to authenticated using (public.is_workspace_member(id));
create policy "admins rename workspace" on public.workspaces
    for update to authenticated
    using (public.is_workspace_admin(id)) with check (public.is_workspace_admin(id));
create policy "owner deletes workspace" on public.workspaces
    for delete to authenticated using (owner_id = (select auth.uid()));

-- workspace_members
create policy "members read membership" on public.workspace_members
    for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "leave or remove member" on public.workspace_members
    for delete to authenticated
    using (
        role <> 'owner'
        and (user_id = (select auth.uid()) or public.is_workspace_admin(workspace_id))
    );

-- workspace_invites
create policy "admins read invite code" on public.workspace_invites
    for select to authenticated using (public.is_workspace_admin(workspace_id));

-- channels
create policy "members read channels" on public.channels
    for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "members create channels" on public.channels
    for insert to authenticated
    with check (public.is_workspace_member(workspace_id) and created_by = (select auth.uid()));
create policy "creator or admin edits channel" on public.channels
    for update to authenticated
    using (created_by = (select auth.uid()) or public.is_workspace_admin(workspace_id))
    with check (public.is_workspace_member(workspace_id));
create policy "creator or admin deletes channel" on public.channels
    for delete to authenticated
    using (created_by = (select auth.uid()) or public.is_workspace_admin(workspace_id));

-- messages
create policy "members read messages" on public.messages
    for select to authenticated using (public.is_channel_member(channel_id));
create policy "members post as themselves" on public.messages
    for insert to authenticated
    with check (user_id = (select auth.uid()) and public.is_channel_member(channel_id));
create policy "authors edit own messages" on public.messages
    for update to authenticated
    using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "authors or admins delete messages" on public.messages
    for delete to authenticated
    using (
        user_id = (select auth.uid())
        or exists (
            select 1 from public.channels c
            where c.id = channel_id and public.is_workspace_admin(c.workspace_id)
        )
    );

-- message_explanations: read-only for members; server writes with service role.
create policy "members read explanations" on public.message_explanations
    for select to authenticated
    using (exists (
        select 1 from public.messages m
        where m.id = message_id and public.is_channel_member(m.channel_id)
    ));

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

-- Row changes on messages stream to subscribers; RLS above filters them.
alter publication supabase_realtime add table public.messages;

-- Private broadcast/presence topics ("channel:<uuid>") for typing + online
-- status, authorized by channel membership.
create policy "members receive channel topic" on realtime.messages
    for select to authenticated using (public.can_use_channel_topic(realtime.topic()));
create policy "members send to channel topic" on realtime.messages
    for insert to authenticated with check (public.can_use_channel_topic(realtime.topic()));

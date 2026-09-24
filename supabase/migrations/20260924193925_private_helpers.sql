-- Move RLS helpers and trigger functions out of the API-exposed public schema,
-- so they can't be called via /rest/v1/rpc. Policies keep working: they
-- reference functions by OID, and authenticated keeps USAGE + EXECUTE.

create schema if not exists private;
grant usage on schema private to authenticated;

alter function public.is_workspace_member(uuid)       set schema private;
alter function public.is_workspace_admin(uuid)        set schema private;
alter function public.is_channel_member(uuid)         set schema private;
alter function public.shares_workspace_with(uuid)     set schema private;
alter function public.can_use_channel_topic(text)     set schema private;
alter function public.new_invite_code()               set schema private;
alter function public.handle_new_user()               set schema private;
alter function public.messages_before_write()         set schema private;

revoke execute on function private.new_invite_code(), private.handle_new_user(),
    private.messages_before_write() from public, anon, authenticated;

-- Function bodies are resolved at run time, so repoint the ones that call helpers.
create or replace function private.can_use_channel_topic(topic text)
returns boolean
language plpgsql stable security definer set search_path = ''
as $$
begin
    if topic !~ '^channel:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        return false;
    end if;
    return private.is_channel_member(substr(topic, 9)::uuid);
end;
$$;

create or replace function public.create_workspace(p_name text)
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
    insert into public.workspace_invites (workspace_id, code) values (ws.id, private.new_invite_code());
    insert into public.channels (workspace_id, name, description, created_by)
    values (ws.id, 'general', 'General discussion', uid);
    return ws;
end;
$$;

create or replace function public.rotate_invite_code(p_workspace uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
    new_code text := private.new_invite_code();
begin
    if not private.is_workspace_admin(p_workspace) then
        raise exception 'Only workspace admins can rotate the invite code' using errcode = '42501';
    end if;
    update public.workspace_invites set code = new_code, created_at = now()
    where workspace_id = p_workspace;
    return new_code;
end;
$$;

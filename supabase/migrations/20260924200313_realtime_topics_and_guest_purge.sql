-- Realtime: allow "workspace:<uuid>" topics (workspace-wide presence) in
-- addition to "channel:<uuid>" (typing). Renaming keeps the existing
-- realtime.messages policies pointing at this function.

alter function private.can_use_channel_topic(text) rename to can_use_realtime_topic;

create or replace function private.can_use_realtime_topic(topic text)
returns boolean
language plpgsql stable security definer set search_path = ''
as $$
declare
    uuid_re constant text := '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
begin
    if topic ~ ('^channel:' || uuid_re || '$') then
        return private.is_channel_member(substr(topic, 9)::uuid);
    elsif topic ~ ('^workspace:' || uuid_re || '$') then
        return private.is_workspace_member(substr(topic, 11)::uuid);
    end if;
    return false;
end;
$$;

-- Guest (anonymous) accounts from "Try the demo" are purged after 24 hours.
-- Deleting the auth user cascades to their profile, workspaces and messages.
create extension if not exists pg_cron;

select cron.schedule(
    'purge-demo-guests',
    '17 * * * *',
    $$delete from auth.users where is_anonymous and created_at < now() - interval '24 hours'$$
);

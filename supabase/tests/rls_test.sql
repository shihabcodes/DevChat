-- RLS smoke test. Run against the linked project:
--   supabase db query --linked -f supabase/tests/rls_test.sql
-- Creates three throwaway auth users, exercises the policies as each of them,
-- deletes the users (cascading everything they made), and returns one row per
-- check. Every row should have pass = true.

create temp table t_results (n serial, check_name text, pass boolean, detail text);
create temp table t_ctx (k text primary key, v text);
grant all on t_results, t_ctx to authenticated, anon;
grant usage on sequence t_results_n_seq to authenticated, anon;

insert into t_ctx values
    ('alice', gen_random_uuid()::text),
    ('bob',   gen_random_uuid()::text),
    ('eve',   gen_random_uuid()::text);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
select v::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       k || '-' || left(v, 8) || '@rls-test.invalid',
       jsonb_build_object('display_name', initcap(k)), now(), now()
from t_ctx;

create function pg_temp.ok(name text, cond boolean, detail text default null) returns void
language sql as $$ insert into t_results (check_name, pass, detail) values (name, coalesce(cond, false), detail) $$;

create function pg_temp.act_as(who text) returns void language plpgsql as $$
begin
    perform set_config('request.jwt.claims',
        json_build_object('sub', (select v from t_ctx where k = who), 'role', 'authenticated')::text, false);
    perform set_config('role', 'authenticated', false);
end $$;

select pg_temp.ok('trigger created 3 profiles',
    (select count(*) from public.profiles p join t_ctx c on c.v::uuid = p.id) = 3);

-- ----- Alice: owner --------------------------------------------------------
select pg_temp.act_as('alice');
do $$
declare ws public.workspaces; ch uuid;
begin
    ws := public.create_workspace('RLS Test WS');
    select id into ch from public.channels where workspace_id = ws.id and name = 'general';
    insert into t_ctx values ('ws', ws.id::text), ('ch', ch::text);
    insert into public.messages (channel_id, user_id, content) values (ch, auth.uid(), 'hello from alice');
    perform pg_temp.ok('owner: create_workspace makes #general', ch is not null);
    perform pg_temp.ok('owner: can read invite code',
        (select count(*) from public.workspace_invites where workspace_id = ws.id) = 1);
    insert into t_ctx select 'code', code from public.workspace_invites where workspace_id = ws.id;
end $$;
reset role;

-- ----- Bob: joins as member ------------------------------------------------
select pg_temp.act_as('bob');
do $$
declare ws uuid := (select v::uuid from t_ctx where k = 'ws');
        ch uuid := (select v::uuid from t_ctx where k = 'ch');
        alice uuid := (select v::uuid from t_ctx where k = 'alice');
        n int;
begin
    perform public.join_workspace((select v from t_ctx where k = 'code'));
    perform pg_temp.ok('member: sees messages after joining',
        (select count(*) from public.messages where channel_id = ch) = 1);
    perform pg_temp.ok('member: can NOT read invite code',
        (select count(*) from public.workspace_invites where workspace_id = ws) = 0);
    perform pg_temp.ok('member: can read teammate profile',
        (select count(*) from public.profiles where id = alice) = 1);

    insert into public.messages (channel_id, user_id, content) values (ch, auth.uid(), 'hi from bob');

    update public.messages set content = 'hacked' where user_id = alice;
    get diagnostics n = row_count;
    perform pg_temp.ok('member: can NOT edit others'' messages', n = 0);

    delete from public.messages where user_id = alice;
    get diagnostics n = row_count;
    perform pg_temp.ok('member: can NOT delete others'' messages', n = 0);

    delete from public.workspace_members where user_id = alice;
    get diagnostics n = row_count;
    perform pg_temp.ok('member: can NOT remove the owner', n = 0);

    begin
        insert into public.messages (channel_id, user_id, content) values (ch, alice, 'spoofed');
        perform pg_temp.ok('member: can NOT post as someone else', false);
    exception when insufficient_privilege then
        perform pg_temp.ok('member: can NOT post as someone else', true);
    end;

    begin
        update public.messages set channel_id = gen_random_uuid() where user_id = auth.uid();
        perform pg_temp.ok('member: can NOT move messages between channels', false);
    exception when insufficient_privilege then
        perform pg_temp.ok('member: can NOT move messages between channels', true);
    end;

    begin
        update public.workspace_members set role = 'owner' where user_id = auth.uid();
        perform pg_temp.ok('member: can NOT promote self', false);
    exception when insufficient_privilege then
        perform pg_temp.ok('member: can NOT promote self', true);
    end;

    begin
        insert into public.message_explanations (message_id, content, model)
        select id, 'fake AI answer', 'x' from public.messages where user_id = alice;
        perform pg_temp.ok('member: can NOT write AI explanations', false);
    exception when insufficient_privilege then
        perform pg_temp.ok('member: can NOT write AI explanations', true);
    end;

    begin
        perform public.rotate_invite_code(ws);
        perform pg_temp.ok('member: can NOT rotate invite code', false);
    exception when insufficient_privilege then
        perform pg_temp.ok('member: can NOT rotate invite code', true);
    end;

    begin
        truncate public.messages;
        perform pg_temp.ok('member: can NOT truncate tables', false);
    exception when insufficient_privilege then
        perform pg_temp.ok('member: can NOT truncate tables', true);
    end;

    perform pg_temp.ok('realtime: member may join channel topic',
        private.can_use_realtime_topic('channel:' || ch));
    perform pg_temp.ok('realtime: member may join workspace topic',
        private.can_use_realtime_topic('workspace:' || ws));
    perform pg_temp.ok('realtime: malformed topic rejected',
        not private.can_use_realtime_topic('channel:not-a-uuid'));

    -- Rate limit: bob already sent 1; 10 more should trip the 10-per-10s cap.
    begin
        for i in 1..10 loop
            insert into public.messages (channel_id, user_id, content) values (ch, auth.uid(), 'spam ' || i);
        end loop;
        perform pg_temp.ok('rate limit: 11th message in 10s rejected', false);
    exception when sqlstate 'P0429' then
        perform pg_temp.ok('rate limit: 11th message in 10s rejected', true);
    end;
end $$;
reset role;

-- ----- Eve: outsider -------------------------------------------------------
select pg_temp.act_as('eve');
do $$
declare ws uuid := (select v::uuid from t_ctx where k = 'ws');
        ch uuid := (select v::uuid from t_ctx where k = 'ch');
        alice uuid := (select v::uuid from t_ctx where k = 'alice');
begin
    perform pg_temp.ok('outsider: sees no workspace',  (select count(*) from public.workspaces where id = ws) = 0);
    perform pg_temp.ok('outsider: sees no channels',   (select count(*) from public.channels where workspace_id = ws) = 0);
    perform pg_temp.ok('outsider: sees no messages',   (select count(*) from public.messages where channel_id = ch) = 0);
    perform pg_temp.ok('outsider: sees no members',    (select count(*) from public.workspace_members where workspace_id = ws) = 0);
    perform pg_temp.ok('outsider: can NOT see stranger profile', (select count(*) from public.profiles where id = alice) = 0);
    perform pg_temp.ok('outsider: can NOT read AI explanations',
        (select count(*) from public.message_explanations e join public.messages m on m.id = e.message_id where m.channel_id = ch) = 0);
    begin
        perform count(*) from public.user_ai_keys;
        perform pg_temp.ok('users can NOT read stored AI keys', false);
    exception when insufficient_privilege then
        perform pg_temp.ok('users can NOT read stored AI keys', true);
    end;
    perform pg_temp.ok('realtime: outsider blocked from workspace topic',
        not private.can_use_realtime_topic('workspace:' || ws));
    perform pg_temp.ok('realtime: outsider blocked from channel topic',
        not private.can_use_realtime_topic('channel:' || ch));
    begin
        insert into public.messages (channel_id, user_id, content) values (ch, auth.uid(), 'intruder');
        perform pg_temp.ok('outsider: can NOT post into channel', false);
    exception when insufficient_privilege then
        perform pg_temp.ok('outsider: can NOT post into channel', true);
    end;
    begin
        perform public.join_workspace('wrong-code-123');
        perform pg_temp.ok('outsider: bad invite code rejected', false);
    exception when no_data_found then
        perform pg_temp.ok('outsider: bad invite code rejected', true);
    end;
end $$;
reset role;

-- ----- Anonymous (no login) ------------------------------------------------
set role anon;
do $$
begin
    perform count(*) from public.messages;
    perform pg_temp.ok('anon: can NOT query tables', false);
exception when insufficient_privilege then
    perform pg_temp.ok('anon: can NOT query tables', true);
end $$;
reset role;

-- ----- Alice moderates, Bob leaves -----------------------------------------
select pg_temp.act_as('alice');
do $$
declare n int; bob uuid := (select v::uuid from t_ctx where k = 'bob');
begin
    delete from public.messages where user_id = bob and content = 'hi from bob';
    get diagnostics n = row_count;
    perform pg_temp.ok('owner: can delete a member''s message', n = 1);
end $$;
reset role;

select pg_temp.act_as('bob');
do $$
declare n int; ch uuid := (select v::uuid from t_ctx where k = 'ch');
begin
    delete from public.workspace_members where user_id = auth.uid();
    get diagnostics n = row_count;
    perform pg_temp.ok('member: can leave workspace', n = 1);
    perform pg_temp.ok('ex-member: loses access to messages',
        (select count(*) from public.messages where channel_id = ch) = 0);
end $$;
reset role;

-- ----- Cleanup: deleting auth users cascades to everything they created ----
delete from public.workspaces where id = (select v::uuid from t_ctx where k = 'ws');
delete from auth.users where id in (select v::uuid from t_ctx where k in ('alice', 'bob', 'eve'));
select pg_temp.ok('cleanup: no test data left',
    (select count(*) from public.profiles p join t_ctx c on c.v::uuid = p.id) = 0);

select n, pass, check_name, detail from t_results order by n;

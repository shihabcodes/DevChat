-- An AI explanation describes a specific version of a snippet. When the
-- message content changes, drop the cached explanation so it can't go stale.

create function private.clear_explanation_on_edit()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
    delete from public.message_explanations where message_id = new.id;
    return new;
end;
$$;

revoke execute on function private.clear_explanation_on_edit() from public, anon, authenticated;

create trigger messages_clear_explanation
    after update of content on public.messages
    for each row
    when (old.content is distinct from new.content)
    execute function private.clear_explanation_on_edit();

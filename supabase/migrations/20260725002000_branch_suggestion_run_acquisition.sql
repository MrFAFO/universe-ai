-- Universe AI — Stage D4.4a: branch suggestion run acquisition

-- ---------------------------------------------------------------------------
-- 1. Deterministic duplicate-running backfill
-- ---------------------------------------------------------------------------

-- Prevent concurrent ai_runs writes between the backfill and unique-index creation.
lock table public.ai_runs in share row exclusive mode;
with ranked_running as (
  select
    id,
    row_number() over (
      partition by conversation_id
      order by created_at desc, id desc
    ) as row_num
  from public.ai_runs
  where status = 'running'::public.ai_run_status
    and metadata is not null
    and metadata ->> 'purpose' = 'branch_suggestion'
)
update public.ai_runs ar
set
  status = 'failed'::public.ai_run_status,
  error = 'Superseded by concurrent branch suggestion generation during invariant backfill',
  completed_at = pg_catalog.now()
from ranked_running rr
where ar.id = rr.id
  and rr.row_num > 1;

-- ---------------------------------------------------------------------------
-- 2. One running Branch Suggestion ai_run per conversation
-- ---------------------------------------------------------------------------

create unique index if not exists ai_runs_one_running_branch_suggestion_per_conversation_idx
  on public.ai_runs (conversation_id)
  where status = 'running'::public.ai_run_status
    and metadata ->> 'purpose' = 'branch_suggestion';

-- ---------------------------------------------------------------------------
-- RPC: begin_branch_suggestion_ai_run
-- ---------------------------------------------------------------------------

create or replace function public.begin_branch_suggestion_ai_run(
  p_conversation_id uuid,
  p_model text,
  p_schema_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conversation public.conversations%rowtype;
  v_parent public.nodes%rowtype;
  v_world_id uuid;
  v_root_node_id uuid;
  v_inserted public.ai_runs%rowtype;
  v_stale_threshold interval := interval '15 minutes';
begin
  if p_model is null
    or pg_catalog.char_length(pg_catalog.btrim(p_model)) = 0 then
    raise exception 'Model is required';
  end if;

  if p_schema_version is distinct from 1 then
    raise exception 'Invalid schema version';
  end if;

  select *
  into v_conversation
  from public.conversations
  where id = p_conversation_id;

  if not found then
    raise exception 'Conversation not found';
  end if;

  if v_conversation.kind <> 'planning'::public.conversation_kind then
    raise exception 'Conversation is not a planning conversation';
  end if;

  select *
  into v_parent
  from public.nodes
  where id = v_conversation.node_id;

  if not found then
    raise exception 'Conversation node not found';
  end if;

  if v_parent.kind <> 'root'::public.node_kind
    or v_parent.parent_id is not null then
    raise exception 'Conversation node is not root';
  end if;

  if v_parent.world_id <> v_conversation.world_id then
    raise exception 'Conversation node does not belong to conversation world';
  end if;

  v_world_id := v_conversation.world_id;
  v_root_node_id := v_parent.id;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(v_world_id::text),
    pg_catalog.hashtext('branch_suggestion_world_root'::text)
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(p_conversation_id::text),
    pg_catalog.hashtext('branch_suggestion_conversation'::text)
  );

  select *
  into v_conversation
  from public.conversations
  where id = p_conversation_id;

  if not found then
    raise exception 'Conversation not found';
  end if;

  if v_conversation.kind <> 'planning'::public.conversation_kind then
    raise exception 'Conversation is not a planning conversation';
  end if;

  select *
  into v_parent
  from public.nodes
  where id = v_conversation.node_id;

  if not found then
    raise exception 'Conversation node not found';
  end if;

  if v_parent.kind <> 'root'::public.node_kind
    or v_parent.parent_id is not null then
    raise exception 'Conversation node is not root';
  end if;

  if v_parent.world_id <> v_conversation.world_id then
    raise exception 'Conversation node does not belong to conversation world';
  end if;

  if v_parent.id <> v_root_node_id
    or v_conversation.world_id <> v_world_id then
    raise exception 'Conversation context changed during lock acquisition';
  end if;

  if exists (
    select 1
    from public.nodes n
    where n.world_id = v_world_id
      and n.kind = 'topic'::public.node_kind
      and n.parent_id = v_root_node_id
  ) then
    raise exception 'structure_already_exists';
  end if;

  update public.ai_runs ar
  set
    status = 'failed'::public.ai_run_status,
    error = 'Stale branch suggestion generation expired',
    completed_at = pg_catalog.now()
  where ar.conversation_id = p_conversation_id
    and ar.status = 'running'::public.ai_run_status
    and ar.metadata is not null
    and ar.metadata ->> 'purpose' = 'branch_suggestion'
    and ar.created_at < pg_catalog.now() - v_stale_threshold;

  if exists (
    select 1
    from public.ai_runs ar
    where ar.conversation_id = p_conversation_id
      and ar.status = 'running'::public.ai_run_status
      and ar.metadata is not null
      and ar.metadata ->> 'purpose' = 'branch_suggestion'
  ) then
    raise exception 'generation_in_progress';
  end if;

  insert into public.ai_runs (
    conversation_id,
    model,
    status,
    metadata
  )
  values (
    p_conversation_id,
    pg_catalog.btrim(p_model),
    'running'::public.ai_run_status,
    pg_catalog.jsonb_build_object(
      'purpose', 'branch_suggestion',
      'schemaVersion', p_schema_version
    )
  )
  returning * into v_inserted;

  return pg_catalog.to_jsonb(v_inserted);
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke execute on function public.begin_branch_suggestion_ai_run(uuid, text, integer) from public;
revoke execute on function public.begin_branch_suggestion_ai_run(uuid, text, integer) from anon;
revoke execute on function public.begin_branch_suggestion_ai_run(uuid, text, integer) from authenticated;
grant execute on function public.begin_branch_suggestion_ai_run(uuid, text, integer) to service_role;

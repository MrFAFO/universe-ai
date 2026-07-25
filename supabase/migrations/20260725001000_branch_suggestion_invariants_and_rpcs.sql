-- Universe AI — Stage D4.2: branch suggestion invariants and RPCs

-- Active Branch Suggestion run uniqueness (one running ai_run per conversation)
-- will be added in a later migration together with atomic stale-run handling
-- and application integration. This migration does not modify ai_runs.

-- ---------------------------------------------------------------------------
-- 1. Supersede pending proposals whose World already has initial structure
-- ---------------------------------------------------------------------------

update public.branch_suggestions bs
set
  status = 'superseded'::public.branch_suggestion_status,
  decided_at = pg_catalog.now()
where bs.status = 'pending'::public.branch_suggestion_status
  and exists (
    select 1
    from public.nodes n
    where n.world_id = bs.world_id
      and n.kind = 'topic'::public.node_kind
      and n.parent_id = bs.parent_node_id
  );

-- ---------------------------------------------------------------------------
-- 2. Deterministic duplicate-pending backfill
-- ---------------------------------------------------------------------------

with ranked_pending as (
  select
    id,
    row_number() over (
      partition by conversation_id
      order by created_at desc, id desc
    ) as row_num
  from public.branch_suggestions
  where status = 'pending'::public.branch_suggestion_status
)
update public.branch_suggestions bs
set
  status = 'superseded'::public.branch_suggestion_status,
  decided_at = pg_catalog.now()
from ranked_pending rp
where bs.id = rp.id
  and rp.row_num > 1;

-- ---------------------------------------------------------------------------
-- 3. One pending proposal per conversation
-- ---------------------------------------------------------------------------

create unique index if not exists branch_suggestions_one_pending_per_conversation_idx
  on public.branch_suggestions (conversation_id)
  where status = 'pending'::public.branch_suggestion_status;

-- ---------------------------------------------------------------------------
-- RPC: replace_pending_branch_suggestion
-- ---------------------------------------------------------------------------

create or replace function public.replace_pending_branch_suggestion(
  p_conversation_id uuid,
  p_ai_run_id uuid,
  p_schema_version integer,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conversation public.conversations%rowtype;
  v_parent public.nodes%rowtype;
  v_ai_run public.ai_runs%rowtype;
  v_world_id uuid;
  v_root_node_id uuid;
  v_nodes jsonb;
  v_inserted public.branch_suggestions%rowtype;
begin
  if p_schema_version is distinct from 1 then
    raise exception 'Invalid schema version';
  end if;

  if p_payload is null
    or pg_catalog.jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Invalid suggestion payload: object required';
  end if;

  if (p_payload ->> 'schemaVersion')::integer is distinct from 1 then
    raise exception 'Invalid suggestion payload: schemaVersion mismatch';
  end if;

  v_nodes := p_payload -> 'nodes';

  if v_nodes is null
    or pg_catalog.jsonb_typeof(v_nodes) <> 'array'
    or pg_catalog.jsonb_array_length(v_nodes) = 0 then
    raise exception 'Invalid suggestion payload: nodes array required';
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

  select *
  into v_ai_run
  from public.ai_runs
  where id = p_ai_run_id;

  if not found then
    raise exception 'ai_run not found';
  end if;

  if v_ai_run.conversation_id <> p_conversation_id then
    raise exception 'ai_run does not belong to conversation';
  end if;

  if v_ai_run.status <> 'running'::public.ai_run_status then
    raise exception 'ai_run is not running';
  end if;

  if v_ai_run.metadata is null
    or v_ai_run.metadata ->> 'purpose' <> 'branch_suggestion'
    or (v_ai_run.metadata ->> 'schemaVersion')::integer is distinct from 1 then
    raise exception 'ai_run is not a branch suggestion generation run';
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

  update public.branch_suggestions
  set
    status = 'superseded'::public.branch_suggestion_status,
    decided_at = pg_catalog.now()
  where conversation_id = p_conversation_id
    and status = 'pending'::public.branch_suggestion_status;

  insert into public.branch_suggestions (
    world_id,
    conversation_id,
    parent_node_id,
    ai_run_id,
    status,
    schema_version,
    payload,
    created_node_ids,
    decided_at
  )
  values (
    v_world_id,
    p_conversation_id,
    v_root_node_id,
    p_ai_run_id,
    'pending'::public.branch_suggestion_status,
    1,
    p_payload,
    null,
    null
  )
  returning * into v_inserted;

  return pg_catalog.to_jsonb(v_inserted);
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: approve_branch_suggestion (hardened)
-- ---------------------------------------------------------------------------

create or replace function public.approve_branch_suggestion(
  p_suggestion_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_suggestion public.branch_suggestions%rowtype;
  v_parent public.nodes%rowtype;
  v_conversation public.conversations%rowtype;
  v_world_id uuid;
  v_root_node_id uuid;
  v_node jsonb;
  v_nodes jsonb;
  v_new_id uuid;
  v_created_ids uuid[] := '{}';
  v_count integer;
  v_index integer := 0;
begin
  select *
  into v_suggestion
  from public.branch_suggestions
  where id = p_suggestion_id;

  if not found then
    raise exception 'Suggestion not found';
  end if;

  if v_suggestion.status = 'approved'::public.branch_suggestion_status then
    return pg_catalog.jsonb_build_object(
      'suggestion_id', v_suggestion.id,
      'status', 'approved',
      'created_node_ids', coalesce(v_suggestion.created_node_ids, '[]'::jsonb),
      'idempotent', true
    );
  end if;

  select *
  into v_conversation
  from public.conversations
  where id = v_suggestion.conversation_id;

  if not found then
    raise exception 'Conversation not found';
  end if;

  if v_conversation.kind <> 'planning'::public.conversation_kind then
    raise exception 'Conversation is not a planning conversation';
  end if;

  if v_conversation.world_id <> v_suggestion.world_id then
    raise exception 'Suggestion does not belong to conversation world';
  end if;

  select *
  into v_parent
  from public.nodes
  where id = v_suggestion.parent_node_id;

  if not found then
    raise exception 'Parent node not found';
  end if;

  if v_parent.id <> v_conversation.node_id then
    raise exception 'Suggestion parent is not conversation root node';
  end if;

  if v_parent.kind <> 'root'::public.node_kind
    or v_parent.parent_id is not null then
    raise exception 'Parent node is not root';
  end if;

  if v_parent.world_id <> v_suggestion.world_id then
    raise exception 'Parent node does not belong to suggestion world';
  end if;

  v_world_id := v_suggestion.world_id;
  v_root_node_id := v_parent.id;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(v_world_id::text),
    pg_catalog.hashtext('branch_suggestion_world_root'::text)
  );

  select *
  into v_suggestion
  from public.branch_suggestions
  where id = p_suggestion_id
  for update;

  if not found then
    raise exception 'Suggestion not found';
  end if;

  if v_suggestion.status = 'approved'::public.branch_suggestion_status then
    return pg_catalog.jsonb_build_object(
      'suggestion_id', v_suggestion.id,
      'status', 'approved',
      'created_node_ids', coalesce(v_suggestion.created_node_ids, '[]'::jsonb),
      'idempotent', true
    );
  end if;

  if v_suggestion.status = 'rejected'::public.branch_suggestion_status then
    raise exception 'Suggestion has already been rejected';
  end if;

  if v_suggestion.status = 'superseded'::public.branch_suggestion_status then
    raise exception 'Suggestion has been superseded';
  end if;

  if v_suggestion.status <> 'pending'::public.branch_suggestion_status then
    raise exception 'Suggestion is not pending';
  end if;

  select *
  into v_conversation
  from public.conversations
  where id = v_suggestion.conversation_id;

  if not found then
    raise exception 'Conversation not found';
  end if;

  if v_conversation.kind <> 'planning'::public.conversation_kind then
    raise exception 'Conversation is not a planning conversation';
  end if;

  if v_conversation.world_id <> v_suggestion.world_id then
    raise exception 'Suggestion does not belong to conversation world';
  end if;

  select *
  into v_parent
  from public.nodes
  where id = v_suggestion.parent_node_id;

  if not found then
    raise exception 'Parent node not found';
  end if;

  if v_parent.id <> v_conversation.node_id then
    raise exception 'Suggestion parent is not conversation root node';
  end if;

  if v_parent.kind <> 'root'::public.node_kind
    or v_parent.parent_id is not null then
    raise exception 'Parent node is not root';
  end if;

  if v_parent.world_id <> v_suggestion.world_id then
    raise exception 'Parent node does not belong to suggestion world';
  end if;

  if v_parent.id <> v_root_node_id
    or v_suggestion.world_id <> v_world_id then
    raise exception 'Suggestion context changed during lock acquisition';
  end if;

  v_nodes := v_suggestion.payload -> 'nodes';

  if v_nodes is null
    or pg_catalog.jsonb_typeof(v_nodes) <> 'array'
    or pg_catalog.jsonb_array_length(v_nodes) = 0 then
    raise exception 'Invalid suggestion payload: nodes array required';
  end if;

  if v_suggestion.schema_version is distinct from 1 then
    raise exception 'Invalid suggestion schema version';
  end if;

  if (v_suggestion.payload ->> 'schemaVersion')::integer is distinct from 1 then
    raise exception 'Invalid suggestion payload: schemaVersion mismatch';
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

  v_count := pg_catalog.jsonb_array_length(v_nodes);

  for v_node in
    select value
    from pg_catalog.jsonb_array_elements(v_nodes)
  loop
    insert into public.nodes (
      world_id,
      parent_id,
      kind,
      title,
      description,
      goal,
      status,
      progress,
      position_x,
      position_y
    )
    values (
      v_suggestion.world_id,
      v_suggestion.parent_node_id,
      'topic'::public.node_kind,
      coalesce(
        nullif(pg_catalog.btrim(v_node ->> 'title'), ''),
        'Untitled'
      ),
      coalesce(v_node ->> 'description', ''),
      coalesce(v_node ->> 'goal', ''),
      'planning'::public.world_status,
      0,
      v_parent.position_x + (v_index - ((v_count - 1)::float / 2.0)) * 280,
      v_parent.position_y + 220
    )
    returning id into v_new_id;

    v_created_ids := pg_catalog.array_append(v_created_ids, v_new_id);
    v_index := v_index + 1;
  end loop;

  update public.branch_suggestions
  set
    status = 'approved'::public.branch_suggestion_status,
    created_node_ids = pg_catalog.to_jsonb(v_created_ids),
    decided_at = pg_catalog.now()
  where id = p_suggestion_id;

  return pg_catalog.jsonb_build_object(
    'suggestion_id', p_suggestion_id,
    'status', 'approved',
    'created_node_ids', pg_catalog.to_jsonb(v_created_ids),
    'idempotent', false
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: reject_branch_suggestion
-- ---------------------------------------------------------------------------

create or replace function public.reject_branch_suggestion(
  p_suggestion_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_suggestion public.branch_suggestions%rowtype;
begin
  select *
  into v_suggestion
  from public.branch_suggestions
  where id = p_suggestion_id
  for update;

  if not found then
    raise exception 'Suggestion not found';
  end if;

  if v_suggestion.status = 'rejected'::public.branch_suggestion_status then
    return pg_catalog.jsonb_build_object(
      'suggestion_id', v_suggestion.id,
      'status', 'rejected',
      'decided_at', v_suggestion.decided_at,
      'idempotent', true
    );
  end if;

  if v_suggestion.status = 'approved'::public.branch_suggestion_status then
    raise exception 'Suggestion has already been approved';
  end if;

  if v_suggestion.status = 'superseded'::public.branch_suggestion_status then
    raise exception 'Suggestion has been superseded';
  end if;

  if v_suggestion.status <> 'pending'::public.branch_suggestion_status then
    raise exception 'Suggestion is not pending';
  end if;

  update public.branch_suggestions
  set
    status = 'rejected'::public.branch_suggestion_status,
    decided_at = pg_catalog.now()
  where id = p_suggestion_id
  returning * into v_suggestion;

  return pg_catalog.jsonb_build_object(
    'suggestion_id', v_suggestion.id,
    'status', 'rejected',
    'decided_at', v_suggestion.decided_at,
    'idempotent', false
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke execute on function public.replace_pending_branch_suggestion(uuid, uuid, integer, jsonb) from public;
revoke execute on function public.replace_pending_branch_suggestion(uuid, uuid, integer, jsonb) from anon;
revoke execute on function public.replace_pending_branch_suggestion(uuid, uuid, integer, jsonb) from authenticated;
grant execute on function public.replace_pending_branch_suggestion(uuid, uuid, integer, jsonb) to service_role;

revoke execute on function public.approve_branch_suggestion(uuid) from public;
revoke execute on function public.approve_branch_suggestion(uuid) from anon;
revoke execute on function public.approve_branch_suggestion(uuid) from authenticated;
grant execute on function public.approve_branch_suggestion(uuid) to service_role;

revoke execute on function public.reject_branch_suggestion(uuid) from public;
revoke execute on function public.reject_branch_suggestion(uuid) from anon;
revoke execute on function public.reject_branch_suggestion(uuid) from authenticated;
grant execute on function public.reject_branch_suggestion(uuid) to service_role;

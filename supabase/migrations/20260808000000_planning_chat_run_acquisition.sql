-- Universe AI — Stage E.1 C1: planning chat run acquisition and fenced finalization

-- ---------------------------------------------------------------------------
-- 1. One running Planning Chat ai_run per conversation
-- ---------------------------------------------------------------------------

create unique index if not exists ai_runs_one_running_planning_chat_per_conversation_idx
  on public.ai_runs (conversation_id)
  where status = 'running'::public.ai_run_status
    and metadata ->> 'purpose' = 'planning_chat';

-- ---------------------------------------------------------------------------
-- RPC: begin_planning_chat_ai_run
-- ---------------------------------------------------------------------------

create or replace function public.begin_planning_chat_ai_run(
  p_conversation_id uuid,
  p_model text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conversation public.conversations%rowtype;
  v_node public.nodes%rowtype;
  v_inserted public.ai_runs%rowtype;
  v_stale_threshold interval := interval '5 minutes';
begin
  if p_model is null
    or pg_catalog.char_length(pg_catalog.btrim(p_model)) = 0 then
    raise exception 'Model is required';
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
  into v_node
  from public.nodes
  where id = v_conversation.node_id;

  if not found then
    raise exception 'Conversation node not found';
  end if;

  if v_node.world_id <> v_conversation.world_id then
    raise exception 'Conversation node does not belong to conversation world';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(p_conversation_id::text),
    pg_catalog.hashtext('planning_chat_conversation'::text)
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
  into v_node
  from public.nodes
  where id = v_conversation.node_id;

  if not found then
    raise exception 'Conversation node not found';
  end if;

  if v_node.world_id <> v_conversation.world_id then
    raise exception 'Conversation node does not belong to conversation world';
  end if;

  update public.ai_runs ar
  set
    status = 'failed'::public.ai_run_status,
    error = 'Stale planning chat generation expired',
    completed_at = pg_catalog.now()
  where ar.conversation_id = p_conversation_id
    and ar.status = 'running'::public.ai_run_status
    and ar.metadata is not null
    and ar.metadata ->> 'purpose' = 'planning_chat'
    and ar.created_at < pg_catalog.now() - v_stale_threshold;

  if exists (
    select 1
    from public.ai_runs ar
    where ar.conversation_id = p_conversation_id
      and ar.status = 'running'::public.ai_run_status
      and ar.metadata is not null
      and ar.metadata ->> 'purpose' = 'planning_chat'
  ) then
    raise exception 'planning_run_in_progress';
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
    pg_catalog.jsonb_build_object('purpose', 'planning_chat')
  )
  returning * into v_inserted;

  return pg_catalog.to_jsonb(v_inserted);
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: complete_planning_chat_ai_run
-- ---------------------------------------------------------------------------

create or replace function public.complete_planning_chat_ai_run(
  p_ai_run_id uuid,
  p_conversation_id uuid,
  p_content text,
  p_openai_response_id text,
  p_input_tokens integer,
  p_output_tokens integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run public.ai_runs%rowtype;
  v_message public.messages%rowtype;
begin
  select *
  into v_run
  from public.ai_runs
  where id = p_ai_run_id
  for update;

  if not found
    or v_run.conversation_id is distinct from p_conversation_id
    or v_run.status <> 'running'::public.ai_run_status
    or v_run.metadata ->> 'purpose' is distinct from 'planning_chat' then
    raise exception 'planning_run_not_active';
  end if;

  insert into public.messages (
    conversation_id,
    role,
    content,
    ai_run_id
  )
  values (
    p_conversation_id,
    'assistant'::public.message_role,
    p_content,
    p_ai_run_id
  )
  returning * into v_message;

  update public.ai_runs
  set
    status = 'completed'::public.ai_run_status,
    openai_response_id = p_openai_response_id,
    input_tokens = p_input_tokens,
    output_tokens = p_output_tokens,
    completed_at = pg_catalog.now(),
    error = null
  where id = p_ai_run_id;

  return pg_catalog.to_jsonb(v_message);
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke execute on function public.begin_planning_chat_ai_run(uuid, text) from public;
revoke execute on function public.begin_planning_chat_ai_run(uuid, text) from anon;
revoke execute on function public.begin_planning_chat_ai_run(uuid, text) from authenticated;
grant execute on function public.begin_planning_chat_ai_run(uuid, text) to service_role;

revoke execute on function public.complete_planning_chat_ai_run(uuid, uuid, text, text, integer, integer) from public;
revoke execute on function public.complete_planning_chat_ai_run(uuid, uuid, text, text, integer, integer) from anon;
revoke execute on function public.complete_planning_chat_ai_run(uuid, uuid, text, text, integer, integer) from authenticated;
grant execute on function public.complete_planning_chat_ai_run(uuid, uuid, text, text, integer, integer) to service_role;

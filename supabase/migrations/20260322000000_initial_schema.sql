-- Universe AI — Stage A: initial schema, constraints, indexes and RPCs

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.world_status as enum ('active', 'planning', 'paused');

create type public.node_kind as enum ('root', 'topic');

create type public.conversation_kind as enum ('planning', 'execution');

create type public.message_role as enum ('system', 'user', 'assistant', 'tool');

create type public.ai_run_status as enum ('running', 'completed', 'failed');

create type public.branch_suggestion_status as enum ('pending', 'approved', 'rejected');

create type public.relation_type as enum (
  'dependency',
  'shared-feature',
  'shared-contract',
  'reference'
);

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- worlds
-- ---------------------------------------------------------------------------

create table public.worlds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  status public.world_status not null default 'planning',
  owner_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint worlds_name_not_blank check (char_length(trim(name)) > 0)
);

create trigger worlds_set_updated_at
  before update on public.worlds
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- nodes (primary hierarchy via parent_id)
-- ---------------------------------------------------------------------------

create table public.nodes (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds (id) on delete cascade,
  parent_id uuid null references public.nodes (id) on delete cascade,
  kind public.node_kind not null,
  title text not null,
  description text not null default '',
  goal text not null default '',
  status public.world_status not null default 'planning',
  progress integer not null default 0,
  position_x double precision not null default 0,
  position_y double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nodes_title_not_blank check (char_length(trim(title)) > 0),
  constraint nodes_progress_range check (progress between 0 and 100),
  constraint nodes_root_shape check (
    (kind = 'root' and parent_id is null)
    or (kind = 'topic' and parent_id is not null)
  )
);

create unique index nodes_one_root_per_world_idx
  on public.nodes (world_id)
  where kind = 'root';

create index nodes_world_id_idx on public.nodes (world_id);
create index nodes_parent_id_idx on public.nodes (parent_id);

create trigger nodes_set_updated_at
  before update on public.nodes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- node_relations (secondary relations only; hierarchy is nodes.parent_id)
-- ---------------------------------------------------------------------------

create table public.node_relations (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds (id) on delete cascade,
  source_node_id uuid not null references public.nodes (id) on delete cascade,
  target_node_id uuid not null references public.nodes (id) on delete cascade,
  type public.relation_type not null,
  created_at timestamptz not null default now(),
  constraint node_relations_not_self check (source_node_id <> target_node_id)
);

create index node_relations_world_id_idx on public.node_relations (world_id);
create index node_relations_source_idx on public.node_relations (source_node_id);
create index node_relations_target_idx on public.node_relations (target_node_id);

-- ---------------------------------------------------------------------------
-- conversations
-- ---------------------------------------------------------------------------

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds (id) on delete cascade,
  node_id uuid not null references public.nodes (id) on delete cascade,
  kind public.conversation_kind not null,
  title text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_node_kind_unique unique (node_id, kind)
);

create index conversations_world_id_idx on public.conversations (world_id);

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- ai_runs
-- ---------------------------------------------------------------------------

create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  model text not null,
  status public.ai_run_status not null default 'running',
  openai_response_id text null,
  input_tokens integer null,
  output_tokens integer null,
  error text null,
  metadata jsonb null,
  created_at timestamptz not null default now(),
  completed_at timestamptz null
);

create index ai_runs_conversation_id_idx on public.ai_runs (conversation_id);

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role public.message_role not null,
  content text not null,
  ai_run_id uuid null references public.ai_runs (id) on delete set null,
  ordinal bigint generated always as identity,
  created_at timestamptz not null default now()
);

create index messages_conversation_ordinal_idx
  on public.messages (conversation_id, ordinal);

-- ---------------------------------------------------------------------------
-- branch_suggestions
-- ---------------------------------------------------------------------------

create table public.branch_suggestions (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  parent_node_id uuid not null references public.nodes (id) on delete cascade,
  ai_run_id uuid null references public.ai_runs (id) on delete set null,
  status public.branch_suggestion_status not null default 'pending',
  schema_version integer not null default 1,
  payload jsonb not null,
  created_node_ids jsonb null,
  created_at timestamptz not null default now(),
  decided_at timestamptz null,
  constraint branch_suggestions_schema_version_positive check (schema_version >= 1)
);

create unique index branch_suggestions_ai_run_id_unique_idx
  on public.branch_suggestions (ai_run_id);

create index branch_suggestions_conversation_status_idx
  on public.branch_suggestions (conversation_id, status);

-- ---------------------------------------------------------------------------
-- Row Level Security (no policies yet; server uses service_role)
-- ---------------------------------------------------------------------------

alter table public.worlds enable row level security;
alter table public.nodes enable row level security;
alter table public.node_relations enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.ai_runs enable row level security;
alter table public.branch_suggestions enable row level security;

-- ---------------------------------------------------------------------------
-- RPC: create_world_with_root
-- ---------------------------------------------------------------------------

create or replace function public.create_world_with_root(
  p_name text,
  p_description text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_world_id uuid;
  v_root_id uuid;
  v_conversation_id uuid;
begin
  if p_name is null or pg_catalog.char_length(pg_catalog.trim(p_name)) = 0 then
    raise exception 'World name is required';
  end if;

  insert into public.worlds (name, description, status)
  values (
    pg_catalog.trim(p_name),
    pg_catalog.coalesce(p_description, ''),
    'planning'::public.world_status
  )
  returning id into v_world_id;

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
    v_world_id,
    null,
    'root'::public.node_kind,
    'Root Planning',
    'Project foundation and strategic planning',
    'Start the planning conversation at the root of this world.',
    'planning'::public.world_status,
    0,
    0,
    0
  )
  returning id into v_root_id;

  insert into public.conversations (world_id, node_id, kind, title)
  values (
    v_world_id,
    v_root_id,
    'planning'::public.conversation_kind,
    'Root Planning'
  )
  returning id into v_conversation_id;

  insert into public.messages (conversation_id, role, content)
  values (
    v_conversation_id,
    'system'::public.message_role,
    'You are a planning assistant for Universe AI. Help the user think through their project structure. When appropriate, suggest focused child nodes. Never assume nodes are created without explicit user approval.'
  );

  return pg_catalog.jsonb_build_object(
    'world_id', v_world_id,
    'root_node_id', v_root_id,
    'conversation_id', v_conversation_id
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: approve_branch_suggestion
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
  where id = p_suggestion_id
  for update;

  if not found then
    raise exception 'Suggestion not found';
  end if;

  if v_suggestion.status = 'approved'::public.branch_suggestion_status then
    return pg_catalog.jsonb_build_object(
      'suggestion_id', v_suggestion.id,
      'status', 'approved',
      'created_node_ids', pg_catalog.coalesce(v_suggestion.created_node_ids, '[]'::jsonb),
      'idempotent', true
    );
  end if;

  if v_suggestion.status = 'rejected'::public.branch_suggestion_status then
    raise exception 'Suggestion has already been rejected';
  end if;

  v_nodes := v_suggestion.payload -> 'nodes';

  if v_nodes is null
    or pg_catalog.jsonb_typeof(v_nodes) <> 'array'
    or pg_catalog.jsonb_array_length(v_nodes) = 0 then
    raise exception 'Invalid suggestion payload: nodes array required';
  end if;

  select *
  into v_parent
  from public.nodes
  where id = v_suggestion.parent_node_id;

  if not found then
    raise exception 'Parent node not found';
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
      pg_catalog.coalesce(
        pg_catalog.nullif(pg_catalog.trim(v_node ->> 'title'), ''),
        'Untitled'
      ),
      pg_catalog.coalesce(v_node ->> 'description', ''),
      pg_catalog.coalesce(v_node ->> 'goal', ''),
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

revoke execute on function public.create_world_with_root(text, text) from public;
revoke execute on function public.create_world_with_root(text, text) from anon;
revoke execute on function public.create_world_with_root(text, text) from authenticated;
grant execute on function public.create_world_with_root(text, text) to service_role;

revoke execute on function public.approve_branch_suggestion(uuid) from public;
revoke execute on function public.approve_branch_suggestion(uuid) from anon;
revoke execute on function public.approve_branch_suggestion(uuid) from authenticated;
grant execute on function public.approve_branch_suggestion(uuid) to service_role;

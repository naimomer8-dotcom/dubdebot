-- Dubdebot schema
create extension if not exists vector with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------- users (registered end users) ----------
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  phone text not null,
  marketing_consent boolean not null default false,
  marketing_consent_at timestamptz,
  consent_text text,                       -- exact wording the user agreed to (legal record)
  terms_accepted_at timestamptz not null,
  privacy_version text not null default 'v1',
  signup_ip text,
  user_agent text,
  utm jsonb default '{}'::jsonb,
  profile jsonb default '{}'::jsonb,       -- business profile learned from chats
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz default now()
);

-- ---------- conversations & messages ----------
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  mode text not null default 'chat',
  title text,
  cta_shown_count int not null default 0,
  lead_submitted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists conversations_user_idx on conversations(user_id, updated_at desc);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  sources jsonb default '[]'::jsonb,       -- which knowledge chunks were used
  top_similarity real,                     -- best retrieval score (low = knowledge gap)
  cta boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists messages_conv_idx on messages(conversation_id, created_at);

-- ---------- knowledge base (Nir's books, YouTube, docs) ----------
create table if not exists knowledge_chunks (
  id bigserial primary key,
  source text not null,                    -- e.g. "בסוף יצא לך ארנב"
  source_type text not null check (source_type in ('book','booklet','youtube','golden','doc','template')),
  title text,
  url text,
  chunk_index int,
  content text not null,
  embedding extensions.vector(768),
  retrievable boolean not null default true, -- false = style/template only (e.g. client work plans)
  created_at timestamptz not null default now()
);
create index if not exists knowledge_embedding_idx on knowledge_chunks using hnsw (embedding extensions.vector_cosine_ops);
create unique index if not exists knowledge_unique_chunk on knowledge_chunks(source, coalesce(url,''), chunk_index);

-- ---------- golden answers (approved by Nir) ----------
create table if not exists golden_answers (
  id bigserial primary key,
  question text not null,
  answer text not null,
  approved_by text default 'nir',
  embedding extensions.vector(768),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists golden_embedding_idx on golden_answers using hnsw (embedding extensions.vector_cosine_ops);

-- ---------- leads (meeting requests) ----------
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  conversation_id uuid references conversations(id) on delete set null,
  meeting_type text not null check (meeting_type in ('advisor','nir')),
  full_name text not null,
  phone text not null,
  email text,
  preferred_time text,
  note text,
  summary text,                            -- AI summary for the sales rep
  trigger text,                            -- what triggered the CTA
  status text not null default 'new',      -- new / contacted / meeting_set / closed / lost
  created_at timestamptz not null default now()
);
create index if not exists leads_created_idx on leads(created_at desc);

-- ---------- feedback & events (learning loop) ----------
create table if not exists feedback (
  id bigserial primary key,
  message_id uuid references messages(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  rating smallint not null check (rating in (-1, 1)),
  comment text,
  created_at timestamptz not null default now(),
  unique (message_id, user_id)
);

create table if not exists events (
  id bigserial primary key,
  user_id uuid references users(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete cascade,
  type text not null,                      -- cta_shown / cta_clicked / cta_dismissed / tool_opened / lead_submitted
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists events_type_idx on events(type, created_at desc);

-- ---------- retrieval ----------
create or replace function match_knowledge(
  query_embedding extensions.vector(768),
  match_count int default 6,
  min_similarity float default 0.45
)
returns table (id bigint, source text, source_type text, title text, url text, content text, similarity float)
language sql stable
set search_path = public, extensions
as $$
  select k.id, k.source, k.source_type, k.title, k.url, k.content,
         1 - (k.embedding <=> query_embedding) as similarity
  from knowledge_chunks k
  where k.retrievable = true
    and k.embedding is not null
    and 1 - (k.embedding <=> query_embedding) >= min_similarity
  order by k.embedding <=> query_embedding
  limit match_count;
$$;

create or replace function match_golden(
  query_embedding extensions.vector(768),
  match_count int default 2,
  min_similarity float default 0.75
)
returns table (id bigint, question text, answer text, similarity float)
language sql stable
set search_path = public, extensions
as $$
  select g.id, g.question, g.answer, 1 - (g.embedding <=> query_embedding) as similarity
  from golden_answers g
  where g.active = true and g.embedding is not null
    and 1 - (g.embedding <=> query_embedding) >= min_similarity
  order by g.embedding <=> query_embedding
  limit match_count;
$$;

-- ---------- learning-loop views (for the admin dashboard / weekly report) ----------
create or replace view knowledge_gaps with (security_invoker = on) as
  select m.id as message_id, c.user_id, m.content as question, m.top_similarity, m.created_at
  from messages m join conversations c on c.id = m.conversation_id
  where m.role = 'user' and (m.top_similarity is null or m.top_similarity < 0.55)
  order by m.created_at desc;

create or replace view funnel_daily with (security_invoker = on) as
  select date_trunc('day', created_at) as day,
         count(*) filter (where type = 'cta_shown')     as cta_shown,
         count(*) filter (where type = 'cta_clicked')   as cta_clicked,
         count(*) filter (where type = 'lead_submitted') as leads
  from events group by 1 order by 1 desc;

-- ---------- security: everything is server-side via service role ----------
alter table users enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table knowledge_chunks enable row level security;
alter table golden_answers enable row level security;
alter table leads enable row level security;
alter table feedback enable row level security;
alter table events enable row level security;
-- No policies on purpose: anon/authenticated roles get no access. The Next.js server uses the service role key.
revoke all on knowledge_gaps, funnel_daily from anon, authenticated;
revoke execute on function match_knowledge(extensions.vector, int, float) from public, anon, authenticated;
revoke execute on function match_golden(extensions.vector, int, float) from public, anon, authenticated;
grant execute on function match_knowledge(extensions.vector, int, float) to service_role;
grant execute on function match_golden(extensions.vector, int, float) to service_role;

-- applied as dubdebot_v2_vault_xray + dubdebot_auth_passwords
alter table messages add column if not exists attachments jsonb default '[]'::jsonb;
create table if not exists xray_results (id uuid primary key default gen_random_uuid(), user_id uuid references users(id) on delete cascade, answers jsonb not null, scores jsonb not null, total int not null, archetype text, created_at timestamptz not null default now());
create table if not exists deliverables (id uuid primary key default gen_random_uuid(), user_id uuid not null references users(id) on delete cascade, message_id uuid references messages(id) on delete set null, kind text not null default 'chat', title text not null, content text not null, created_at timestamptz not null default now());
create unique index if not exists deliverables_msg_unique on deliverables(user_id, message_id);
create table if not exists tasks (id uuid primary key default gen_random_uuid(), user_id uuid not null references users(id) on delete cascade, deliverable_id uuid references deliverables(id) on delete cascade, text text not null, priority text default 'important', done boolean not null default false, done_at timestamptz, position int default 0, created_at timestamptz not null default now());
alter table users add column if not exists password_hash text;
alter table users add column if not exists password_set_at timestamptz;
alter table users add column if not exists session_version int not null default 1;
create table if not exists password_resets (id uuid primary key default gen_random_uuid(), user_id uuid not null references users(id) on delete cascade, token_hash text not null unique, expires_at timestamptz not null, used_at timestamptz, ip text, created_at timestamptz not null default now());
create table if not exists auth_attempts (id bigserial primary key, key text not null, kind text not null, created_at timestamptz not null default now());
alter table xray_results enable row level security; alter table deliverables enable row level security; alter table tasks enable row level security;
alter table password_resets enable row level security; alter table auth_attempts enable row level security;

-- usage tracking + social knowledge (applied earlier in prod as separate migrations)
alter table messages add column if not exists model text;
alter table messages add column if not exists usage jsonb;
alter table knowledge_chunks add column if not exists meta jsonb;
create table if not exists app_settings (key text primary key, value jsonb not null, updated_at timestamptz not null default now());
alter table app_settings enable row level security;

-- ---------- subscriptions ----------
alter table users add column if not exists plan text not null default 'trial';           -- trial / paid
alter table users add column if not exists access_until timestamptz;
alter table users add column if not exists paid_at timestamptz;
alter table users add column if not exists paid_by text;
alter table users add column if not exists renewal_requested_at timestamptz;
alter table users add column if not exists admin_note text;
update users set access_until = greatest(created_at, now()) + interval '30 days' where access_until is null;
alter table users alter column access_until set default (now() + interval '30 days');
alter table users alter column access_until set not null;
create index if not exists users_access_idx on users(access_until);

alter table leads drop constraint if exists leads_meeting_type_check;
alter table leads add constraint leads_meeting_type_check check (meeting_type in ('advisor','nir','renewal'));

-- ---------- admins ----------
create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  display_name text not null,
  password_hash text,
  setup_token_hash text,
  setup_expires_at timestamptz,
  session_version int not null default 1,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);
alter table admins enable row level security;

create table if not exists admin_audit (
  id bigserial primary key,
  admin_id uuid references admins(id) on delete set null,
  user_id uuid references users(id) on delete cascade,
  action text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);
alter table admin_audit enable row level security;

create index if not exists auth_attempts_key_idx on auth_attempts(key, kind, created_at desc);

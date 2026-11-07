-- Vimeo library: every course video from Nir's Vimeo account, mapped by the team to a course + lesson.
create table if not exists vimeo_videos (
  id text primary key,                       -- Vimeo video id
  name text not null,
  description text,
  duration int,                              -- seconds
  link text,
  embed_url text,                            -- player.vimeo.com/video/<id>?h=...
  privacy text,
  thumb text,
  texttracks int not null default 0,         -- captions on Vimeo (0 = needs transcription)
  vimeo_created_at timestamptz,
  course_id int,                             -- lib/courses.ts LIBRARY id (Schooler id)
  lesson int,
  hidden boolean not null default false,     -- not a course video
  synced_at timestamptz not null default now(),
  mapped_at timestamptz
);
create index if not exists vimeo_videos_course_idx on vimeo_videos(course_id, lesson);
alter table vimeo_videos enable row level security;  -- server-only (service role)

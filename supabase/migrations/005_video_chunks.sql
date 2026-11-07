-- Course videos become searchable knowledge: transcript windows with a start time, so the bot can say
-- "Nir talks about this in lesson X, from minute m:ss".
alter table knowledge_chunks drop constraint if exists knowledge_chunks_source_type_check;
alter table knowledge_chunks add constraint knowledge_chunks_source_type_check
  check (source_type in ('book','booklet','youtube','golden','doc','template','social','podcast','video'));
alter table vimeo_videos add column if not exists indexed_chunks int not null default 0;
alter table vimeo_videos add column if not exists indexed_at timestamptz;
alter table vimeo_videos add column if not exists index_error text;

create or replace function match_video(
  query_embedding extensions.vector(768),
  min_similarity float default 0.68
)
returns table (id bigint, title text, url text, meta jsonb, similarity float)
language sql stable
set search_path = public, extensions
as $$
  select k.id, k.title, k.url, k.meta, 1 - (k.embedding <=> query_embedding) as similarity
  from knowledge_chunks k
  where k.source_type = 'video' and k.retrievable = true and k.embedding is not null
    and 1 - (k.embedding <=> query_embedding) >= min_similarity
  order by k.embedding <=> query_embedding
  limit 1;
$$;

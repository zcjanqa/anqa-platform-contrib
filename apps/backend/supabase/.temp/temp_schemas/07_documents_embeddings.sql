create extension vector;

create table documents_embeddings (
  id            text             primary key default gen_random_uuid()::text,
  source_table  text             not null,
  source_id     text             not null,
  content_column  text             not null,   -- 'protocol', 'calendar', 'document'
  content_text  text             not null,
  embedding     vector(1536)      not null,   
  created_at    timestamptz      default now(),
  CONSTRAINT no_duplicates UNIQUE (source_table, source_id, content_text)
);
create index on documents_embeddings using ivfflat(embedding vector_l2_ops) with (lists = 100);

--TODO: Analyze should be run on the table every 10000 updates or so to keep ivfflat efficient!

--Remote Procedure Call to query for K-NN
-- src_tables:   list of table names
-- content_columns: corresponding list of column names
-- query_embedding: the vector
-- match_count: 5

create or replace function public.match_filtered(
  query_embedding vector,
  match_count     int,
  src_tables      text[] DEFAULT NULL,
  content_columns text[] DEFAULT NULL,
  source_id_param text DEFAULT NULL
)
returns table(
  source_table  text,
  source_id     text,
  content_text  text,
  similarity    float
)
language plpgsql
as $$
declare
  max_dist float := sqrt(1536);  -- approx. 39.1918
begin
  return query
    select
      e.source_table,
      e.source_id,
      e.content_text,
      ((1 - (e.embedding <#> query_embedding))/2) as similarity
    from documents_embeddings e
    where
      (
        src_tables is null
        or e.source_table = any(src_tables))
      and (
        content_columns is null
        or e.content_column = any(content_columns))
      and (
        source_id_param is null
        or e.source_id = source_id_param)
    order by e.embedding <#> query_embedding
    limit match_count;
end;
$$;

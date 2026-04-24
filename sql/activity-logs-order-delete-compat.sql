-- Keep activity_logs append-only while allowing permanent deletion of
-- non-invoiced orders. The logs remain immutable and continue to store the
-- original order_id value, but the database no longer tries to cascade-delete
-- them when an order row is removed.

begin;

do $$
declare
  fk record;
begin
  for fk in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    join unnest(con.conkey) with ordinality as cols(attnum, ord) on true
    join pg_attribute att on att.attrelid = rel.oid and att.attnum = cols.attnum
    where con.contype = 'f'
      and nsp.nspname = 'public'
      and rel.relname = 'activity_logs'
      and att.attname = 'order_id'
  loop
    execute format('alter table public.activity_logs drop constraint %I', fk.conname);
  end loop;
end
$$;

comment on table public.activity_logs is
  'Append-only activity journal. order_id is intentionally not enforced by a foreign key so old log entries survive permanent order deletion.';

commit;

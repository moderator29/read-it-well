/*
 * I1b. THE SAME OBJECT ATTACHED TWICE IS NOT TWO PHOTOS.
 *
 * `addReportPhoto` is called by the browser once an upload resolves, so a slow
 * connection and a second tap can call it twice with the same path. Without
 * this the report grows a duplicate that reads as two photos of the same wall.
 *
 * It also makes an existing sentence in the code TRUE rather than decorative:
 * `addReportPhoto` answers a 23505 with "That photo is already on this
 * report", and until this index nothing could raise 23505.
 */
create unique index if not exists inspection_report_photos_one_object
  on public.inspection_report_photos (inspection_id, storage_path);

do $$
declare
  n integer;
begin
  select count(*) into n
    from pg_index i
    join pg_class c on c.oid = i.indexrelid
   where c.relname = 'inspection_report_photos_one_object' and i.indisunique;
  if n <> 1 then
    raise exception 'the unique index is not there, found %', n;
  end if;
end $$;

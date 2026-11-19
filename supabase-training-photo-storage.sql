-- AZM training photos: private bucket with per-user access only.
-- Run once in the Supabase SQL editor for project xitctlzolmylyprzttur.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('training-photos', 'training-photos', false, 5242880, array['image/jpeg'])
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg'];

drop policy if exists "Users read own training photos" on storage.objects;
drop policy if exists "Users upload own training photos" on storage.objects;
drop policy if exists "Users delete own training photos" on storage.objects;

create policy "Users read own training photos"
on storage.objects for select to authenticated
using (bucket_id = 'training-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users upload own training photos"
on storage.objects for insert to authenticated
with check (bucket_id = 'training-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users delete own training photos"
on storage.objects for delete to authenticated
using (bucket_id = 'training-photos' and (storage.foldername(name))[1] = auth.uid()::text);

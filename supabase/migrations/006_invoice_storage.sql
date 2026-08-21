-- ── Storage bucket for expense invoice photos ────────────────────────────────
-- Public read so the driver app can render the photo straight from the URL
-- stored in expenses.invoice_photo_url.
insert into storage.buckets (id, name, public)
values ('expense-invoices', 'expense-invoices', true)
on conflict (id) do nothing;

-- Only the signed-in driver may write / replace / delete invoice files.
do $$ begin
  create policy "Driver uploads invoices"
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'expense-invoices');
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Driver updates invoices"
    on storage.objects for update
    to authenticated
    using (bucket_id = 'expense-invoices')
    with check (bucket_id = 'expense-invoices');
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Driver deletes invoices"
    on storage.objects for delete
    to authenticated
    using (bucket_id = 'expense-invoices');
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Public reads invoices"
    on storage.objects for select
    using (bucket_id = 'expense-invoices');
exception when duplicate_object then null;
end $$;

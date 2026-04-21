-- File integrity and storage hardening baseline.
-- Apply after gobd-hardening.sql and audit-trail.sql.

begin;

alter table public.orders
  add column if not exists pdf_sha256 text;

alter table public.expenses
  add column if not exists receipt_sha256 text;

comment on column public.orders.pdf_sha256 is
  'SHA-256 digest of the archived invoice PDF for integrity verification.';

comment on column public.expenses.receipt_sha256 is
  'SHA-256 digest of the archived receipt file for integrity verification.';

-- Archived invoice PDFs and receipts should not be deletable by end users.
drop policy if exists "storage_delete_own_assets" on storage.objects;

create policy "storage_delete_own_assets" on storage.objects for delete to authenticated
using (
  bucket_id in ('order-photos', 'order-signatures')
  and split_part(name, '/', 1) = auth.uid()::text
);

commit;

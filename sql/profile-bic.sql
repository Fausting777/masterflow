begin;

alter table public.profiles
  add column if not exists bic text;

comment on column public.profiles.bic is
  'Bank Identifier Code used on invoice PDFs when provided.';

commit;

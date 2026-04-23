begin;

alter table public.expenses
  add column if not exists sumup_transaction_id uuid references public.sumup_transactions(id) on delete set null;

create unique index if not exists expenses_user_sumup_transaction_unique
  on public.expenses(user_id, sumup_transaction_id)
  where sumup_transaction_id is not null;

create index if not exists expenses_sumup_transaction_idx
  on public.expenses(sumup_transaction_id);

comment on column public.expenses.sumup_transaction_id is
  'Optional linked imported SumUp transaction for this expense.';

notify pgrst, 'reload schema';

commit;

-- Record when an order is set to 'assigned', for the Reports page.
-- Nothing stored this before: orders only had created_at, updated_at and completed_at.

alter table public.orders add column if not exists assigned_at timestamptz;

create or replace function public.set_order_assigned_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'assigned'
     and (tg_op = 'INSERT' or old.status is distinct from 'assigned') then
    new.assigned_at := now();
  elsif new.status = 'pending' then
    -- Sent back to pending: the next assignment stamps a fresh time.
    new.assigned_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists set_order_assigned_at on public.orders;
create trigger set_order_assigned_at
  before insert or update of status on public.orders
  for each row execute function public.set_order_assigned_at();

create index if not exists orders_assigned_at_idx on public.orders (assigned_at);
create index if not exists orders_completed_at_idx on public.orders (completed_at);
create index if not exists orders_created_at_idx on public.orders (created_at);

-- Backfill: for orders that are assigned now, updated_at is the best available guess.
-- Completed orders keep a null assigned_at because when they were assigned is unknown.
-- The n8n update webhook is paused so the backfill doesn't send one webhook per row.
alter table public.orders disable trigger oder_update_n8n;
update public.orders
   set assigned_at = updated_at
 where status = 'assigned' and assigned_at is null;
alter table public.orders enable trigger oder_update_n8n;

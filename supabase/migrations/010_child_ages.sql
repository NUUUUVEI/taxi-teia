-- ── Children on board ────────────────────────────────────────────────────────
-- Marc needs to know whether to bring a child seat (and which one), so the
-- booking form asks if children are coming and how old each one is.
-- null = no children; otherwise one age in years per child (0 = under one).

alter table public.bookings
  add column if not exists child_ages smallint[];

do $$ begin
  alter table public.bookings
    add constraint bookings_child_ages_check
    check (
      child_ages is null
      or (
        cardinality(child_ages) between 1 and 4
        and 0 <= all (child_ages)
        and 12 >= all (child_ages)
      )
    );
exception when duplicate_object then null;
end $$;

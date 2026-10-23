create table if not exists public.study_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  grade text not null,
  subjects jsonb not null default '[]'::jsonb,
  topics text not null default '',
  week_start date not null,
  plan jsonb not null default '[]'::jsonb,
  price integer not null default 50000,
  created_at timestamptz not null default now()
);

alter table public.study_plans enable row level security;
drop policy if exists "student_read_study_plans" on public.study_plans;
drop policy if exists "student_update_study_plans" on public.study_plans;
create policy "student_read_study_plans" on public.study_plans for select to authenticated
  using (exists (select 1 from public.students where students.id = study_plans.student_id and students.auth_user_id = auth.uid()));
create policy "student_update_study_plans" on public.study_plans for update to authenticated
  using (exists (select 1 from public.students where students.id = study_plans.student_id and students.auth_user_id = auth.uid()))
  with check (exists (select 1 from public.students where students.id = study_plans.student_id and students.auth_user_id = auth.uid()));

create or replace function public.purchase_study_plan(
  p_student_id uuid,
  p_grade text,
  p_subjects jsonb,
  p_topics text,
  p_week_start date,
  p_plan jsonb,
  p_price integer default 50000
) returns public.study_plans
language plpgsql
security definer
set search_path = public
as $$
declare
  current_balance integer;
  new_plan public.study_plans;
begin
  if not exists (select 1 from public.students where id = p_student_id and auth_user_id = auth.uid()) then
    raise exception 'student_not_authorized';
  end if;
  if p_price <> 50000 then
    raise exception 'invalid_plan_price';
  end if;
  select wallet_balance into current_balance from public.students where id = p_student_id for update;
  if current_balance < p_price then
    raise exception 'insufficient_wallet_balance';
  end if;
  update public.students set wallet_balance = wallet_balance - p_price where id = p_student_id;
  insert into public.transactions (student_id, amount, type, description)
    values (p_student_id, p_price, 'study-plan', 'هزینه برنامه درسی هفتگی');
  insert into public.study_plans (student_id, grade, subjects, topics, week_start, plan, price)
    values (p_student_id, p_grade, p_subjects, p_topics, p_week_start, p_plan, p_price)
    returning * into new_plan;
  return new_plan;
end;
$$;

grant execute on function public.purchase_study_plan(uuid, text, jsonb, text, date, jsonb, integer) to authenticated;
create index if not exists idx_study_plans_student_week on public.study_plans(student_id, week_start desc);

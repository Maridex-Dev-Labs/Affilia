-- Leaderboard aggregation (security definer)

create or replace function public.get_leaderboard(limit_count int default 50)
returns table (affiliate_id uuid, total numeric)
language sql
security definer
as $$
  select affiliate_id, sum(commission_earned_kes) as total
  from conversions
  group by affiliate_id
  order by total desc
  limit limit_count;
$$;

grant execute on function public.get_leaderboard(int) to authenticated;


create table if not exists public.render_config (
  id uuid primary key default gen_random_uuid(),
  url text not null default '',
  shared_secret text not null default '',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.render_config enable row level security;

create policy "Admins manage render_config"
on public.render_config for all
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create trigger trg_render_config_updated
before update on public.render_config
for each row execute function public.update_updated_at_column();

create table if not exists public.render_baileys_session (
  id int primary key default 1,
  auth_state jsonb,
  updated_at timestamptz not null default now(),
  constraint render_baileys_session_singleton check (id = 1)
);
alter table public.render_baileys_session enable row level security;
-- No policies: only service role (edge function / Render server) accesses this.

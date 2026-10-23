create table if not exists public.app_settings (
  id integer primary key default 1,
  openai_api_key text,
  ai_provider text not null default 'avalai',
  ai_api_key text,
  constraint app_settings_singleton check (id = 1)
);

insert into public.app_settings (id, ai_provider)
values (1, 'avalai')
on conflict (id) do nothing;

alter table public.app_settings add column if not exists ai_provider text not null default 'avalai';
alter table public.app_settings add column if not exists ai_api_key text;

update public.app_settings set ai_provider = 'avalai' where id = 1 and ai_provider is null;

comment on column public.app_settings.ai_api_key is 'Server-only AI provider key. Never expose this column to browser clients.';

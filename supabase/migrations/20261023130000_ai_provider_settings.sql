alter table public.app_settings add column if not exists ai_provider text not null default 'avalai';
alter table public.app_settings add column if not exists ai_api_key text;

update public.app_settings set ai_provider = 'avalai' where id = 1 and ai_provider is null;

comment on column public.app_settings.ai_api_key is 'Server-only AI provider key. Never expose this column to browser clients.';

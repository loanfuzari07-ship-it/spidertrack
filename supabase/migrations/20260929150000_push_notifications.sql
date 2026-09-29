-- ═══════════════════════════════════════════════════════════════════════════
-- Notificações push (PWA) — "Venda aprovada!" a cada compra aprovada.
--
-- push_subscriptions: uma linha por navegador/dispositivo que ativou as
-- notificações (Web Push API padrão — funciona com o app fechado). Sem
-- policy nenhuma pro painel: o navegador já sabe localmente se está
-- inscrito (PushManager.getSubscription()), não precisa ler isso de volta.
-- Só o servidor (service_role) grava/lê/apaga, exatamente como as tabelas de
-- credencial (meta_pixels, ga4_accounts etc.).
--
-- Chaves VAPID (o par de chaves que prova pro navegador que é ESTE servidor
-- quem está mandando o push, e não qualquer um) ficam em `settings`, geradas
-- sozinhas na primeira vez que alguém tenta ativar — igual ao webhook_token:
-- a pública é string normal (viaja pro navegador), a privada fica cifrada
-- (só o servidor decifra, na hora de assinar o envio).
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
-- Sem policies de leitura/escrita → negado pra anon/authenticated por
-- padrão; service_role (servidor) ignora RLS e tem acesso total abaixo.
revoke all on public.push_subscriptions from anon, authenticated;
grant all on public.push_subscriptions to service_role;

alter table public.settings
  add column if not exists vapid_public_key      text,
  add column if not exists vapid_private_key_enc  bytea;

-- Só a chave pública precisa chegar no navegador (pra
-- pushManager.subscribe); a privada nunca sai do servidor.
grant select (vapid_public_key) on public.settings to authenticated;

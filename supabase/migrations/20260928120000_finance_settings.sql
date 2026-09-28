-- ═══════════════════════════════════════════════════════════════════════════
-- Taxas financeiras configuráveis pelo painel (tela Configurações):
--
-- - meta_ads_tax_rate_pct — "Imposto Meta Ads" (% sobre o investimento em
--   anúncios). Antes era uma constante fixa (13,5%) no código; agora vira
--   editável, com esse mesmo valor como padrão.
-- - platform_fee_rate_pct — taxa cobrada pela plataforma de pagamento
--   (Hotmart/Kiwify/DigitalGoat/etc.) sobre cada venda. Usada para calcular o
--   "Faturamento líquido" (receita já descontada a taxa da plataforma).
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.settings
  add column if not exists meta_ads_tax_rate_pct numeric not null default 13.5,
  add column if not exists platform_fee_rate_pct  numeric not null default 0;

-- O painel (authenticated) precisa ler essas colunas; a escrita continua só
-- via service_role, como nas demais colunas de settings.
grant select (meta_ads_tax_rate_pct, platform_fee_rate_pct) on public.settings
  to authenticated;

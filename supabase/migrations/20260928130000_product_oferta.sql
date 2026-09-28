-- ═══════════════════════════════════════════════════════════════════════════
-- Identificação de "oferta" por produto — usado pela aba Ofertas para somar
-- investimento/faturamento/lucro/ROAS de um grupo de produtos (ex.: quando o
-- mesmo produtor roda mais de uma oferta na mesma conta de anúncio, cada
-- campanha dedicada a uma oferta específica).
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.product_settings
  add column if not exists oferta text;

-- Já coberto pelo grant de leitura existente em product_settings (authenticated
-- lê tudo). Escrita continua só via service_role (Server Action).

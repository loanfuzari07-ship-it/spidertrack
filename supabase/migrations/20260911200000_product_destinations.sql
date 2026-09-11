-- Roteamento por produto: cada produto pode ter SEU PRÓPRIO Pixel Meta e/ou
-- propriedade GA4, em vez de mandar sempre para todos os destinos ativos.
-- NULL preserva o comportamento antigo (manda pra todos) — nada quebra em
-- instalações de produto único que não configurarem isso.
alter table public.product_settings
  add column if not exists meta_pixel_id      text,
  add column if not exists ga4_measurement_id text;

-- Domínio "dono" de cada Pixel/propriedade GA4 — usado pelo snippet público
-- (t.js) para carregar, em cada página, só o pixel daquele produto/domínio.
-- NULL = "global": carrega em qualquer domínio (compatível com quem só tem
-- um produto/domínio e nunca preencheu isso).
alter table public.meta_pixels
  add column if not exists domain text;
alter table public.ga4_accounts
  add column if not exists domain text;

-- domain é público (igual pixel_id/measurement_id) — expor pra leitura do painel.
grant select (id, label, pixel_id, capi_token_mask, is_active, domain, created_at, updated_at)
  on public.meta_pixels to authenticated;
grant select (id, label, measurement_id, api_secret_mask, is_active, domain, created_at, updated_at)
  on public.ga4_accounts to authenticated;

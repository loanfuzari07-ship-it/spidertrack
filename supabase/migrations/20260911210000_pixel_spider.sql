-- "Pixel Spider": cria/edita Pixel + GA4 juntos, como um conjunto só (nome,
-- pixel, token, GA4, domínio). linked_ga4_id guarda esse vínculo — sem ele,
-- teríamos que casar por `label` (frágil a renomear). ON DELETE SET NULL:
-- apagar a propriedade GA4 direto na aba antiga não derruba o pixel.
alter table public.meta_pixels
  add column if not exists linked_ga4_id uuid references public.ga4_accounts(id) on delete set null;

grant select (id, label, pixel_id, capi_token_mask, is_active, domain, linked_ga4_id, created_at, updated_at)
  on public.meta_pixels to authenticated;

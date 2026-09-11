import { PageHeader } from "@/components/panel/page-header";
import { ProductsSection } from "@/components/config/products-section";
import { PixelSpiderList } from "@/components/pixel-spider/pixel-spider-list";
import type { AccountRow } from "@/lib/config/accounts";
import { getPixelSpiders, type PixelSpiderRow } from "@/lib/config/pixel-spider";
import { getProducts, type ProductRow } from "@/lib/config/products";
import { getSource } from "@/lib/dashboard/data";
import * as demo from "@/lib/demo/data";

export const dynamic = "force-dynamic";

async function loadData(): Promise<{
  items: PixelSpiderRow[];
  scriptDomain: string;
  products: ProductRow[];
}> {
  const src = await getSource();
  if (!src.db) {
    const d = demo.pixelSpiders();
    return { ...d, products: demo.config().products };
  }

  const [items, settingsRes, products] = await Promise.all([
    getPixelSpiders(src.db),
    src.db.from("settings").select("webhook_domain").eq("id", 1).single(),
    getProducts(src.db),
  ]);
  return {
    items,
    scriptDomain: settingsRes.data?.webhook_domain || "SEU-DOMINIO.vercel.app",
    products,
  };
}

export default async function PixelSpiderPage() {
  const { items, scriptDomain, products } = await loadData();

  // Pra alimentar os seletores "qual pixel esse produto usa", no mesmo
  // formato (AccountRow) que ProductsSection já espera.
  const pixelAccounts: AccountRow[] = items.map((i) => ({
    id: i.id,
    label: i.label,
    publicId: i.pixelId,
    mask: i.capiTokenMask,
    is_active: i.isActive,
  }));
  const ga4Accounts: AccountRow[] = items
    .filter((i) => i.ga4)
    .map((i) => ({
      id: i.ga4!.id,
      label: i.label,
      publicId: i.ga4!.measurementId,
      mask: i.ga4!.apiSecretMask,
      is_active: i.isActive,
    }));

  return (
    <div className="space-y-6">
      <PageHeader title="Pixel Spider" />
      <p className="max-w-2xl text-sm text-muted-foreground">
        Cada Pixel Spider é um conjunto — Pixel Meta + token da Conversions
        API + (opcional) propriedade GA4 — pronto pra colar num produto. Se
        você tem mais de um produto com pixels diferentes, cadastre um domínio
        em cada um: a página escolhe sozinha qual pixel carregar, pelo domínio
        onde o script está instalado.
      </p>
      <PixelSpiderList items={items} scriptDomain={scriptDomain} />

      <div className="border-t border-border/70 pt-6">
        <ProductsSection products={products} pixels={pixelAccounts} ga4={ga4Accounts} />
      </div>
    </div>
  );
}

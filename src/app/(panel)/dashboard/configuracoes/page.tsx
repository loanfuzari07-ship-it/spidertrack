import { PageHeader } from "@/components/panel/page-header";
import { FinanceSettingsForm } from "@/components/config/finance-settings-form";
import { getFinanceSettings, getSource } from "@/lib/dashboard/data";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const src = await getSource();
  const finance = await getFinanceSettings(src);

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" />
      <FinanceSettingsForm
        metaAdsTaxRatePct={Number((finance.metaAdsTaxRate * 100).toFixed(2))}
        platformFeeRatePct={Number((finance.platformFeeRate * 100).toFixed(2))}
      />
    </div>
  );
}

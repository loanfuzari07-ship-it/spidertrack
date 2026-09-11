import { PageHeader } from "@/components/panel/page-header";
import { ConfigTabs } from "@/components/config/config-tabs";
import type { AccountRow } from "@/lib/config/accounts";
import { getSource } from "@/lib/dashboard/data";
import * as demo from "@/lib/demo/data";

export const dynamic = "force-dynamic";

interface ConfigData {
  settings: {
    currency: string;
    test_event_code: string;
    webhook_token_mask: string | null;
    webhook_domain: string | null;
  };
  adaccounts: AccountRow[];
}

async function loadConfig(): Promise<ConfigData> {
  const src = await getSource();
  if (!src.db) {
    const d = demo.config();
    return { settings: d.settings, adaccounts: d.adaccounts };
  }
  const supabase = src.db;

  const [settingsRes, adRes] = await Promise.all([
    supabase
      .from("settings")
      .select("webhook_token_mask, currency, test_event_code, webhook_domain")
      .eq("id", 1)
      .single(),
    supabase
      .from("meta_ad_accounts")
      .select("id, label, ad_account_id, ads_token_mask, is_active")
      .order("created_at", { ascending: true }),
  ]);

  return {
    settings: {
      currency: settingsRes.data?.currency ?? "BRL",
      test_event_code: settingsRes.data?.test_event_code ?? "",
      webhook_token_mask: settingsRes.data?.webhook_token_mask ?? null,
      webhook_domain: settingsRes.data?.webhook_domain ?? null,
    },
    adaccounts: (adRes.data ?? []).map((r) => ({
      id: r.id,
      label: r.label,
      publicId: r.ad_account_id,
      mask: r.ads_token_mask,
      is_active: r.is_active,
    })),
  };
}

export default async function ConfigPage() {
  const { settings, adaccounts } = await loadConfig();

  return (
    <div className="space-y-6">
      <PageHeader title="Integrações" />
      <ConfigTabs settings={settings} adaccounts={adaccounts} />
    </div>
  );
}

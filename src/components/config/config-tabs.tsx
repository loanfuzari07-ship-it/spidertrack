"use client";

import { AccountSection } from "@/components/config/account-section";
import { AdAccountDiscovery } from "@/components/config/ad-account-discovery";
import { SettingsForm } from "@/components/config/settings-form";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ACCOUNT_KINDS, type AccountRow } from "@/lib/config/accounts";

export function ConfigTabs({
  settings,
  adaccounts,
}: {
  settings: {
    currency: string;
    test_event_code: string;
    webhook_token_mask: string | null;
    webhook_domain: string | null;
  };
  adaccounts: AccountRow[];
}) {
  return (
    <Tabs defaultValue="webhook" className="w-full">
      <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 sm:w-auto">
        <TabsTrigger value="webhook">Webhook</TabsTrigger>
        <TabsTrigger value="adaccount">Contas de anúncio</TabsTrigger>
      </TabsList>

      <TabsContent value="webhook" className="mt-4">
        <SettingsForm settings={settings} />
      </TabsContent>
      <TabsContent value="adaccount" className="mt-4 space-y-4">
        <AdAccountDiscovery />
        <AccountSection meta={ACCOUNT_KINDS.adaccount} items={adaccounts} />
      </TabsContent>
    </Tabs>
  );
}

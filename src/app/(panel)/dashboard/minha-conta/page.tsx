import { AccountForm } from "@/components/panel/account-form";
import { PageHeader } from "@/components/panel/page-header";
import { Card } from "@/components/ui/card";
import { IS_DEMO } from "@/lib/demo/mode";
import { createClient } from "@/lib/supabase/server";

export default async function MinhaContaPage() {
  if (IS_DEMO) {
    return (
      <div className="space-y-6">
        <PageHeader title="Minha conta" />
        <Card className="p-6 text-sm text-muted-foreground">
          Sessão desativada na demonstração — conecte o Supabase pra gerenciar
          sua conta.
        </Card>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email ?? "";
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const firstName = typeof meta.first_name === "string" ? meta.first_name : "";
  const lastName = typeof meta.last_name === "string" ? meta.last_name : "";

  return (
    <div className="space-y-6">
      <PageHeader title="Minha conta" />
      <AccountForm email={email} firstName={firstName} lastName={lastName} />
    </div>
  );
}

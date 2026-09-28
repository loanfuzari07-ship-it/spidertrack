import { redirect } from "next/navigation";
import { PanelShell } from "@/components/panel/panel-shell";
import { getLifetimeRevenue, getSource } from "@/lib/dashboard/data";
import { IS_DEMO } from "@/lib/demo/mode";
import { createClient } from "@/lib/supabase/server";

/**
 * Layout do painel. Proteção REAL da sessão: valida getUser() no servidor.
 * (O proxy.ts só faz o redirecionamento otimista + renovação de cookies.)
 *
 * Em modo demonstração (Supabase ainda não configurado) não há sessão nem banco:
 * o painel abre livre, só com dados fictícios. Assim que as chaves do Supabase
 * entram no ambiente, o login volta a ser obrigatório automaticamente.
 */
export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const src = await getSource();
  const lifetimeRevenue = await getLifetimeRevenue(src);

  if (IS_DEMO) {
    return (
      <PanelShell email={null} demo lifetimeRevenue={lifetimeRevenue}>
        {children}
      </PanelShell>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const firstName = typeof meta.first_name === "string" ? meta.first_name : null;
  const lastName = typeof meta.last_name === "string" ? meta.last_name : null;

  return (
    <PanelShell
      email={user.email ?? null}
      firstName={firstName}
      lastName={lastName}
      lifetimeRevenue={lifetimeRevenue}
    >
      {children}
    </PanelShell>
  );
}

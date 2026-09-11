"use client";

import { Loader2, Search } from "lucide-react";
import { useState, useTransition } from "react";
import {
  discoverAdAccounts,
  importAdAccounts,
  type DiscoveredAccount,
} from "@/app/(panel)/dashboard/config/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toaster";

/** Cola 1 token (System User, do Business Manager) e importa de uma vez
 *  todas as contas de anúncio que ele enxerga — sem cadastrar uma por uma. */
export function AdAccountDiscovery() {
  const [token, setToken] = useState("");
  const [accounts, setAccounts] = useState<DiscoveredAccount[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searching, startSearch] = useTransition();
  const [importing, startImport] = useTransition();

  function search() {
    startSearch(async () => {
      const res = await discoverAdAccounts(token);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setAccounts(res.accounts);
      setSelected(new Set(res.accounts.filter((a) => a.active).map((a) => a.id)));
    });
  }

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function importSelected() {
    if (!accounts) return;
    const chosen = accounts.filter((a) => selected.has(a.id));
    startImport(async () => {
      const res = await importAdAccounts(token, chosen);
      if (res.ok) {
        toast.success(
          `${res.imported} conta(s) importada(s). Recarregando a lista…`,
        );
        setAccounts(null);
        setToken("");
      } else {
        toast.error(res.error ?? "Falha ao importar.");
      }
    });
  }

  return (
    <Card className="space-y-4 p-4">
      <div className="space-y-1">
        <h3 className="font-medium">Importar contas automaticamente</h3>
        <p className="text-sm text-muted-foreground">
          Cole 1 token (System User, gerado no Business Manager) e escolha
          quais contas de anúncio ele deve ativar — sem cadastrar uma por uma.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="discoveryToken">Access token</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="discoveryToken"
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="cole o access token aqui"
            className="font-mono"
          />
          <Button
            type="button"
            onClick={search}
            disabled={searching || !token.trim()}
          >
            {searching ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Search className="size-4" />
            )}
            Buscar contas
          </Button>
        </div>
      </div>

      {accounts ? (
        <CardContent className="space-y-3 p-0">
          <div className="divide-y divide-border/60 rounded-md border border-border/60">
            {accounts.map((a) => (
              <label
                key={a.id}
                className="flex cursor-pointer items-center justify-between gap-3 p-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{a.name}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {a.id} {a.active ? "· status: ativa" : "· status: outro"}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={selected.has(a.id)}
                  onChange={() => toggle(a.id)}
                  className="size-4 shrink-0"
                />
              </label>
            ))}
          </div>
          <Button
            type="button"
            onClick={importSelected}
            disabled={importing || selected.size === 0}
          >
            {importing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Importando…
              </>
            ) : (
              `Importar ${selected.size} conta(s) selecionada(s)`
            )}
          </Button>
        </CardContent>
      ) : null}
    </Card>
  );
}

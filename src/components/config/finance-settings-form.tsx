"use client";

import { Loader2 } from "lucide-react";
import { useTransition } from "react";
import { saveFinanceSettings } from "@/app/(panel)/dashboard/configuracoes/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toaster";

export function FinanceSettingsForm({
  metaAdsTaxRatePct,
  platformFeeRatePct,
}: {
  metaAdsTaxRatePct: number;
  platformFeeRatePct: number;
}) {
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await saveFinanceSettings(null, formData);
      if (res?.ok) {
        toast.success("Taxas salvas.");
      } else if (res?.error) {
        toast.error(res.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Taxas</CardTitle>
        <CardDescription>
          Usadas para calcular o faturamento líquido e o lucro na Visão geral.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={onSubmit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="meta_ads_tax_rate_pct">Imposto Meta Ads (%)</Label>
              <Input
                id="meta_ads_tax_rate_pct"
                name="meta_ads_tax_rate_pct"
                inputMode="decimal"
                defaultValue={metaAdsTaxRatePct}
                placeholder="13,5"
              />
              <p className="text-xs text-muted-foreground">
                % sobre o investimento em anúncios — descontado só no Lucro.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="platform_fee_rate_pct">
                Taxa da plataforma de pagamento (%)
              </Label>
              <Input
                id="platform_fee_rate_pct"
                name="platform_fee_rate_pct"
                inputMode="decimal"
                defaultValue={platformFeeRatePct}
                placeholder="9,9"
              />
              <p className="text-xs text-muted-foreground">
                % que a Hotmart/Kiwify/DigitalGoat etc. retém em cada venda —
                descontada do Faturamento total (valor líquido).
              </p>
            </div>
          </div>

          <Button type="submit" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Salvando…
              </>
            ) : (
              "Salvar"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

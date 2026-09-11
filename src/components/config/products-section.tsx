"use client";

import { Package } from "lucide-react";
import { useTransition } from "react";
import {
  setProductDestination,
  toggleProductMeta,
} from "@/app/(panel)/dashboard/config/actions";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";
import type { AccountRow } from "@/lib/config/accounts";
import type { ProductRow } from "@/lib/config/products";
import { formatCurrency, formatNumber } from "@/lib/format";

function MetaToggle({ product }: { product: ProductRow }) {
  const [pending, startTransition] = useTransition();
  return (
    <Switch
      checked={product.send_meta}
      disabled={pending}
      aria-label={product.send_meta ? "Não enviar ao Meta" : "Enviar ao Meta"}
      onCheckedChange={(next) =>
        startTransition(async () => {
          try {
            await toggleProductMeta(product.key, product.name, next);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Falha ao atualizar.");
          }
        })
      }
    />
  );
}

const ALL_VALUE = "__all__"; // placeholder do Select (não aceita value="")

/** Seletor "qual destino esse produto usa" — vazio = manda pra todos. */
function DestinationSelect({
  product,
  field,
  current,
  options,
  placeholder,
}: {
  product: ProductRow;
  field: "meta_pixel_id" | "ga4_measurement_id";
  current: string | null;
  options: AccountRow[];
  placeholder: string;
}) {
  const [pending, startTransition] = useTransition();

  function onChange(value: string) {
    startTransition(async () => {
      try {
        await setProductDestination(
          product.key,
          product.name,
          field,
          value === ALL_VALUE ? null : value,
        );
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Falha ao atualizar.");
      }
    });
  }

  return (
    <Select
      value={current ?? ALL_VALUE}
      onValueChange={onChange}
      disabled={pending}
    >
      <SelectTrigger className="h-8 w-[190px] text-xs">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VALUE}>Todos os ativos (padrão)</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.publicId} value={o.publicId}>
            {o.label} · {o.publicId}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ProductsSection({
  products,
  pixels,
  ga4,
}: {
  products: ProductRow[];
  /** Lista de Pixels cadastrados — pra escolher qual usar por produto. */
  pixels: AccountRow[];
  /** Lista de propriedades GA4 cadastradas — idem. */
  ga4: AccountRow[];
}) {
  // Só faz sentido mostrar o seletor quando existe MAIS de um destino — com
  // um só (ou nenhum), "escolher" não muda nada.
  const showPixelSelect = pixels.length > 1;
  const showGa4Select = ga4.length > 1;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-semibold">Produtos</h2>
        <p className="text-sm text-muted-foreground">
          Produtos que já geraram venda. Desligue o envio ao Meta para os que não
          quer marcar no Gerenciador (ex.: upsells). Se você tem mais de um
          Pixel/propriedade GA4 (um por produto, por exemplo), escolha aqui
          qual cada produto usa — sem escolher, manda pra todos os ativos.
        </p>
      </div>

      {products.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 p-10 text-center">
          <Package className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nenhum produto vendido ainda.
          </p>
        </Card>
      ) : (
        <Card variant="solid" className="divide-y divide-border/70">
          {products.map((p) => (
            <div key={p.key} className="flex flex-col gap-3 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <span className="block truncate font-medium">{p.name}</span>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {p.key}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground tabular-nums">
                    {formatNumber(p.sales)} vendas · {formatCurrency(p.revenue)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Enviar ao Meta
                  </span>
                  <MetaToggle product={p} />
                </div>
              </div>

              {(showPixelSelect || showGa4Select) && p.send_meta ? (
                <div className="flex flex-wrap items-center gap-3 border-t border-border/60 pt-3">
                  {showPixelSelect ? (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Pixel Meta
                      </p>
                      <DestinationSelect
                        product={p}
                        field="meta_pixel_id"
                        current={p.meta_pixel_id}
                        options={pixels}
                        placeholder="Todos os ativos"
                      />
                    </div>
                  ) : null}
                  {showGa4Select ? (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Propriedade GA4
                      </p>
                      <DestinationSelect
                        product={p}
                        field="ga4_measurement_id"
                        current={p.ga4_measurement_id}
                        options={ga4}
                        placeholder="Todas as ativas"
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

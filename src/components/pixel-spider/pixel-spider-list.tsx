"use client";

import { Check, Copy, Loader2, Pencil, Plus, Radio, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import {
  deletePixelSpider,
  savePixelSpider,
  togglePixelSpiderActive,
} from "@/app/(panel)/dashboard/pixel-spider/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";
import type { PixelSpiderRow } from "@/lib/config/pixel-spider";

/** Botão que copia um texto e mostra "copiado" por 2s. */
function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          toast.error("Não foi possível copiar.");
        }
      }}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? "Copiado!" : label}
    </Button>
  );
}

/** Snippet de instalação — é o MESMO pra todo mundo: o roteamento por pixel
 *  acontece sozinho no servidor, pelo domínio de onde a página carrega. */
function ScriptBlock({ scriptDomain }: { scriptDomain: string }) {
  const snippet = `<script async src="https://${scriptDomain}/t.js"></script>`;
  return (
    <div className="space-y-2 rounded-md border border-border/60 bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">
        Cole isso no <code>&lt;head&gt;</code> da página desse produto:
      </p>
      <pre className="overflow-x-auto rounded bg-background p-2 font-mono text-xs">
        {snippet}
      </pre>
      <CopyButton text={snippet} label="Copiar código" />
    </div>
  );
}

function ActiveToggle({ item }: { item: PixelSpiderRow }) {
  const [pending, startTransition] = useTransition();
  return (
    <Switch
      checked={item.isActive}
      disabled={pending}
      aria-label={item.isActive ? "Desativar" : "Ativar"}
      onCheckedChange={(next) =>
        startTransition(async () => {
          try {
            await togglePixelSpiderActive(item.id, next);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Falha ao atualizar.");
          }
        })
      }
    />
  );
}

function DeleteButton({ item }: { item: PixelSpiderRow }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label="Apagar"
        onClick={() => setConfirming(true)}
      >
        <Trash2 className="size-4" />
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            try {
              await deletePixelSpider(item.id);
              toast.success("Pixel Spider apagado.");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Falha ao apagar.");
            }
          })
        }
      >
        Confirmar
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        Cancelar
      </Button>
    </div>
  );
}

/** Diálogo de criar/editar um Pixel Spider (Pixel + GA4 opcional, juntos). */
function PixelSpiderDialog({ item }: { item?: PixelSpiderRow }) {
  const isEdit = Boolean(item);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(item?.isActive ?? true);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await savePixelSpider(null, formData);
      if (res?.ok) {
        toast.success(isEdit ? "Pixel Spider atualizado." : "Pixel Spider criado.");
        setOpen(false);
      } else if (res?.error) {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setActive(item?.isActive ?? true);
      }}
    >
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" aria-label="Editar">
            <Pencil className="size-4" />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="size-4" />
            Criar novo Pixel Spider
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar" : "Criar"} Pixel Spider
          </DialogTitle>
          <DialogDescription>
            Token e API secret são cifrados no servidor e nunca voltam pro
            navegador.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="space-y-4">
          {item ? <input type="hidden" name="id" value={item.id} /> : null}
          {item?.ga4 ? (
            <input type="hidden" name="linkedGa4Id" value={item.ga4.id} />
          ) : null}
          <input type="hidden" name="is_active" value={active ? "1" : "0"} />

          <div className="space-y-2">
            <Label htmlFor="label">Nome</Label>
            <Input
              id="label"
              name="label"
              defaultValue={item?.label}
              placeholder="ex.: Produto X"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pixelId">Pixel ID</Label>
            <Input
              id="pixelId"
              name="pixelId"
              defaultValue={item?.pixelId}
              placeholder="123456789012345"
              className="font-mono"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="capiToken">Token da Conversions API</Label>
            <Input
              id="capiToken"
              name="capiToken"
              type="password"
              autoComplete="off"
              placeholder={
                isEdit
                  ? item?.capiTokenMask
                    ? `atual: ${item.capiTokenMask} — deixe em branco para manter`
                    : "deixe em branco para manter"
                  : "cole o token da CAPI"
              }
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ga4MeasurementId">GA4 Measurement ID (opcional)</Label>
            <Input
              id="ga4MeasurementId"
              name="ga4MeasurementId"
              defaultValue={item?.ga4?.measurementId}
              placeholder="G-XXXXXXXXXX"
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ga4ApiSecret">GA4 API secret (opcional)</Label>
            <Input
              id="ga4ApiSecret"
              name="ga4ApiSecret"
              type="password"
              autoComplete="off"
              placeholder={
                item?.ga4?.apiSecretMask
                  ? `atual: ${item.ga4.apiSecretMask} — deixe em branco para manter`
                  : "só se preencheu o Measurement ID acima"
              }
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Sem isso, o GA4 ainda recebe PageView pelo navegador — só a
              compra (via servidor) não é reforçada.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="domain">Domínio desse produto (recomendado)</Label>
            <Input
              id="domain"
              name="domain"
              defaultValue={item?.domain ?? ""}
              placeholder="ex.: meuproduto.com"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Se você só tem um produto/domínio, pode deixar em branco.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2">
            <div>
              <p className="text-sm font-medium">Ativo</p>
              <p className="text-xs text-muted-foreground">
                Recebe os eventos disparados pelo servidor.
              </p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>

          <DialogFooter>
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PixelSpiderList({
  items,
  scriptDomain,
}: {
  items: PixelSpiderRow[];
  scriptDomain: string;
}) {
  const [showScript, setShowScript] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Seus Pixel Spiders</h2>
          <Badge variant="secondary">{items.length}</Badge>
        </div>
        <PixelSpiderDialog />
      </div>

      {items.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 p-10 text-center">
          <Radio className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nenhum Pixel Spider criado ainda.
          </p>
        </Card>
      ) : (
        <Card variant="solid" className="divide-y divide-border/70">
          {items.map((item) => (
            <div key={item.id} className="flex flex-col gap-3 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{item.label}</span>
                    {!item.isActive ? (
                      <Badge variant="secondary">inativo</Badge>
                    ) : null}
                  </div>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    Pixel {item.pixelId}
                    {item.ga4 ? ` · GA4 ${item.ga4.measurementId}` : ""}
                  </p>
                  {item.domain ? (
                    <p className="truncate font-mono text-xs text-primary">
                      domínio: {item.domain}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      sem domínio — carrega em qualquer página
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <ActiveToggle item={item} />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setShowScript(showScript === item.id ? null : item.id)
                    }
                  >
                    {showScript === item.id ? "Ocultar código" : "Ver código"}
                  </Button>
                  <PixelSpiderDialog item={item} />
                  <DeleteButton item={item} />
                </div>
              </div>

              {showScript === item.id ? (
                <ScriptBlock scriptDomain={scriptDomain} />
              ) : null}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

"use client";

import { Check, Copy, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { InfoTooltip } from "@/components/panel/info-tooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";

// Parâmetros dinâmicos do Meta: resolvem em nome|id no clique do anúncio.
// É esse formato ("nome|id") que a aba Campanhas espera pra casar a venda
// com a campanha/conjunto/anúncio certo — ver utmMatchKey em queries.ts.
// IMPORTANTE: utm_term = conjunto (adset) aqui, porque é isso que a nossa
// atribuição espera. Outras ferramentas usam essa convenção diferente (ex.:
// põem o conjunto no utm_medium) — não seguimos, pra não quebrar o nosso
// próprio casamento de campanha.
const META_PRESET = {
  source: "FB",
  medium: "cpc",
  campaign: "{{campaign.name}}|{{campaign.id}}",
  term: "{{adset.name}}|{{adset.id}}",
  content: "{{ad.name}}|{{ad.id}}",
};

const DEFAULT_XCOD_DELIM = "_-_";

/**
 * Monta a query string SEM url-encoding — de propósito. Se codificássemos,
 * `{{campaign.name}}` viraria `%7B%7Bcampaign.name%7D%7D` e o Meta deixaria
 * de reconhecer como parâmetro dinâmico (precisa das chaves literais).
 */
function buildParamsString(params: Record<string, string>): string {
  return Object.entries(params)
    .filter(([, v]) => v.trim())
    .map(([k, v]) => `${k}=${v.trim()}`)
    .join("&");
}

function buildFullUrl(base: string, paramsString: string): string {
  if (!base.trim() || !paramsString) return "";
  const cleanBase = base.trim().replace(/\/+$/, "");
  const withScheme = /^https?:\/\//i.test(cleanBase)
    ? cleanBase
    : `https://${cleanBase}`;
  const sep = withScheme.includes("?") ? "&" : "?";
  return `${withScheme}${sep}${paramsString}`;
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="font-mono text-sm"
      />
    </div>
  );
}

/** Bloco de texto com botão de copiar — reutilizado pros dois outputs. */
function CopyBlock({
  label,
  info,
  value,
  emptyHint,
}: {
  label: string;
  info?: string;
  value: string;
  emptyHint: string;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        <Label>{label}</Label>
        {info ? <InfoTooltip text={info} /> : null}
      </div>
      <pre className="min-h-[72px] overflow-x-auto whitespace-pre-wrap break-all rounded-md border border-border/60 bg-muted/30 p-3 font-mono text-xs">
        {value || emptyHint}
      </pre>
      <Button type="button" onClick={copy} disabled={!value} className="w-full sm:w-auto">
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? "Copiado!" : "Copiar"}
      </Button>
    </div>
  );
}

export function UtmBuilder() {
  const [baseUrl, setBaseUrl] = useState("");
  const [source, setSource] = useState("");
  const [medium, setMedium] = useState("");
  const [campaign, setCampaign] = useState("");
  const [term, setTerm] = useState("");
  const [content, setContent] = useState("");
  const [useXcod, setUseXcod] = useState(false);
  const [xcodDelim, setXcodDelim] = useState(DEFAULT_XCOD_DELIM);

  // xcod = tudo junto, separado por um delimitador — só o que a Hotmart lê no
  // relatório dela (Hotmart Analytics). Usa os MESMOS valores que você já
  // preencheu acima; não inventa campo novo nem muda o utm_term.
  const xcodValue = useMemo(
    () => [source, campaign, term, content].filter((v) => v.trim()).join(xcodDelim),
    [source, campaign, term, content, xcodDelim],
  );

  const paramsString = useMemo(
    () =>
      buildParamsString({
        utm_source: source,
        utm_medium: medium,
        utm_campaign: campaign,
        utm_term: term,
        utm_content: content,
        ...(useXcod && xcodValue ? { xcod: xcodValue } : {}),
      }),
    [source, medium, campaign, term, content, useXcod, xcodValue],
  );

  const fullUrl = useMemo(
    () => buildFullUrl(baseUrl, paramsString),
    [baseUrl, paramsString],
  );

  function applyMetaPreset() {
    setSource(META_PRESET.source);
    setMedium(META_PRESET.medium);
    setCampaign(META_PRESET.campaign);
    setTerm(META_PRESET.term);
    setContent(META_PRESET.content);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardContent className="space-y-4 pt-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium">Parâmetros</p>
              <InfoTooltip text='O botão "Preencher pra Meta Ads" usa os parâmetros dinâmicos do próprio Meta — viram o nome e o ID reais da campanha/conjunto/anúncio no clique. É esse formato (nome|id) que a aba Campanhas já sabe ler pra casar a venda certa.' />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={applyMetaPreset}>
              <Sparkles className="size-3.5" />
              Preencher pra Meta Ads
            </Button>
          </div>

          <Field
            id="utm_source"
            label="utm_source (de onde vem o tráfego)"
            value={source}
            onChange={setSource}
            placeholder="FB"
          />
          <Field
            id="utm_medium"
            label="utm_medium (tipo de tráfego)"
            value={medium}
            onChange={setMedium}
            placeholder="cpc"
          />
          <Field
            id="utm_campaign"
            label="utm_campaign (identifica a campanha)"
            value={campaign}
            onChange={setCampaign}
            placeholder="{{campaign.name}}|{{campaign.id}}"
          />
          <Field
            id="utm_term"
            label="utm_term (identifica o conjunto de anúncios)"
            value={term}
            onChange={setTerm}
            placeholder="{{adset.name}}|{{adset.id}}"
          />
          <Field
            id="utm_content"
            label="utm_content (identifica o anúncio)"
            value={content}
            onChange={setContent}
            placeholder="{{ad.name}}|{{ad.id}}"
          />

          <div className="space-y-3 rounded-md border border-border/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium">Incluir xcod (Hotmart)</p>
                <InfoTooltip text="xcod é específico da Hotmart e só aparece no relatório dela (Hotmart Analytics) — ela não repassa isso pro webhook, então não muda nada nos dados aqui no SpiderTrack. Ligue só se você também acompanha os números por lá." />
              </div>
              <Switch checked={useXcod} onCheckedChange={setUseXcod} />
            </div>
            {useXcod ? (
              <div className="space-y-1.5">
                <Label htmlFor="xcodDelim">Separador</Label>
                <Input
                  id="xcodDelim"
                  value={xcodDelim}
                  onChange={(e) => setXcodDelim(e.target.value || DEFAULT_XCOD_DELIM)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Junta source + campanha + conjunto + anúncio nesse texto,
                  separados por isso aqui. Só muda se algum desses valores já
                  usar esse mesmo separador.
                </p>
              </div>
            ) : null}
          </div>

          <div className="space-y-1.5 border-t border-border/60 pt-4">
            <Label htmlFor="baseUrl">
              URL da página (opcional — só se for usar o link completo abaixo)
            </Label>
            <Input
              id="baseUrl"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://meuproduto.com/pagina"
              className="font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="border-primary/40">
          <CardContent className="pt-5">
            <CopyBlock
              label='Parâmetros de URL — cole no campo separado "Parâmetros de URL"'
              info='No Meta Ads Manager, "URL do site" e "Parâmetros de URL" são campos separados — o Meta gruda um no outro sozinho. Cole sua página (sem nada) em "URL do site", e isto aqui em "Parâmetros de URL".'
              value={paramsString}
              emptyHint="Clique em “Preencher pra Meta Ads” ou preencha os campos ao lado."
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <CopyBlock
              label='Link completo — use só se a plataforma NÃO tiver um campo separado de parâmetros (ex.: link em bio, post orgânico)'
              value={fullUrl}
              emptyHint="Preencha a URL da página acima pra gerar o link completo."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

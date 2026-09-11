"use client";

import { Check, Copy, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toaster";

// Parâmetros dinâmicos do Meta: resolvem em nome|id no clique do anúncio.
// É esse formato ("nome|id") que a aba Campanhas espera pra casar a venda
// com a campanha/conjunto/anúncio certo — ver utmMatchKey em queries.ts.
const META_PRESET = {
  source: "facebook",
  medium: "cpc",
  campaign: "{{campaign.name}}|{{campaign.id}}",
  term: "{{adset.name}}|{{adset.id}}",
  content: "{{ad.name}}|{{ad.id}}",
};

function buildUrl(base: string, params: Record<string, string>): string {
  if (!base.trim()) return "";
  let url: URL;
  try {
    url = new URL(base.trim());
  } catch {
    try {
      url = new URL(`https://${base.trim()}`);
    } catch {
      return "";
    }
  }
  for (const [k, v] of Object.entries(params)) {
    if (v.trim()) url.searchParams.set(k, v.trim());
  }
  return url.toString();
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

export function UtmBuilder() {
  const [baseUrl, setBaseUrl] = useState("");
  const [source, setSource] = useState("");
  const [medium, setMedium] = useState("");
  const [campaign, setCampaign] = useState("");
  const [term, setTerm] = useState("");
  const [content, setContent] = useState("");
  const [copied, setCopied] = useState(false);

  const finalUrl = useMemo(
    () =>
      buildUrl(baseUrl, {
        utm_source: source,
        utm_medium: medium,
        utm_campaign: campaign,
        utm_term: term,
        utm_content: content,
      }),
    [baseUrl, source, medium, campaign, term, content],
  );

  function applyMetaPreset() {
    setSource(META_PRESET.source);
    setMedium(META_PRESET.medium);
    setCampaign(META_PRESET.campaign);
    setTerm(META_PRESET.term);
    setContent(META_PRESET.content);
  }

  async function copyUrl() {
    if (!finalUrl) return;
    try {
      await navigator.clipboard.writeText(finalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardContent className="space-y-4 pt-5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="baseUrl">URL da página de vendas</Label>
            <Button type="button" variant="outline" size="sm" onClick={applyMetaPreset}>
              <Sparkles className="size-3.5" />
              Preencher pra Meta Ads
            </Button>
          </div>
          <Input
            id="baseUrl"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://meuproduto.com/pagina"
            className="font-mono text-sm"
          />

          <Field
            id="utm_source"
            label="utm_source (de onde vem o tráfego)"
            value={source}
            onChange={setSource}
            placeholder="facebook"
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
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-3 pt-5">
            <Label>Link pronto — cole no campo &quot;URL do site&quot; do anúncio</Label>
            <pre className="min-h-[72px] overflow-x-auto whitespace-pre-wrap break-all rounded-md border border-border/60 bg-muted/30 p-3 font-mono text-xs">
              {finalUrl || "Preencha a URL da página pra gerar o link."}
            </pre>
            <Button
              type="button"
              onClick={copyUrl}
              disabled={!finalUrl}
              className="w-full sm:w-auto"
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copiado!" : "Copiar link"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 pt-5 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Botão &quot;Preencher pra Meta Ads&quot;</strong>{" "}
              usa os parâmetros dinâmicos do próprio Meta ({"{{campaign.name}}"}
              , etc.) — eles viram o nome e o ID reais da campanha/conjunto/
              anúncio no momento do clique.
            </p>
            <p>
              É esse formato (<code className="text-foreground">nome|id</code>)
              que a aba <strong className="text-foreground">Campanhas</strong>{" "}
              já sabe ler pra casar cada venda com a campanha certa — não
              precisa configurar nada além de colar o link no anúncio.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

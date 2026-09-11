import { PageHeader } from "@/components/panel/page-header";
import { UtmBuilder } from "@/components/utms/utm-builder";

export default function UtmsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="UTMs" />
      <p className="max-w-2xl text-sm text-muted-foreground">
        O rastreamento de UTM já é automático — o script (t.js) captura os
        parâmetros da URL sozinho, sem precisar de código extra. Esta página
        só monta o <strong>link certo</strong> pra colar no campo &quot;URL do
        site&quot; do seu anúncio.
      </p>
      <UtmBuilder />
    </div>
  );
}

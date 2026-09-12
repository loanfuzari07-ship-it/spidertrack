import { PageHeader } from "@/components/panel/page-header";
import { UtmBuilder } from "@/components/utms/utm-builder";

export default function UtmsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="UTMs"
        info='O rastreamento de UTM já é automático — o script (t.js) captura os parâmetros da URL sozinho. Esta página monta os parâmetros certos pra colar no campo "Parâmetros de URL" do seu anúncio (separado do campo "URL do site").'
      />
      <UtmBuilder />
    </div>
  );
}

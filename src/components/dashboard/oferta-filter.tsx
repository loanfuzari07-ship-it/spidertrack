"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Dropdown "Todas as ofertas ▾" — filtra a tela pela Oferta marcada em
 *  Configurações → Produtos (mesmo padrão do `AccountFilter`). */
export function OfertaFilter({
  current,
  ofertas,
}: {
  current: string;
  ofertas: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function set(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value === "all") params.delete("oferta");
    else params.set("oferta", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Select value={current} onValueChange={set}>
      <SelectTrigger className="w-full sm:w-56">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todas as ofertas</SelectItem>
        {ofertas.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

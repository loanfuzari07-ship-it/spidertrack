import {
  BookOpen,
  FileText,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  Settings,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

/** Itens de navegação do painel, agrupados por seção (visual mais organizado
 *  e escaneável do que uma lista única). */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Visão geral",
    items: [
      { href: "/dashboard", label: "Resumo", icon: LayoutDashboard },
      { href: "/dashboard/vendas", label: "Vendas", icon: Wallet },
    ],
  },
  {
    label: "Rastreamento",
    items: [
      { href: "/dashboard/campanhas", label: "Campanhas", icon: Megaphone },
      { href: "/dashboard/eventos", label: "Eventos", icon: ListChecks },
      { href: "/dashboard/paginas", label: "Páginas", icon: FileText },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/dashboard/config", label: "Configurações", icon: Settings },
      { href: "/dashboard/instrucoes", label: "Instruções", icon: BookOpen },
    ],
  },
];

/** Lista achatada — usada onde só interessa o conjunto de rotas (ex.: back
 *  links, breadcrumbs), sem a divisão visual em grupos. */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

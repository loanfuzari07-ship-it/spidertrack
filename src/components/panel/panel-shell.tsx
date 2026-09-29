"use client";

import { FlaskConical, LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { signOut } from "@/app/(panel)/actions";
import { PwaInstallButton } from "@/components/pwa-install-button";
import { RevenueGoalWidget } from "@/components/panel/revenue-goal-widget";
import { SidebarNav } from "@/components/panel/sidebar-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { BRAND_LOGO, BRAND_NAME, brandInitials } from "@/lib/branding";
import { cn } from "@/lib/utils";

/**
 * Marca do painel. Nome vem de `NEXT_PUBLIC_BRAND_NAME`; sem logo configurada,
 * desenhamos as iniciais — nenhuma foto embutida no repositório.
 */
function Brand() {
  return (
    <div className="flex items-center gap-2">
      {BRAND_LOGO ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={BRAND_LOGO}
          alt={BRAND_NAME}
          className="size-8 rounded-md object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="flex size-8 items-center justify-center rounded-md bg-primary/15 font-mono text-xs font-semibold text-primary"
        >
          {brandInitials()}
        </span>
      )}
      <span className="truncate font-semibold tracking-tight">{BRAND_NAME}</span>
    </div>
  );
}

/** Aviso fixo de que os números na tela são fictícios. */
function DemoBanner() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-b border-accent-amber/30 bg-accent-amber/10 px-4 py-2 text-center text-xs text-accent-amber">
      <FlaskConical className="size-3.5 shrink-0" />
      <span>
        <strong className="font-semibold">Modo demonstração</strong> — dados
        fictícios, sem login. Conecte o Supabase para valer.
      </span>
      <Link
        href="/dashboard/instrucoes"
        className="font-semibold underline underline-offset-2"
      >
        Ver o passo a passo
      </Link>
    </div>
  );
}

/** Iniciais pro avatar: 2 letras do nome (primeira + última palavra), ou a
 *  primeira letra do e-mail quando ainda não há nome cadastrado. */
function initialsOf(name: string, email: string | null): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length > 0) {
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
  }
  return email ? email[0]!.toUpperCase() : "?";
}

/** Cartão do usuário logado na base da sidebar — nome + sobrenome (cadastrados
 *  em Minha conta) no lugar do e-mail cru, com iniciais em avatar. */
function UserCard({
  email,
  firstName,
  lastName,
}: {
  email: string | null;
  firstName: string | null;
  lastName: string | null;
}) {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  // Enquanto não há nome cadastrado, mostra só o usuário do e-mail (antes do
  // "@") em vez do endereço inteiro — menos "cru" na sidebar — e troca o
  // rótulo por um convite pra completar o perfil.
  const emailHandle = email ? email.split("@")[0] : null;
  const display = name || emailHandle || email;
  if (!display) return null;
  const roleLabel = name ? "Usuário" : "Complete seu perfil";

  return (
    <Link
      href="/dashboard/minha-conta"
      className="flex items-center gap-2.5 rounded-md px-1 py-1 transition-colors hover:bg-accent"
    >
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-xs font-semibold text-primary"
      >
        {initialsOf(name, email)}
      </span>
      <span className="min-w-0">
        <span
          className="block truncate text-sm font-medium"
          title={name || email || undefined}
        >
          {display}
        </span>
        <span
          className={cn(
            "block truncate text-xs",
            name ? "text-muted-foreground" : "text-primary",
          )}
        >
          {roleLabel}
        </span>
      </span>
    </Link>
  );
}

function SignOutButton({ full }: { full?: boolean }) {
  return (
    <form action={signOut}>
      <Button
        type="submit"
        variant={full ? "outline" : "ghost"}
        size={full ? "default" : "icon"}
        className={full ? "w-full justify-start gap-3" : undefined}
        aria-label="Sair"
      >
        <LogOut className="size-4" />
        {full ? "Sair" : null}
      </Button>
    </form>
  );
}

/** Estrutura do painel: sidebar fixa no desktop, drawer no mobile, header comum. */
export function PanelShell({
  email,
  firstName = null,
  lastName = null,
  demo = false,
  lifetimeRevenue,
  children,
}: {
  email: string | null;
  /** Nome/sobrenome cadastrados em "Minha conta" — mostrados no lugar do e-mail. */
  firstName?: string | null;
  lastName?: string | null;
  /** Painel aberto sem sessão, com dados fictícios. */
  demo?: boolean;
  /** Faturamento vitalício (todo o histórico) — placar de metas da lateral. */
  lifetimeRevenue: number;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  // md:pl-64 reserva o espaço da sidebar, que é fixed (fora do fluxo).
  return (
    <div className="flex min-h-svh md:pl-64">
      {/* Sidebar desktop: fixed na viewport — imune à rolagem da página. */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col overflow-y-auto border-r border-border/70 bg-card/40 p-4 md:flex">
        <div className="px-1 py-2">
          <Brand />
        </div>
        <div className="px-1">
          <RevenueGoalWidget revenue={lifetimeRevenue} />
        </div>
        <div className="mt-4 flex-1">
          <SidebarNav />
        </div>
        <div className="mt-auto space-y-3 border-t border-border/70 pt-3">
          <UserCard email={email} firstName={firstName} lastName={lastName} />
          {demo ? (
            <p className="px-1 text-xs text-muted-foreground">
              Sessão desativada na demonstração.
            </p>
          ) : (
            <SignOutButton full />
          )}
        </div>
      </aside>

      {/* Coluna principal */}
      <div className="flex min-w-0 flex-1 flex-col">
        {demo ? <DemoBanner /> : null}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-border/70 bg-background/70 px-4 backdrop-blur">
          <div className="flex items-center gap-2">
            {/* Menu mobile */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label="Abrir menu"
                >
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetTitle className="sr-only">Navegação</SheetTitle>
                <div className="px-1 pb-2">
                  <Brand />
                </div>
                <div className="px-1 pb-3">
                  <RevenueGoalWidget revenue={lifetimeRevenue} />
                </div>
                <div className="mt-2 flex-1">
                  <SidebarNav onNavigate={() => setMobileOpen(false)} />
                </div>
                <div className="px-1 pt-2">
                  <UserCard email={email} firstName={firstName} lastName={lastName} />
                </div>
                {demo ? null : (
                  <div className="pt-2">
                    <SignOutButton full />
                  </div>
                )}
              </SheetContent>
            </Sheet>
            <div className="md:hidden">
              <Brand />
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Alvo de portal: páginas com `DashboardCustomizer` (ex.: Visão
                geral) colocam aqui o botão "Personalizar" (só ícone), do lado
                do alternador de tema — pedido do usuário. Fica vazio nas
                páginas que não usam customização de grade. */}
            <div id="dashboard-personalizar-slot" className="contents" />
            <PwaInstallButton variant="ghost" size="icon" iconOnly />
            <ThemeToggle />
            {demo ? null : (
              <div className="hidden md:block">
                <SignOutButton />
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

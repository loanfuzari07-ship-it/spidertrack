"use client";

import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PwaInstallButton } from "@/components/pwa-install-button";
import { BRAND_LOGO, BRAND_NAME, brandInitials } from "@/lib/branding";
import { login } from "./actions";

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const [state, formAction, pending] = useActionState(login, null);

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-3">
      <Card className="w-full" variant="glass">
        <CardHeader className="items-center text-center">
          {BRAND_LOGO ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={BRAND_LOGO}
              alt={BRAND_NAME}
              className="mb-1 size-12 rounded-md object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="mb-1 flex size-12 items-center justify-center rounded-md bg-primary/15 font-mono text-sm font-semibold text-primary"
            >
              {brandInitials()}
            </span>
          )}
          <span className="text-xl font-semibold tracking-tight">
            {BRAND_NAME}
          </span>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="next" value={next} />
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="voce@exemplo.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
              />
            </div>

            {state?.error ? (
              <p
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {state.error}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Entrando…
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Some sozinho se o app já estiver instalado ou o navegador não tiver
          como oferecer instalação (ver `PwaInstallButton`). */}
      <PwaInstallButton variant="ghost" size="sm" />
    </div>
  );
}

"use client";

import { Download, Share, SquarePlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Evento não-padrão do Chrome/Edge/Android — a lib de tipos do TS não o
 *  inclui, então declaramos só o pedaço que usamos. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    nav.standalone === true
  );
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Botão "Instalar app" (PWA). Some sozinho quando o app já está instalado.
 * - Chrome/Edge/Android: dispara o prompt nativo de instalação do navegador.
 * - iPhone/Safari (não tem esse prompt): abre um passo a passo — "Compartilhar
 *   → Adicionar à Tela de Início" — que é o único jeito de instalar lá.
 * - Qualquer outro navegador sem suporte: some (não dá pra oferecer nada útil).
 */
export function PwaInstallButton({
  variant = "outline",
  size = "sm",
  iconOnly = false,
  className,
}: {
  variant?: "outline" | "ghost" | "default";
  size?: "sm" | "icon" | "default";
  /** Só o ícone, sem o texto "Instalar app" — para caber em barras apertadas. */
  iconOnly?: boolean;
  className?: string;
}) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInstalled(isStandalone());
    setIos(isIOS());

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;
  // Sem prompt nativo disponível e não é iPhone: nada de útil a oferecer aqui
  // (desktop sem suporte, navegador que já recusou o prompt antes, etc.).
  if (!deferredPrompt && !ios) return null;

  async function handleClick() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setDeferredPrompt(null);
      return;
    }
    if (ios) setShowIosHelp(true);
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={handleClick}
        aria-label="Instalar aplicativo"
        title="Instalar aplicativo"
        className={iconOnly ? className : `gap-1.5 ${className ?? ""}`}
      >
        <Download className={iconOnly ? "size-5" : "size-4"} />
        {iconOnly ? null : "Instalar app"}
      </Button>

      <Dialog open={showIosHelp} onOpenChange={setShowIosHelp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Instalar no iPhone/iPad</DialogTitle>
            <DialogDescription>
              O Safari não deixa instalar com um botão só — são 2 toques:
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-xs font-semibold text-primary">
                1
              </span>
              <span className="pt-0.5">
                Toque no ícone de{" "}
                <Share className="inline size-4 -translate-y-0.5" /> Compartilhar,
                na barra do Safari (embaixo, no meio).
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-xs font-semibold text-primary">
                2
              </span>
              <span className="pt-0.5">
                Escolha{" "}
                <span className="inline-flex items-center gap-1 font-medium">
                  <SquarePlus className="size-4" /> Adicionar à Tela de Início
                </span>{" "}
                e confirme.
              </span>
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}

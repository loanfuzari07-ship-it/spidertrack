"use client";

import { Bell, BellRing, Share, SquarePlus } from "lucide-react";
import { useEffect, useState } from "react";
import { subscribePush, unsubscribePush } from "@/app/(panel)/actions-push";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";

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

function isSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Web Push exige a chave pública VAPID nesse formato (bytes), não como texto. */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

/**
 * Sino de "Ativar notificações push" — avisa "Venda aprovada!" direto na
 * tela do celular a cada compra aprovada, sem precisar abrir o painel.
 * - Chrome/Edge/Android: funciona no site normal, nem precisa instalar.
 * - iPhone: só funciona com o app instalado (Adicionar à Tela de Início) —
 *   regra do próprio iOS, não dá pra contornar.
 * - Navegador sem suporte nenhum: o botão simplesmente não aparece.
 */
export function PushNotificationButton({
  publicKey,
  variant = "ghost",
  size = "icon",
}: {
  /** Chave pública VAPID gerada e guardada no servidor — null enquanto
   *  carrega, ou quando o recurso está indisponível (ex.: modo demo). */
  publicKey: string | null;
  variant?: "outline" | "ghost" | "default";
  size?: "sm" | "icon" | "default";
}) {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [ios, setIos] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    const ok = isSupported();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(ok);
    setIos(isIOS());
    setStandalone(isStandalone());
    if (!ok) return;

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(Boolean(sub)))
      .catch(() => {});
  }, []);

  if (!publicKey || !supported) return null;

  // iPhone só aceita push com o app instalado (regra do iOS) — pedir
  // permissão nem apareceria; melhor explicar o passo que falta.
  if (ios && !standalone) {
    return (
      <>
        <Button
          type="button"
          variant={variant}
          size={size}
          onClick={() => setShowIosHelp(true)}
          aria-label="Ativar notificações"
          title="Ativar notificações"
        >
          <Bell className="size-4" />
        </Button>
        <Dialog open={showIosHelp} onOpenChange={setShowIosHelp}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Instale o app primeiro</DialogTitle>
              <DialogDescription>
                No iPhone, as notificações só funcionam com o app instalado
                na tela de início — é uma regra do próprio Safari.
              </DialogDescription>
            </DialogHeader>
            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-xs font-semibold text-primary">
                  1
                </span>
                <span className="pt-0.5">
                  Toque no ícone de{" "}
                  <Share className="inline size-4 -translate-y-0.5" />{" "}
                  Compartilhar, na barra do Safari.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-xs font-semibold text-primary">
                  2
                </span>
                <span className="pt-0.5">
                  Escolha{" "}
                  <span className="inline-flex items-center gap-1 font-medium">
                    <SquarePlus className="size-4" /> Adicionar à Tela de
                    Início
                  </span>
                  , abra o app por ali e ative de novo.
                </span>
              </li>
            </ol>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  async function handleClick() {
    if (busy || !publicKey) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;

      if (subscribed) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await unsubscribePush(sub.endpoint);
          await sub.unsubscribe();
        }
        setSubscribed(false);
        toast.success("Notificações desativadas.");
        return;
      }

      if (Notification.permission === "denied") {
        toast.error(
          "As notificações foram bloqueadas no navegador. Ative de novo nas configurações do site.",
        );
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Permissão não concedida.");
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = sub.toJSON() as {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
      };
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("Inscrição incompleta.");
      }

      const res = await subscribePush(
        {
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        },
        navigator.userAgent,
      );
      if (!res.ok) throw new Error(res.error);

      setSubscribed(true);
      toast.success(
        "Notificações ativadas! Você vai receber um aviso a cada venda aprovada.",
      );
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Não foi possível ativar as notificações.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={busy}
      aria-label={subscribed ? "Desativar notificações" : "Ativar notificações"}
      title={subscribed ? "Notificações ativadas" : "Ativar notificações"}
    >
      {subscribed ? (
        <BellRing className="size-4 text-primary" />
      ) : (
        <Bell className="size-4" />
      )}
    </Button>
  );
}

"use client";

import { useEffect } from "react";

/**
 * Registra o service worker do PWA no navegador do cliente.
 * Silencioso em caso de falha (ex: navegador sem suporte, ambiente sem HTTPS).
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Silencioso: PWA é um extra, nunca deve quebrar o painel.
    });
  }, []);

  return null;
}

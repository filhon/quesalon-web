"use client";

import { useSyncExternalStore } from "react";

// localStorage como store externo: sem setState em effect e sem divergir do HTML do servidor
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

export function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocal(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
  listeners.forEach((cb) => cb());
}

/** Valor atual da chave; `serverValue` é o que o servidor (e a hidratação) enxergam. */
export function useLocal(
  key: string,
  serverValue: string | null,
): string | null {
  return useSyncExternalStore(
    subscribe,
    () => readLocal(key),
    () => serverValue,
  );
}

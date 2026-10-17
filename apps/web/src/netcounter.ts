import { useSyncExternalStore } from "react";

// Counts every request to another origin, so the "data leaving this phone" number is measured, not claimed.
// While the service worker controls the page it sees every request (fetch, scripts, images, WASM) and reports
// the outbound ones; before that, a fetch wrapper counts fetch() calls only.
let count = 0;
const listeners = new Set<() => void>();

function bump(): void {
  count++;
  for (const l of listeners) l();
}

const controlled = () => !!navigator.serviceWorker?.controller;

export function installNetCounter(): void {
  const original = window.fetch.bind(window);
  window.fetch = (input, init) => {
    try {
      const url = new URL(input instanceof Request ? input.url : String(input), location.href);
      if (url.origin !== location.origin && !controlled()) bump();
    } catch {}
    return original(input, init);
  };
  navigator.serviceWorker?.addEventListener("message", (e: MessageEvent<{ type?: string }>) => {
    if (e.data?.type === "outbound") bump();
  });
}

export function useOutboundCount(): number {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => count,
  );
}

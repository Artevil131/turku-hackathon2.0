import { useSyncExternalStore } from "react";

// Counts every fetch to another origin, so the "data leaving this phone" number is measured, not claimed.
let count = 0;
const listeners = new Set<() => void>();

export function installNetCounter(): void {
  const original = window.fetch.bind(window);
  window.fetch = (input, init) => {
    try {
      const url = new URL(input instanceof Request ? input.url : String(input), location.href);
      if (url.origin !== location.origin) {
        count++;
        for (const l of listeners) l();
      }
    } catch {}
    return original(input, init);
  };
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

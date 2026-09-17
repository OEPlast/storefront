'use client';

import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';

/**
 * A clock that is safe to read during render.
 *
 * Now that pages are cached for up to 12 hours, the HTML a visitor receives was rendered at some
 * earlier `renderedAt`. Anything that compares "now" against a sale's start or end date — the Sale
 * badge, the discounted price, the flash-sale countdown, the "New" tag — would therefore compute
 * one answer on the server and a different one in the browser, and React would report a hydration
 * mismatch (#418 / #425) and throw the whole server-rendered tree away.
 *
 * `useSyncExternalStore` solves this exactly: React uses `getServerSnapshot` for the SSR render
 * *and* for the hydration render, then immediately re-renders with the client snapshot. So the
 * first paint matches the cached HTML, and a fraction of a second later the page corrects itself
 * to the real time.
 *
 * Read it with `useNow()` and pass the value into the pricing helpers rather than letting them
 * call `Date.now()` themselves:
 *
 *   const now = useNow();
 *   const sale = useMemo(() => calculateBestSale(data.sale, data.price, undefined, now), [data.sale, data.price, now]);
 */

/** The moment the server rendered this page. Baked into the HTML, so it can be 12 hours old. */
const RenderedAtContext = createContext<number | null>(null);

export function RenderClockProvider({ renderedAt, children }: { renderedAt: number; children: ReactNode; }) {
  return <RenderedAtContext.Provider value={renderedAt}>{children}</RenderedAtContext.Provider>;
}

/**
 * 30 seconds. Every subscriber re-renders on each tick, and a category page has dozens of product
 * cards, so this is deliberately coarse: it only has to notice that a sale window opened or closed,
 * not drive a seconds display. `SalesCountdownTimer` keeps its own 1-second interval for that.
 */
const TICK_MS = 30_000;

const listeners = new Set<() => void>();
let currentNow = 0;
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!timer) {
    currentNow = Date.now();
    timer = setInterval(() => {
      currentNow = Date.now();
      listeners.forEach((l) => l());
    }, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

/**
 * Must return a *cached* value: returning a fresh `Date.now()` on every call would make React see
 * a new snapshot on every render and loop forever.
 */
function getSnapshot(): number {
  if (currentNow === 0) currentNow = Date.now();
  return currentNow;
}

/** Only reached when a tree renders outside `RenderClockProvider`; stable for the process. */
const MODULE_LOADED_AT = Date.now();

/** Milliseconds since the epoch — the page's render time until hydration, the real clock after. */
export function useNow(): number {
  const renderedAt = useContext(RenderedAtContext);
  return useSyncExternalStore(subscribe, getSnapshot, () => renderedAt ?? MODULE_LOADED_AT);
}

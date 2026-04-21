import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  // Keep runtime caching conservative. Next 16 issues additional RSC/data
  // requests that the generic default cache rules can mis-handle and surface
  // `no-response` errors from the service worker.
  runtimeCaching: [],
});

serwist.addEventListeners();

import { atom } from "nanostores";
import { MouseTracker } from "@clxd/affer";

export const $mouse = atom<MouseTracker | null>(null);
let instance: MouseTracker | null = null;

export function startMouseTracking() {
  if (typeof window === "undefined" || instance) return;

  instance = new MouseTracker({
    lerpFactor: 10,
    trackTouch: true,
  });

  $mouse.set(instance);
}

export function stopMouseTracking() {
  if (instance) {
    instance.destroy();
    instance = null;
    $mouse.set(null);
  }
}

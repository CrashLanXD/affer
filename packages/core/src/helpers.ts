export interface Updatable {
  update:       (deltaTime?: number) => void;
  isDestroyed?: boolean;
  destroy?:     () => void;
}

/**
 * Groups multiple Updatable instances to synchronize them
 * under a single ticker or animation loop.
 *
 * @param trackers  Optional initial list of Updatable instances.
 * @returns An object with:
 *   - `update(deltaTime?)` — call this from your Ticker or rAF loop.
 *   - `add(tracker)`       — register a new Updatable at any time.
 *   - `remove(tracker)`    — unregister a tracker immediately.
 *   - `clear()`            — destroys and unregisters all trackers.
 *   - `size()`             — returns the number of registered trackers.
 *   - `has(tracker)`       — returns true if the tracker is registered.
 *
 * @example
 * const bundle = createTickerBundle([mouseTracker, scrollTracker]);
 * Ticker.add((tickData) => bundle.update(tickData.deltaTime));
 */
export function createTickerBundle(trackers: Updatable[] = []) {
  const activeTrackers = new Set<Updatable>(trackers);
  let trackersArray = Array.from(activeTrackers);
  let arrayDirty = false;
  
  return {
    update: (deltaTime?: number) => {
      if (arrayDirty) {
        trackersArray = Array.from(activeTrackers);
        arrayDirty = false;
      }

      const snapshot = trackersArray;
      const len = snapshot.length;
      let needsCleanup = false;

      for (let i = 0; i < len; i++) {
        const tracker = snapshot[i];
        if (tracker.isDestroyed) { needsCleanup = true; continue; }
        tracker.update(deltaTime);
      }

      if (needsCleanup) {
        for (let i = 0; i < len; i++) {
          if (snapshot[i].isDestroyed) activeTrackers.delete(snapshot[i]);
        }
        trackersArray = Array.from(activeTrackers);
      }
    },
    add: (tracker: Updatable) => {
      if (!activeTrackers.has(tracker) && !tracker.isDestroyed) {
        activeTrackers.add(tracker);
        arrayDirty = true;
      }
    },
    remove: (tracker: Updatable) => {
      if (activeTrackers.delete(tracker)) arrayDirty = true;
    },
    clear: () => {
      for (const tracker of activeTrackers) {
        if (tracker.destroy) tracker.destroy();
      }
      activeTrackers.clear();
      trackersArray = [];
      arrayDirty = false;
    },
    size: () => activeTrackers.size,
    has:  (tracker: Updatable) => activeTrackers.has(tracker),
  };
}

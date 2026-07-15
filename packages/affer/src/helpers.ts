export interface Updatable<T = void> {
  update(data: T): void;
  isDestroyed?: boolean;
  destroy?:     () => void;
}

/**
 * Groups multiple Updatable instances to synchronize them under a single update cycle.
 *
 * @template T The type of data injected during the update pass. Defaults to `number`.
 * @param instances Optional initial array of Updatable elements.
 * @returns An object containing management operators:
 * - `update(data)`    — Triggers the update lifecycle pass across all registered elements.
 * - `add(instance)`   — appends an active updatable member to the tracking stack.
 * - `remove(instance)`— Detaches an element instantly from the collection pool.
 * - `clear()`         — Executes optional teardown sequences and purges the group stack.
 * - `size`            — Property exposing the exact amount of unique instances tracked.
 * - `has(instance)`   — Returns true if the entity is registered inside the tracking group.
 *
 * @example
 * - Standard usage tracking numerical deltaTime coordinates
 * const physicalGroup = createUpdateGroup([particleEmitter, vehiclePhysics]);
 * Ticker.add(({ deltaTime }) => physicalGroup.update(deltaTime));
 *
 * @example
 * - Custom contextual tracking utilizing explicit internal TickData structures
 * const advancedGroup = createUpdateGroup<TickData>();
 * Ticker.add((tickData) => advancedGroup.update(tickData));
 */
export function createUpdateGroup<T = number>(instances: Updatable<T>[] = []) {
  const activeInstances = new Set<Updatable<T>>(instances);
  let instancesArray = Array.from(activeInstances);
  let arrayDirty = false;
  
  return {
    update: (data: T) => {
      if (arrayDirty) {
        instancesArray = Array.from(activeInstances);
        arrayDirty = false;
      }

      const snapshot = instancesArray;
      const len = snapshot.length;
      let needsCleanup = false;

      for (let i = 0; i < len; i++) {
        const instance = snapshot[i];
        if (instance.isDestroyed) { needsCleanup = true; continue; }
        instance.update(data);
      }

      if (needsCleanup) {
        for (let i = 0; i < len; i++) {
          if (snapshot[i].isDestroyed) activeInstances.delete(snapshot[i]);
        }
        instancesArray = Array.from(activeInstances);
      }
    },
    add: (instance: Updatable<T>) => {
      if (!activeInstances.has(instance) && !instance.isDestroyed) {
        activeInstances.add(instance);
        arrayDirty = true;
      }
    },
    remove: (instance: Updatable<T>) => {
      if (activeInstances.delete(instance)) arrayDirty = true;
    },
    clear: () => {
      for (const instance of activeInstances) {
        if (instance.destroy) instance.destroy();
      }
      activeInstances.clear();
      instancesArray = [];
      arrayDirty = false;
    },
    get size() { return activeInstances.size; },
    has: (instance: Updatable<T>) => activeInstances.has(instance),
  };
}

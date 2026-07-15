---
title: UpdateGroup
description: Utility to combine multiple update-driven instances under a single generic processing chain.
---

An UpdateGroup organizes multiple objects that implement an `update` method, allowing them to be driven together by a single external lifecycle execution channel.

Instead of registering dozens of individual object entities directly onto a core loop manager, instances are registered into an isolated group that processes its members sequentially. Thanks to TypeScript generics, an UpdateGroup can accept any custom state context data payload.

```ts
import { createUpdateGroup } from "@clxd/affer";

```

---

## Quick Start

Initialize an UpdateGroup by specifying the type payload context your members expect. If left blank, it defaults to a numerical payload (`number` representing a deltaTime offset).

```ts
import { createUpdateGroup, Ticker } from "@clxd/affer";

// 1. Default Number Context (deltaTime)
const dynamicEntities = createUpdateGroup([player, enemy]);

Ticker.add(({ deltaTime }) => {
  dynamicEntities.update(deltaTime); // Transmits number parameter
});

```

### Complex Object Contexts

You can bind groups to rich payload objects (like Affer's full `TickData` context or a custom physics engine boundary instance):

```ts
import { createUpdateGroup, Ticker, TickData } from "@clxd/affer";

// 2. Custom Rich Object Context
const systemGroup = createUpdateGroup<TickData>([particleSystem, postProcessor]);

Ticker.add((tickData) => {
  systemGroup.update(tickData); // Transmits complete TickData object context
});

```

---

## Why this Utility exists

Registering each game entity, UI component, or mesh modifier independently onto a global ticker loop pollutes active listener structures.

UpdateGroup isolates related objects inside an independent execution list. It manages additions, internal removals, and automatic memory cleanup for destroyed instances natively, remaining completely decoupled from the specific timing architecture driving the app.

---

## Properties

| Property | Type | Description |
| --- | --- | --- |
| `size` | `number` | Returns the current quantity of unique active objects tracked within the collection. |

---

## Methods

### `update(data: T)`

Iterates through all registered instances sequentially and invokes their `update` method passing the typed data token. Instances marked with `isDestroyed: true` are filtered out and removed from the tracking stack.

```ts
// Execute updates down through the collection tree structure
group.update(contextData);

```

---

### `add(instance)`

Appends an entity to the active update collection. Instances already present in the collection or marked as destroyed are ignored.

```ts
group.add(customEntity);

```

---

### `remove(instance)`

Detaches an active entity from the group, stopping its update sequence.

```ts
group.remove(customEntity);

```

---

### `clear()`

Calls the `destroy()` method on all contained instances (if implemented) and empties the tracking set.

```ts
group.clear();

```

---

### `has(instance)`

Returns a boolean indicating whether the specified entity is currently registered in the group.

```ts
if (group.has(playerInstance)) {
  console.log("Player is actively updating inside this group.");
}

```

---

## Examples

### Custom Physics Loop Mapping

UpdateGroup works perfectly outside of Affer's core Ticker too. Here it binds a generic physics world state passing down an immutable server node reference:

```ts
import { createUpdateGroup } from "@clxd/affer";

interface PhysicsWorld {
  gravity: number;
  substeps: number;
}

const simulationGroup = createUpdateGroup<PhysicsWorld>();

// Native loop driving independent calculations
function stepSimulation(worldContext: PhysicsWorld) {
  simulationGroup.update(worldContext);
}

```

---

## Performance Notes

* **Array Reconstruction Deferred:** Additions and removals flag the group's tracking array as dirty. Array reconstruction from the underlying Set occurs exactly once at the beginning of the next update pass, minimizing memory allocation overhead.
* **Inline Garbage Collection:** Processing automatically detects dead components via the `isDestroyed` flag, removing them from the tracking loop without requiring external teardown cycles.

---

## Types

```ts
export interface Updatable<T = number> {
  update(data: T): void;
  isDestroyed?: boolean;
  destroy?(): void;
}

export function createUpdateGroup<T = number>(instances?: Updatable<T>[]): {
  update: (data: T) => void;
  add:    (instance: Updatable<T>) => void;
  remove: (instance: Updatable<T>) => void;
  clear:  () => void;
  size:   number;
  has:    (instance: Updatable<T>) => boolean;
};

```
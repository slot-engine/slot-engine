# Slot Engine Optimizer

Optimize lookup tables to reach a target RTP.

[📖 Documentation](https://slot-engine.dev)


## Usage

When using `@slot-engine/core`, you don't need to call `optimize()` yourself. Configure it via `game.configureOptimization()` instead, or call it manually from the `onGameModeComplete` hook.

See the [optimization docs](https://slot-engine.dev/docs/core/game-tasks/optimization) for details.

You can trigger optimization manually like this:

```ts
import { optimize } from "@slot-engine/optimizer"

await optimize({
  input: {
    lookupTable: "__build__/lookUpTable_base.csv",
    lookupTableSegmented: "__build__/lookUpTableSegmented_base.csv",
  },
  output: {
    lookupTable: "__build__/publish_files/lookUpTable_base_0.csv",
  },
  cost: 1,
  rtp: 0.96,
  targets: {
    "0": {},
    basegame: { hitRate: 4 },
    freespins: { hitRate: 150, rtp: 0.38 },
    maxwin: { hitRate: 100_000 },
  },
})
```

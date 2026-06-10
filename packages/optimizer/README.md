# @slot-engine/optimizer

Pure TypeScript lookup table optimizer for [slot-engine](https://slot-engine.dev) games.

After simulating a game mode, the lookup table contains every simulated result with a weight of 1. The optimizer assigns new weights so the game pays out **exactly** the configured RTP, with the configured hit rates and payout distribution per criteria — while staying as close as possible to the simulated distribution (minimum KL-divergence, solved as a convex optimization problem).

## Usage

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
    "0": {}, // absorbs the remaining probability
    basegame: { hitRate: 4 }, // gets the remaining RTP
    freespins: { hitRate: 150, rtp: 0.38 },
    maxwin: { hitRate: 100_000 },
  },
})
```

When using `@slot-engine/core`, you don't need to call `optimize()` yourself — configure it via `game.configureOptimization()` instead, or call it manually from the `onGameModeComplete` hook.

See the [optimization docs](https://slot-engine.dev/docs/core/game-tasks/optimization) for details.

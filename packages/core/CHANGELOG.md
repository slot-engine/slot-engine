# @slot-engine/core

## 0.1.10

### Patch Changes

- Fix bug in GeneratedReelSet - Thanks @nordowl

## 0.1.9

### Patch Changes

- Fix bug in GeneratedReelSet causing internal reel data to duplicate - Thanks @nordowl

## 0.1.8

### Patch Changes

- Introduce some methods for board manipulation - Thanks @nordowl

  The following methods have been added to the board service:
  - `setSymbolsPerReel`
  - `setReelsAmount`
  - `removeSymbol`
  - `tumbleBoardAndForget`

## 0.1.7

### Patch Changes

- Fix LinesWinType - Thanks @nordowl

## 0.1.6

### Patch Changes

- Various bug fixes ([#28](https://github.com/slot-engine/slot-engine/pull/28)) - Thanks @nordowl

## 0.1.5

### Patch Changes

- Fix critical bug in tumbling mechanics - Thanks @nordowl

## 0.1.4

### Patch Changes

- Fix minor bug in ClusterWinType - Thanks @nordowl

- Improve simulation performance and reduce RAM usage ([#26](https://github.com/slot-engine/slot-engine/pull/26)) - Thanks @nordowl

  Previously, a noticable performance drop could be observed going into 400.000 completed simulations.
  Slot Engine stored a lot of data in memory during simulations, which caused high RAM usage and slowdowns.
  With this update, temporary data is now written to disk instead of being kept in memory,
  which greatly improves performance and reduces RAM consumption during large simulation runs.

  Simulation data handling has changed substantially,
  so if you experience any issues after this update please open a bug report.

## 0.1.3

### Patch Changes

- Fix check in optimizer - Thanks @nordowl

  Previously, each optimization condition needed to have a corresponding `ResultSet` in a game mode.
  This was wrong - it should be the other way around.

  Instead, now an optimization condition is not bound to a specific `ResultSet`.
  Each `ResultSet` however must have an optimization condition defined.

## 0.1.2

### Patch Changes

- Fix bugs and improve optimizer logging - Thanks @nordowl

- Fix issue with root path ([#21](https://github.com/slot-engine/slot-engine/pull/21)) - Thanks @nordowl

## 0.1.1

### Patch Changes

- Adjust how `WinType.postProcess` works - Thanks @nordowl

  `postProcess` now must return only the modified win combinations.
  The total `payout` is automatically calculated from the modified win combinations
  and must not be explicitly returned anymore.

  ```ts
  const { payout, winCombinations } = lines
    .evaluateWins(reels)
    .postProcess((wins) => {
      const newWins = wins.map((w) => ({
        ...w,
        payout: w.payout * 2,
      }))

      return {
        winCombinations: newWins,
      }
    })
    .getWins()
  ```

## 0.1.0

### Minor Changes

- ### 🚀 0.1.0 - First Stable Release - Thanks @nordowl

  This release marks the first stable version of `@slot-engine/core` (or at least I think it is).

  Try Slot Engine today and start building your own slot games with TypeScript!

  [View Documentation](https://slot-engine.dev/docs/core)

  **If you encounter any bugs or pain points, don't hesitate to open an issue.**

  ### Roadmap

  Over the next weeks, I plan to focus on the following features and improvements:
  - Fix any discovered / reported bugs
  - Improve test coverage

  Feel free to suggest additional features or improvements by opening an issue or a discussion.

## 0.0.11

### Patch Changes

- Fixed tumbleBoard and added tests - Thanks @nordowl

- **BREAKING**: `drawBoardWithForcedStops` now accepts an options object instead of multiple parameters. - Thanks @nordowl

## 0.0.10

### Patch Changes

- Add ManywaysWinType - Thanks @nordowl

- Add ClusterWinType + Tests - Thanks @nordowl

- Add methods to read/write board symbols - Thanks @nordowl

## 0.0.9

### Patch Changes

- Write win range stats to file - Thanks @nordowl

## 0.0.8

### Patch Changes

- Make all OptimizationParameters optional - Thanks @nordowl

## 0.0.7

### Patch Changes

- Fix index.json including modes that were not simulated - Thanks @nordowl

## 0.0.6

### Patch Changes

- Major refactor introducing a more unified game context and better internal structure. ([#10](https://github.com/slot-engine/slot-engine/pull/10)) - Thanks @nordowl

  (Docs will be updated and will be going live soon.)

## 0.0.5

### Patch Changes

- Add check for reel set lengths - Thanks @nordowl

- Removed ReelGenerator outputDir option, as it was unused - Thanks @nordowl

- Ensure ReelGenerator can be run without specifying symbolWeights keys - Thanks @nordowl

- Fix ResultSet to accept any quota - Thanks @nordowl

- Add additional check to GameMode constructor - Thanks @nordowl

## 0.0.4

### Patch Changes

- Minor internal polishing - Thanks @nordowl

## 0.0.3

### Patch Changes

- Fix bugs causing crashes - Thanks @nordowl

- Improved type safety for `config.symbols.get()` - Thanks @nordowl

- Fix analysis of non zero wins hit rate - Thanks @nordowl

- Set minimum Node version to 23.8.0 to support native zstd compression - Thanks @nordowl

## 0.0.2

### Patch Changes

- Cleaned up files to publish - Thanks @nordowl

## 0.0.1

### Patch Changes

- Initial npm release for testing purposes. ([#2](https://github.com/slot-engine/slot-engine/pull/2)) - Thanks @nordowl

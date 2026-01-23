# @slot-engine/core

## 0.2.1

### Patch Changes

- TUI can now be quit with "q"; Limit number of logs in memory - Thanks @nordowl

- Add option to enable creation of uncompressed books - Thanks @nordowl

## 0.2.0

### Minor Changes

- Omit generation of uncompressed book files. Generate compressed book chunks instead. ([#45](https://github.com/slot-engine/slot-engine/pull/45)) - Thanks @nordowl

  This will add some minor memory overhead during simulation, but significantly reduces the disk space required for storing book files.
  Compressed books can be inspected with `@slot-engine/panel`.

- **[BREAKING]** Slot Engine now requires a flag to run! ([#45](https://github.com/slot-engine/slot-engine/pull/45)) - Thanks @nordowl

  To enable compatibility with `@slot-engine/panel`, it is now required to use the `--slot-engine-run` flag
  when running simulations for your game.

  ```sh
  pnpm tsx ./path-to/your-game.ts --slot-engine-run
  ```

  A Slot Engine game is typically run by having a `runTasks()` call at the top level of your game file.
  Due to the nature of JavaScript modules, when exporting and importing your game
  to connect it with `@slot-engine/panel`, `runTasks()` would be called immediately upon import
  causing unintended simulations to run.

  To prevent this, Slot Engine now requires the explicit flag to run simulations.

  Multiple approaches to tackle this have been considered, but this approach was chosen
  to minimize friction for existing users while ensuring compatibility with `@slot-engine/panel`.

### Patch Changes

- Enhance summary in stats_payouts.json ([#45](https://github.com/slot-engine/slot-engine/pull/45)) - Thanks @nordowl

- Enable importing types directly from @slot-engine/core/types ([#45](https://github.com/slot-engine/slot-engine/pull/45)) - Thanks @nordowl

- Implement interactive terminal UI ([#45](https://github.com/slot-engine/slot-engine/pull/45)) - Thanks @nordowl

- Add `ctx.services.data.log()` method for logging messages to the TUI ([#45](https://github.com/slot-engine/slot-engine/pull/45)) - Thanks @nordowl

  Developer note:
  - Since `console.log` was not working reliably in worker threads, this service method was added

- Internal restructure, enabling panel compatibility ([#45](https://github.com/slot-engine/slot-engine/pull/45)) - Thanks @nordowl

- `force_keys_<mode>.json` is now generated ([#45](https://github.com/slot-engine/slot-engine/pull/45)) - Thanks @nordowl

- Fix non-maxwin result sets being able to hit max wins. ([#45](https://github.com/slot-engine/slot-engine/pull/45)) - Thanks @nordowl

  Developer note:
  - A result set _without_ explicit `multiplier` (and `maxwin: false`), will _always_ accept results with payouts > 0 and < max win.

- Improve simulation summary in console. This is also written to `__build__/simulation_summary.json`. ([#45](https://github.com/slot-engine/slot-engine/pull/45)) - Thanks @nordowl

## 0.1.14

### Patch Changes

- Fix services not working in ResultSet evaluate function - Thanks @nordowl

- Fix crash that could occurr when writing lookup tables - Thanks @nordowl

## 0.1.13

### Patch Changes

- Fix bug in GeneratedReelSet - Thanks @nordowl

## 0.1.12

### Patch Changes

- Properly terminate the simulation workers event loop ([#41](https://github.com/slot-engine/slot-engine/pull/41)) - Thanks @jordanamr

- Destroy object reference when writing event data - Thanks @nordowl

- Suppress warning in console ([#40](https://github.com/slot-engine/slot-engine/pull/40)) - Thanks @jordanamr

## 0.1.11

### Patch Changes

- Greatly improve memory usage using backpressure - Thanks @nordowl

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

> [!NOTE]
> This software **is work in progress** and may currently miss features or contain bugs. Feel free to contribute to help improve this project. Breaking changes may occur at any time.

# Slot Engine

TypeScript libraries for building slot games.

## Available Packages

### `@slot-engine/core`

Library for configuring and simulating slot games. Produces output compatible with Stake Engine / Stake RGS.

[📖 Documentation](https://slot-engine.dev/docs/core)  

### `@slot-engine/lgs`

Local gaming server. Test your game locally without uploading to Stake Engine and save time during development.

[📖 Documentation](https://slot-engine.dev/docs/lgs)

## To-Do List
- Add Cluster Win Evaluation Class (`src/winTypes/ClusterWinType.ts`)
- Add "ManyWays" Win Evaluation Class (`src/winTypes/ManywaysWinType.ts`)
- Add `tumbleBoard()` utility function (being worked on)
- Improve type-safety dealing with symbols for reel generators
- Improve overall type-safety for better DX
- Add tests with Vitest (being worked on)

PR's are welcome!

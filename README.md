> [!NOTE]
> This software **is work in progress** and may currently miss features or contain bugs. Feel free to contribute to help improve this project. Breaking changes may occur at any time.

# Slot Engine

Slot math toolkit in TypeScript compatible with Stake RGS / Carrot RGS.

## Slot Engine Core vs Stake Math SDK

While both solutions allow developers to create highly customizable slot games,
some people may prefer programming in TypeScript over Python.

Both APIs are **highly opinionated** and provide a **structured way to define slot games**,
but the TypeScript API may **feel more natural to JavaScript/TypeScript developers**
and is more declarative in nature. With this toolkit, you can define your entire game in a single configuration without needing to jump between files. Also no dealing with class overrides.

## ... TODO

## To-Do List
- Add Cluster Win Evaluation Class (`src/winTypes/ClusterWinType.ts`)
- Add "ManyWays" Win Evaluation Class (`src/winTypes/ManywaysWinType.ts`)
- Add auto completion for `gameConfig.symbols.get("symbol")`
- Improve type-safety dealing with symbols for reel generators
- Improve overall type-safety for better DX
- Refactor `StandaloneBoard` and `Board` to reduce code duplication

PR's are welcome!
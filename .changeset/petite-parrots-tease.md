---
"@slot-engine/core": minor
---

**[BREAKING]** Slot Engine now requires a flag to run!

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
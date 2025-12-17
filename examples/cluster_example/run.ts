import { game } from "./"

game.runTasks({
  doSimulation: true,
  doOptimization: false,
  optimizationOpts: {
    gameModes: ["base", "bonus"],
  },
  doAnalysis: true,
  analysisOpts: {
    gameModes: ["base", "bonus"],
  },
})

import { game } from "./"

game.runTasks({
  doSimulation: true,
  doOptimization: false,
  optimizationOpts: {
    gameModes: ["base"],
  },
  doAnalysis: true,
  analysisOpts: {
    gameModes: ["base", "bonus"],
  },
})

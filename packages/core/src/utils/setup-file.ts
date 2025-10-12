import path from "path"
import { writeFile } from "../../utils"
import { Optimizer } from "../optimizer"

export function makeSetupFile(optimizer: Optimizer, gameMode: string) {
  const gameConfig = optimizer.getGameConfig()
  const optimizerGameModes = optimizer.getOptimizerGameModes()
  const modeConfig = optimizerGameModes[gameMode]

  if (!modeConfig) {
    throw new Error(`Game mode "${gameMode}" not found in optimizer configuration.`)
  }

  const params = modeConfig.parameters.getParameters()

  let content = ""
  content += `game_name;${gameConfig.id}\n`
  content += `bet_type;${gameMode}\n`
  content += `num_show_pigs;${params.numShowPigs}\n`
  content += `num_pigs_per_fence;${params.numPigsPerFence}\n`
  content += `threads_for_fence_construction;${params.threadsFenceConstruction}\n`
  content += `threads_for_show_construction;${params.threadsShowConstruction}\n`
  content += `score_type;${params.scoreType}\n`
  content += `test_spins;${JSON.stringify(params.testSpins)}\n`
  content += `test_spins_weights;${JSON.stringify(params.testSpinsWeights)}\n`
  content += `simulation_trials;${params.simulationTrials}\n`
  content += `graph_indexes;0\n`
  content += `run_1000_batch;False\n`
  content += `simulation_trials;${params.simulationTrials}\n`
  content += `user_game_build_path;${path.join(process.cwd(), gameConfig.outputDir)}\n`
  content += `pmb_rtp;${params.pmbRtp}\n`

  const outPath = path.join(__dirname, "../../optimizer-rust/src", "setup.txt")

  writeFile(outPath, content)
}

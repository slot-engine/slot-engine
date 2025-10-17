import { GameConfig, OptimizationConditions, OptimizationScaling } from "../../index"
import { GameModeName } from "../GameMode"
import { OptimizationParameters } from "./OptimizationParameters"
import { makeMathConfig } from "../utils/math-config"
import { makeSetupFile } from "../utils/setup-file"
import { spawn } from "child_process"
import path from "path"
import { Analysis } from "../analysis"
import assert from "assert"
import { isMainThread } from "worker_threads"
import { SlotGame } from "../SlotGame"

export class Optimizer {
  protected readonly gameConfig: GameConfig["config"]
  protected readonly gameModes: OptimzierGameModeConfig

  constructor(opts: OptimizerOpts) {
    this.gameConfig = opts.game.getConfig().config
    this.gameModes = opts.gameModes

    this.verifyConfig()
  }

  /**
   * Runs the optimization process, and runs analysis after.
   */
  async runOptimization({ gameModes }: OptimizationOpts) {
    if (!isMainThread) return // IMPORTANT: Prevent workers from kicking off (multiple) optimizations

    const mathConfig = makeMathConfig(this, { writeToFile: true })

    for (const mode of gameModes) {
      const setupFile = makeSetupFile(this, mode)
      await this.runSingleOptimization()
    }
  }

  private async runSingleOptimization() {
    return await rustProgram()
  }

  private verifyConfig() {
    for (const [k, mode] of Object.entries(this.gameModes)) {
      const configMode = this.gameConfig.gameModes[k]

      if (!configMode) {
        throw new Error(
          `Game mode "${mode}" defined in optimizer config does not exist in the game config.`,
        )
      }

      const conditions = Object.keys(mode.conditions)
      const scalings = Object.keys(mode.scaling)
      const parameters = Object.keys(mode.parameters)

      for (const condition of conditions) {
        if (!configMode.resultSets.find((r) => r.criteria === condition)) {
          throw new Error(
            `Condition "${condition}" defined in optimizer config for game mode "${k}" does not exist as criteria in any ResultSet of the same game mode.`,
          )
        }
      }

      const criteria = configMode.resultSets.map((r) => r.criteria)
      assert(
        conditions.every((c) => criteria.includes(c)),
        `Not all ResultSet criteria in game mode "${k}" are defined as optimization conditions.`,
      )

      let gameModeRtp = configMode.rtp
      let paramRtp = 0
      for (const cond of conditions) {
        const paramConfig = mode.conditions[cond]!
        paramRtp += Number(paramConfig.getRtp())
      }

      gameModeRtp = Math.round(gameModeRtp * 1000) / 1000
      paramRtp = Math.round(paramRtp * 1000) / 1000

      assert(
        gameModeRtp === paramRtp,
        `Sum of all RTP conditions (${paramRtp}) does not match the game mode RTP (${gameModeRtp}) in game mode "${k}".`,
      )
    }
  }

  getGameConfig() {
    return this.gameConfig
  }

  getOptimizerGameModes() {
    return this.gameModes
  }
}

async function rustProgram(...args: string[]) {
  return new Promise((resolve, reject) => {
    const task = spawn("cargo", ["run", "--release", ...args], {
      shell: true,
      cwd: path.join(__dirname, "./optimizer-rust"),
      stdio: "pipe",
    })
    task.on("error", (error) => {
      console.error("Error:", error)
      reject(error)
    })
    task.on("exit", () => {
      resolve(true)
    })
    task.on("close", () => {
      resolve(true)
    })
    task.stdout.on("data", (data) => {
      console.log(data.toString())
    })
    task.stderr.on("data", (data) => {
      console.log(data.toString())
    })
    task.stdout.on("error", (data) => {
      console.log(data.toString())
      reject(data.toString())
    })
  })
}

export interface OptimizationOpts {
  gameModes: string[]
}

export interface OptimizerOpts {
  game: SlotGame<any, any, any>
  gameModes: OptimzierGameModeConfig
}

export type OptimzierGameModeConfig = Record<
  GameModeName,
  {
    conditions: Record<string, OptimizationConditions>
    scaling: OptimizationScaling
    parameters: OptimizationParameters
  }
>

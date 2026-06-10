import { isMainThread } from "worker_threads"
import { optimize, type GameModeOptimization } from "@slot-engine/optimizer"
import { SlotGame } from "../slot-game"
import { GameConfig, GameMetadata } from "../game-config"
import { AnyGameModes } from "../types"
import { makeLutIndexFromPublishLut } from "../simulation/utils"

/**
 * The optimization configuration, keyed by game mode name.
 */
export type OptimizationConfig<TGameModes extends AnyGameModes = AnyGameModes> = {
  [K in keyof TGameModes]?: GameModeOptimization
}

export class Optimizer {
  protected readonly gameConfig: GameConfig
  protected readonly gameMeta: GameMetadata
  protected readonly config: OptimizationConfig

  constructor(opts: OptimizerOpts) {
    this.gameConfig = opts.game.getConfig()
    this.gameMeta = opts.game.getMetadata()
    this.config = opts.config
    this.verifyConfig()
  }

  /**
   * Runs the optimization for the configured game modes.
   */
  async runOptimization(opts: OptimizationOpts = {}) {
    if (!isMainThread) return // IMPORTANT: Prevent workers from kicking off (multiple) optimizations

    const configuredModes = Object.keys(this.config)
    const modes = opts.gameModes?.length ? opts.gameModes : configuredModes

    for (const mode of modes) {
      const modeConfig = this.config[mode]
      if (!modeConfig) {
        throw new Error(
          `Tried to optimize game mode "${mode}", but it has no optimization configured.`,
        )
      }
      const gameMode = this.gameConfig.gameModes[mode]!

      await optimize({
        input: {
          lookupTable: this.gameMeta.paths.lookupTable(mode),
          lookupTableSegmented: this.gameMeta.paths.lookupTableSegmented(mode),
        },
        output: {
          lookupTable: this.gameMeta.paths.lookupTablePublish(mode),
        },
        cost: gameMode.cost,
        rtp: gameMode.rtp,
        ...modeConfig,
      })

      await makeLutIndexFromPublishLut(
        this.gameMeta.paths.lookupTablePublish(mode),
        this.gameMeta.paths.lookupTableIndex(mode),
      )
    }
    console.log("Optimization complete. Files written to build directory.")
  }

  private verifyConfig() {
    for (const [modeName, modeConfig] of Object.entries(this.config)) {
      const configMode = this.gameConfig.gameModes[modeName]

      if (!configMode) {
        throw new Error(
          `Game mode "${modeName}" defined in the optimization config does not exist in the game config.`,
        )
      }
      if (!modeConfig) continue

      const targets = Object.keys(modeConfig.targets)

      for (const rs of configMode.resultSets) {
        if (!targets.includes(rs.criteria)) {
          throw new Error(
            `ResultSet criteria "${rs.criteria}" in game mode "${modeName}" does not have a corresponding optimization target defined.`,
          )
        }
      }

      const criteriaNames = configMode.resultSets.map((rs) => rs.criteria)
      for (const target of targets) {
        if (!criteriaNames.includes(target)) {
          throw new Error(
            `Optimization target "${target}" in game mode "${modeName}" does not match any ResultSet criteria.`,
          )
        }
      }

      const absorbers = Object.entries(modeConfig.targets).filter(
        ([, t]) => t.hitRate === undefined,
      )
      if (absorbers.length > 1) {
        throw new Error(
          `Game mode "${modeName}": only one optimization target may omit "hitRate" (it absorbs the remaining probability), but ${absorbers.length} do: ${absorbers
            .map(([c]) => `"${c}"`)
            .join(", ")}.`,
        )
      }
    }
  }

  getGameConfig() {
    return this.gameConfig
  }

  getGameMeta() {
    return this.gameMeta
  }
}

export interface OptimizationOpts {
  /**
   * The game modes to optimize. Defaults to all configured game modes.
   */
  gameModes?: string[]
}

export interface OptimizerOpts {
  game: SlotGame<any, any, any>
  config: OptimizationConfig
}

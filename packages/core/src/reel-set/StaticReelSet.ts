import assert from "assert"
import { ReelSet, ReelSetOptions } from "."
import { GameConfig } from "../game-config"
import { Simulation } from "../simulation"
import { Reels } from "../types"

/**
 * This class is responsible for providing reel sets for slot games based on a static configuration or file.
 */
export class StaticReelSet extends ReelSet {
  reels: Reels
  csvPath: string
  private _strReels: string[][]

  constructor(opts: StaticReelSetOptions) {
    super(opts)

    this.reels = []
    this._strReels = opts.reels || []
    this.csvPath = opts.csvPath || ""

    assert(
      opts.reels || opts.csvPath,
      `Either 'reels' or 'csvPath' must be provided for StaticReelSet ${this.id}`,
    )
  }

  private validateConfig(config: GameConfig) {
    this.reels.forEach((reel) => {
      reel.forEach((symbol) => {
        if (!config.symbols.has(symbol.id)) {
          throw new Error(
            `Symbol "${symbol}" of the reel set ${this.id} for mode ${this.associatedGameModeName} is not defined in the game config`,
          )
        }
      })
    })

    if (this.csvPath && this._strReels.length > 0) {
      throw new Error(
        `Both 'csvPath' and 'reels' are provided for StaticReelSet ${this.id}. Please provide only one.`,
      )
    }
  }

  generateReels({ gameConfig: config }: Simulation) {
    this.validateConfig(config)

    if (this._strReels.length > 0) {
      this.reels = this._strReels.map((reel) => {
        return reel.map((symbolId) => {
          const symbol = config.symbols.get(symbolId)
          if (!symbol) {
            throw new Error(
              `Symbol "${symbolId}" of the reel set ${this.id} for mode ${this.associatedGameModeName} is not defined in the game config`,
            )
          }
          return symbol
        })
      })
    }

    if (this.csvPath) {
      this.reels = this.parseReelsetCSV(this.csvPath, config)
    }
  }
}

interface StaticReelSetOptions extends ReelSetOptions {
  reels?: string[][]
  csvPath?: string
}

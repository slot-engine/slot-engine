import fs from "fs"
import path from "path"
import { GameConfig } from "../game-config"
import { RandomNumberGenerator } from "../rng"
import { Reels } from "../types"

export class ReelSet {
  id: string
  associatedGameModeName: string
  reels: Reels
  protected rng: RandomNumberGenerator

  constructor(opts: ReelSetOptions) {
    this.id = opts.id
    this.associatedGameModeName = ""
    this.reels = []
    this.rng = new RandomNumberGenerator()
    this.rng.setSeed(opts.seed ?? 0)
  }

  generateReels(config: GameConfig): ReelSet {
    throw new Error("Not implemented")
  }

  /**
   * Reads a reelset CSV file and returns the reels as arrays of GameSymbols.
   */
  parseReelsetCSV(reelSetPath: string, config: GameConfig) {
    if (!fs.existsSync(reelSetPath)) {
      throw new Error(`Reelset CSV file not found at path: ${reelSetPath}`)
    }

    const allowedExtensions = [".csv"]
    const ext = path.extname(reelSetPath).toLowerCase()
    if (!allowedExtensions.includes(ext)) {
      throw new Error(
        `Invalid file extension for reelset CSV: ${ext}. Allowed extensions are: ${allowedExtensions.join(
          ", ",
        )}`,
      )
    }

    const csvData = fs.readFileSync(reelSetPath, "utf8")
    const rows = csvData.split("\n").filter((line) => line.trim() !== "")

    const reels: Reels = Array.from(
      { length: config.gameModes[this.associatedGameModeName]!.reelsAmount },
      () => [],
    )

    rows.forEach((row) => {
      const symsInRow = row.split(",").map((symbolId) => {
        if (!symbolId.trim()) return null
        const symbol = config.symbols.get(symbolId.trim())
        if (!symbol) {
          throw new Error(`Symbol with id "${symbolId}" not found in game config.`)
        }
        return symbol
      })
      symsInRow.forEach((symbol, ridx) => {
        if (ridx >= reels.length) {
          throw new Error(
            `Row in reelset CSV has more symbols than expected reels amount (${reels.length})`,
          )
        }
        if (symbol) reels[ridx]!.push(symbol)
      })
    })

    return reels
  }
}

export interface ReelSetOptions {
  /**
   * The unique identifier of the reel generator.\
   * Must be unique per game mode.
   */
  id: string
  /**
   * Optional seed for the RNG to ensure reproducible results.
   *
   * Default seed is `0`.
   *
   * Note: Seeds 0 and 1 produce the same results.
   */
  seed?: number
}

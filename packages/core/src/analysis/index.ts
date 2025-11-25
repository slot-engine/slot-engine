import fs from "fs"
import path from "path"
import { GameConfig } from "../game-config"
import { Optimizer, OptimzierGameModeConfig } from "../optimizer"
import assert from "assert"
import {
  getAvgWin,
  getLessBetHitrate,
  getMaxWin,
  getMaxwinHitrate,
  getMinWin,
  getNonZeroHitrate,
  getNullHitrate,
  getPayoutWeights,
  getRtp,
  getStandardDeviation,
  getTotalLutWeight,
  getUniquePayouts,
  getVariance,
  parseLookupTable,
} from "./utils"
import { writeJsonFile } from "../../utils"
import { isMainThread } from "worker_threads"

export class Analysis {
  protected readonly gameConfig: GameConfig
  protected readonly optimizerConfig: OptimzierGameModeConfig
  protected filePaths: Record<string, FilePaths>

  constructor(optimizer: Optimizer) {
    this.gameConfig = optimizer.getGameConfig()
    this.optimizerConfig = optimizer.getOptimizerGameModes()
    this.filePaths = {}
  }

  async runAnalysis(gameModes: string[]) {
    if (!isMainThread) return // IMPORTANT: Prevent workers from kicking off (multiple) analysis runs

    this.filePaths = this.getPathsForModes(gameModes)
    this.getNumberStats(gameModes)
    this.getWinRanges(gameModes)
    // TODO: this.getSymbolStats(gameModes)
    console.log("Analysis complete. Files written to build directory.")
  }

  private getPathsForModes(gameModes: string[]) {
    const rootPath = process.cwd()
    const paths: Record<string, FilePaths> = {}

    for (const modeStr of gameModes) {
      const lut = path.join(
        rootPath,
        this.gameConfig.outputDir,
        `lookUpTable_${modeStr}.csv`,
      )
      const lutSegmented = path.join(
        rootPath,
        this.gameConfig.outputDir,
        `lookUpTableSegmented_${modeStr}.csv`,
      )
      const lutOptimized = path.join(
        rootPath,
        this.gameConfig.outputDir,
        "publish_files",
        `lookUpTable_${modeStr}_0.csv`,
      )
      const booksJsonl = path.join(
        rootPath,
        this.gameConfig.outputDir,
        `books_${modeStr}.jsonl`,
      )
      const booksJsonlCompressed = path.join(
        rootPath,
        this.gameConfig.outputDir,
        "publish_files",
        `books_${modeStr}.jsonl.zst`,
      )

      paths[modeStr] = {
        lut,
        lutSegmented,
        lutOptimized,
        booksJsonl,
        booksJsonlCompressed,
      }

      for (const p of Object.values(paths[modeStr])) {
        assert(
          fs.existsSync(p),
          `File "${p}" does not exist. Run optimization to auto-create it.`,
        )
      }
    }

    return paths
  }

  private getNumberStats(gameModes: string[]) {
    const stats: Statistics[] = []

    for (const modeStr of gameModes) {
      const mode = this.getGameModeConfig(modeStr)

      const lutOptimized = parseLookupTable(
        fs.readFileSync(this.filePaths[modeStr]!.lutOptimized, "utf-8"),
      )
      const totalWeight = getTotalLutWeight(lutOptimized)
      const payoutWeights = getPayoutWeights(lutOptimized)

      stats.push({
        gameMode: mode.name,
        totalWeight,
        avgWin: getAvgWin(payoutWeights),
        rtp: getRtp(payoutWeights, mode.cost),
        minWin: getMinWin(payoutWeights),
        maxWin: getMaxWin(payoutWeights),
        stdDev: getStandardDeviation(payoutWeights),
        variance: getVariance(payoutWeights),
        nonZeroHitRate: getNonZeroHitrate(payoutWeights),
        nullHitRate: getNullHitrate(payoutWeights),
        maxwinHitRate: getMaxwinHitrate(payoutWeights),
        lessBetHitRate: getLessBetHitrate(payoutWeights, mode.cost),
        uniquePayouts: getUniquePayouts(payoutWeights),
      })
    }

    writeJsonFile(
      path.join(process.cwd(), this.gameConfig.outputDir, "stats_summary.json"),
      stats,
    )
  }

  private getWinRanges(gameModes: string[]) {
    const winRanges: [number, number][] = [
      [0, 0.1],
      [0, 0.99],
      [1, 1.99],
      [2, 2.99],
      [3, 4.99],
      [5, 9.99],
      [10, 19.99],
      [20, 49.99],
      [50, 99.99],
      [100, 199.99],
      [200, 499.99],
      [500, 999.99],
      [1000, 1999.99],
      [2000, 2999.99],
      [3000, 4999.99],
      [5000, 7499.99],
      [7500, 9999.99],
      [10000, 14999.99],
      [15000, 19999.99],
      [20000, 24999.99],
    ]

    const payoutRanges: Record<string, Record<string, number>> = {}

    for (const modeStr of gameModes) {
      payoutRanges[modeStr] = {}

      const lutOptimized = parseLookupTable(
        fs.readFileSync(this.filePaths[modeStr]!.lutOptimized, "utf-8"),
      )

      lutOptimized.forEach(([, , p]) => {
        const payout = p / 100
        for (const [min, max] of winRanges) {
          if (payout >= min && payout <= max) {
            const rangeKey = `${min}-${max}`
            if (!payoutRanges[modeStr]![rangeKey]) {
              payoutRanges[modeStr]![rangeKey] = 0
            }
            payoutRanges[modeStr]![rangeKey] += 1
            break
          }
        }
      })

      const orderedRanges: Record<string, number> = {}
      Object.keys(payoutRanges[modeStr]!)
        .sort((a, b) => {
          const [aMin] = a.split("-").map(Number)
          const [bMin] = b.split("-").map(Number)
          return aMin! - bMin!
        })
        .forEach((key) => {
          orderedRanges[key] = payoutRanges[modeStr]![key]!
        })

      payoutRanges[modeStr] = orderedRanges
    }

    writeJsonFile(
      path.join(process.cwd(), this.gameConfig.outputDir, "stats_payouts.json"),
      payoutRanges,
    )
  }

  private getGameModeConfig(mode: string) {
    const config = this.gameConfig.gameModes[mode]
    assert(config, `Game mode "${mode}" not found in game config`)
    return config
  }
}

export interface AnalysisOpts {
  gameModes: string[]
}

interface FilePaths {
  lut: string
  lutSegmented: string
  lutOptimized: string
  booksJsonl: string
  booksJsonlCompressed: string
}

interface Statistics {
  gameMode: string
  totalWeight: number
  rtp: number
  avgWin: number
  minWin: number
  maxWin: number
  stdDev: number
  variance: number
  maxwinHitRate: number
  nonZeroHitRate: number
  nullHitRate: number
  lessBetHitRate: number
  uniquePayouts: number
}

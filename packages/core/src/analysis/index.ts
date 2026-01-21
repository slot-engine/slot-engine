import fs from "fs"
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
  parseLookupTableSegmented,
} from "./utils"
import { writeJsonFile } from "../../utils"
import { isMainThread } from "worker_threads"
import { SlotGame } from "../slot-game"

export class Analysis {
  protected readonly game: SlotGame

  constructor(game: SlotGame<any, any, any>) {
    this.game = game
  }

  async runAnalysis(gameModes: string[]) {
    if (!isMainThread) return // IMPORTANT: Prevent workers from kicking off (multiple) analysis runs
    this.getNumberStats(gameModes)
    this.getWinRanges(gameModes)
    // TODO: this.getSymbolStats(gameModes)
    console.log("Analysis complete. Files written to build directory.")
  }

  private getNumberStats(gameModes: string[]) {
    const meta = this.game.getMetadata()
    const stats: Statistics[] = []

    for (const modeStr of gameModes) {
      const mode = this.getGameModeConfig(modeStr)

      const lutOptimized = parseLookupTable(
        fs.readFileSync(meta.paths.lookupTablePublish(modeStr), "utf-8"),
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

    writeJsonFile(meta.paths.statsSummary, stats)
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
      [25000, 49999.99],
      [50000, 74999.99],
      [75000, 99999.99],
      [100000, Infinity],
    ]

    const payoutRanges: PayoutStatistics[] = []

    const meta = this.game.getMetadata()

    for (const modeStr of gameModes) {
      const lutSegmented = parseLookupTableSegmented(
        fs.readFileSync(meta.paths.lookupTableSegmented(modeStr), "utf-8"),
      )

      const range: PayoutStatistics = {
        gameMode: modeStr,
        allPayouts: {
          overall: {},
          criteria: {},
        },
        uniquePayouts: {
          overall: {},
          criteria: {},
        },
      }

      const uniquePayoutsOverall = new Map<string, Set<number>>()
      const uniquePayoutsCriteria = new Map<string, Map<string, Set<number>>>()

      lutSegmented.forEach(([, criteria, bp, fsp]) => {
        const basePayout = bp
        const freeSpinPayout = fsp
        const payout = basePayout + freeSpinPayout

        for (const [min, max] of winRanges) {
          if (payout >= min && payout <= max) {
            const rangeKey = `${min}-${max}`

            // Overall
            if (!range.allPayouts.overall[rangeKey]) {
              range.allPayouts.overall[rangeKey] = 0
            }
            range.allPayouts.overall[rangeKey] += 1

            // Criteria
            if (!range.allPayouts.criteria[criteria]) {
              range.allPayouts.criteria[criteria] = {}
            }
            if (!range.allPayouts.criteria[criteria]![rangeKey]) {
              range.allPayouts.criteria[criteria]![rangeKey] = 0
            }
            range.allPayouts.criteria[criteria]![rangeKey] += 1

            // Overall
            if (!uniquePayoutsOverall.has(rangeKey)) {
              uniquePayoutsOverall.set(rangeKey, new Set())
            }
            uniquePayoutsOverall.get(rangeKey)!.add(payout)

            // Criteria
            if (!uniquePayoutsCriteria.has(criteria)) {
              uniquePayoutsCriteria.set(criteria, new Map())
            }
            if (!uniquePayoutsCriteria.get(criteria)!.has(rangeKey)) {
              uniquePayoutsCriteria.get(criteria)!.set(rangeKey, new Set())
            }
            uniquePayoutsCriteria.get(criteria)!.get(rangeKey)!.add(payout)

            break
          }
        }
      })

      uniquePayoutsOverall.forEach((payoutSet, rangeKey) => {
        range.uniquePayouts.overall[rangeKey] = payoutSet.size
      })

      uniquePayoutsCriteria.forEach((rangeMap, criteria) => {
        if (!range.uniquePayouts.criteria[criteria]) {
          range.uniquePayouts.criteria[criteria] = {}
        }
        rangeMap.forEach((payoutSet, rangeKey) => {
          range.uniquePayouts.criteria[criteria]![rangeKey] =
            payoutSet.size
        })
      })

      const orderedAllOverall: Record<string, number> = {}
      Object.keys(range.allPayouts.overall)
        .sort((a, b) => {
          const [aMin] = a.split("-").map(Number)
          const [bMin] = b.split("-").map(Number)
          return aMin! - bMin!
        })
        .forEach((key) => {
          orderedAllOverall[key] = range.allPayouts.overall[key]!
        })

      const orderedAllCriteria: Record<string, Record<string, number>> = {}
      Object.keys(range.allPayouts.criteria).forEach((crit) => {
        const critMap = range.allPayouts.criteria[crit]!
        const orderedCritMap: Record<string, number> = {}
        Object.keys(critMap)
          .sort((a, b) => {
            const [aMin] = a.split("-").map(Number)
            const [bMin] = b.split("-").map(Number)
            return aMin! - bMin!
          })
          .forEach((key) => {
            orderedCritMap[key] = critMap[key]!
          })
        orderedAllCriteria[crit] = orderedCritMap
      })

      const orderedUniqueOverall: Record<string, number> = {}
      Object.keys(range.uniquePayouts.overall)
        .sort((a, b) => {
          const [aMin] = a.split("-").map(Number)
          const [bMin] = b.split("-").map(Number)
          return aMin! - bMin!
        })
        .forEach((key) => {
          orderedUniqueOverall[key] = range.uniquePayouts.overall[key]!
        })

      const orderedUniqueCriteria: Record<string, Record<string, number>> = {}
      Object.keys(range.uniquePayouts.criteria).forEach((crit) => {
        const critMap = range.uniquePayouts.criteria[crit]!
        const orderedCritMap: Record<string, number> = {}
        Object.keys(critMap)
          .sort((a, b) => {
            const [aMin] = a.split("-").map(Number)
            const [bMin] = b.split("-").map(Number)
            return aMin! - bMin!
          })
          .forEach((key) => {
            orderedCritMap[key] = critMap[key]!
          })
        orderedUniqueCriteria[crit] = orderedCritMap
      })

      payoutRanges.push({
        gameMode: modeStr,
        allPayouts: {
          overall: orderedAllOverall,
          criteria: orderedAllCriteria,
        },
        uniquePayouts: {
          overall: orderedUniqueOverall,
          criteria: orderedUniqueCriteria,
        },
      })
    }

    writeJsonFile(meta.paths.statsPayouts, payoutRanges)
  }

  private getGameModeConfig(mode: string) {
    const config = this.game.getConfig().gameModes[mode]
    assert(config, `Game mode "${mode}" not found in game config`)
    return config
  }
}

export interface PayoutStatistics {
  gameMode: string
  allPayouts: {
    overall: Record<string, number>
    criteria: Record<string, Record<string, number>>
  }
  uniquePayouts: {
    overall: Record<string, number>
    criteria: Record<string, Record<string, number>>
  }
}

export interface AnalysisOpts {
  gameModes: string[]
}

export interface Statistics {
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

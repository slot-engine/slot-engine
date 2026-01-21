import {
  LookupTable,
  LookupTableSegmented,
  parseLookupTable,
  parseLookupTableSegmented,
  RandomNumberGenerator,
  SlotGame,
} from "@slot-engine/core"
import { BetSimulationConfig, BetSimulationStats } from "../types"
import { readLutRows, round } from "./utils"
import chalk from "chalk"

function percentile(sortedArr: number[], p: number): number {
  if (sortedArr.length === 0) return 0
  const idx = Math.floor(sortedArr.length * p)
  return sortedArr[Math.min(idx, sortedArr.length - 1)]!
}

const createDefaultResults = (): BetSimulationStats => ({
  totalBets: 0,
  avgBets: 0,
  low20PercentileBets: 0,
  high20PercentileBets: 0,
  medianBets: 0,
  totalWager: 0,
  numBetsProfit: 0,
  numBetsLoss: 0,
  totalProfit: 0,
  avgProfit: 0,
  minProfit: 0,
  maxProfit: 0,
  low20PercentileProfit: 0,
  high20PercentileProfit: 0,
  medianProfit: 0,
  payoutStdDev: 0,
  longestWinStreak: 0,
  longestLoseStreak: 0,
  longest0Streak: 0,
  highestBalance: 0,
  lowestBalance: 0,
  avgRtp: 0,
  medianRtp: 0,
  low20PercentileRtp: 0,
  high20PercentileRtp: 0,
  highestRtp: 0,
  lowestRtp: 0,
  hits15: 0,
  hits40: 0,
  hits90: 0,
  visualization: {
    criteriaPerGroup: {},
  },
  warnings: [],
})

export async function betSimulation(game: SlotGame, config: BetSimulationConfig) {
  const rng = new RandomNumberGenerator()
  const seed = Math.floor(Math.random() * 10_000)
  rng.setSeed(seed)

  const luts = new Map<string, { lut: LookupTable; lutSegmented: LookupTableSegmented }>()
  const selectors = new Map<string, LutSelector>()
  const players = Array.from({ length: config.players.count }).map(
    (_, i) => new VirtualPlayer(i, config.players.startingBalance),
  )

  const criteriaPerGroup: Record<string, Record<string, number>> = {}

  let booksWithLowWeight = 0

  for (const group of config.betGroups) {
    players.forEach((p) => p.resetForGroup())

    if (!criteriaPerGroup[group.id]) {
      criteriaPerGroup[group.id] = {}
    }

    const meta = game.getMetadata()
    const mode = game.getConfig().gameModes[group.mode]

    if (!mode) {
      throw new Error(`Mode "${group.mode}" from bet group not found in game config`)
    }

    if (!luts.has(group.mode)) {
      const { rows: lutRows } = await readLutRows({
        path: meta.paths.lookupTablePublish(group.mode),
        indexPath: meta.paths.lookupTableIndex(group.mode),
        offset: 0,
        take: Infinity,
      })
      const lut = parseLookupTable(lutRows.join("\n"))

      const { rows: segmentedRows } = await readLutRows({
        path: meta.paths.lookupTableSegmented(group.mode),
        indexPath: meta.paths.lookupTableSegmentedIndex(group.mode),
        offset: 0,
        take: Infinity,
      })
      const lutSegmented = parseLookupTableSegmented(segmentedRows.join("\n"))

      luts.set(group.mode, { lut, lutSegmented })
      selectors.set(group.mode, new LutSelector(lut))
    }

    const cachedLuts = luts.get(group.mode)!
    const selector = selectors.get(group.mode)!
    const totalCost = round(group.betAmount * mode.cost, 2)

    for (const player of players) {
      for (let spin = 0; spin < group.spins; spin++) {
        if (!player.canAfford(totalCost)) break

        const resultIndex = selector.select(rng.randomFloat(0, 1))
        const lutEntry = cachedLuts.lut[resultIndex]
        const lutSegEntry = cachedLuts.lutSegmented[resultIndex]

        if (!lutEntry || !lutSegEntry) {
          console.log(
            chalk.yellow(
              `Couldn't find LUT Segmented ID ${resultIndex}. Skipping virtual player bet`,
            ),
          )
          continue
        }

        const [_, weight, pay] = lutEntry
        const [___, criteria] = lutSegEntry
        const payoutMultiplier = pay / 100
        const payout = round(payoutMultiplier * group.betAmount, 4)
        const returnMultiplier = totalCost > 0 ? round(payout / totalCost, 4) : 0

        if (weight <= 1) {
          booksWithLowWeight++
        }

        if (criteriaPerGroup[group.id]![criteria]) {
          criteriaPerGroup[group.id]![criteria] =
            criteriaPerGroup[group.id]![criteria]! + 1
        } else {
          criteriaPerGroup[group.id]![criteria] = 1
        }

        player.recordBet({
          criteria,
          wager: totalCost,
          payout,
          returnMultiplier,
        })
      }
    }
  }

  return getBetStats({ players, criteriaPerGroup, booksWithLowWeight })
}

function getBetStats(opts: {
  players: VirtualPlayer[]
  criteriaPerGroup: Record<string, Record<string, number>>
  booksWithLowWeight: number
}): BetSimulationStats {
  const { players, criteriaPerGroup, booksWithLowWeight } = opts
  if (players.length === 0) return createDefaultResults()

  const profits = players.map((p) => p.profit).sort((a, b) => a - b)
  const betCounts = players.map((p) => p.betsPlaced).sort((a, b) => a - b)
  const totalBets = betCounts.reduce((acc, curr) => acc + curr, 0)
  const balances = players.map((p) => p.balance).sort((a, b) => a - b)
  const playerRtps = players
    .map((p) => (p.wager > 0 ? round((p.wager + p.profit) / p.wager, 4) : 0))
    .filter((rtp) => Number.isFinite(rtp))
    .sort((a, b) => a - b)

  let longestWinStreak = 0
  players.forEach((p) => {
    if (p.longestWinStreak > longestWinStreak) {
      longestWinStreak = p.longestWinStreak
    }
  })

  let longestLoseStreak = 0
  players.forEach((p) => {
    if (p.longestLoseStreak > longestLoseStreak) {
      longestLoseStreak = p.longestLoseStreak
    }
  })

  let longest0Streak = 0
  players.forEach((p) => {
    if (p.longest0Streak > longest0Streak) {
      longest0Streak = p.longest0Streak
    }
  })

  const totalProfit = profits.reduce((sum, p) => sum + p, 0)
  const rtpSum = playerRtps.reduce((sum, rtp) => sum + rtp, 0)

  const allReturns: number[] = []
  for (const p of players) {
    for (const h of p.history) {
      allReturns.push(h.returnMultiplier)
    }
  }

  const payoutStdDev = (() => {
    const mean = allReturns.reduce((sum, r) => sum + r, 0) / allReturns.length
    const variance =
      allReturns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / allReturns.length
    return round(Math.sqrt(variance), 4)
  })()

  const warnings: string[] = []

  if (opts.booksWithLowWeight >= totalBets * 0.5) {
    warnings.push(
      `${opts.booksWithLowWeight} bet results come from books with very low weight (<= 1). Is this intended?`,
    )
  }

  return {
    totalBets,
    avgBets: betCounts.length > 0 ? round(totalBets / betCounts.length, 2) : 0,
    low20PercentileBets: percentile(betCounts, 0.2),
    high20PercentileBets: percentile(betCounts, 0.8),
    medianBets: percentile(betCounts, 0.5),
    totalWager: round(
      players.reduce((sum, r) => sum + r.wager, 0),
      2,
    ),
    numBetsProfit: players.reduce((acc, curr) => acc + curr.betsWon, 0),
    numBetsLoss: players.reduce((acc, curr) => acc + curr.betsLost, 0),
    totalProfit: round(totalProfit, 2),
    avgProfit: profits.length > 0 ? round(totalProfit / profits.length, 2) : 0,
    minProfit: profits[0]!,
    maxProfit: profits[profits.length - 1]!,
    low20PercentileProfit: percentile(profits, 0.2),
    high20PercentileProfit: percentile(profits, 0.8),
    medianProfit: percentile(profits, 0.5),
    payoutStdDev,
    longestWinStreak,
    longestLoseStreak,
    longest0Streak,
    highestBalance: balances.at(-1)!,
    lowestBalance: balances[0]!,
    avgRtp: playerRtps.length > 0 ? round(rtpSum / playerRtps.length, 4) : 0,
    medianRtp: percentile(playerRtps, 0.5),
    low20PercentileRtp: percentile(playerRtps, 0.2),
    high20PercentileRtp: percentile(playerRtps, 0.8),
    highestRtp: playerRtps.at(-1)!,
    lowestRtp: playerRtps[0]!,
    hits15: players.reduce((acc, curr) => acc + curr.hits15, 0),
    hits40: players.reduce((acc, curr) => acc + curr.hits40, 0),
    hits90: players.reduce((acc, curr) => acc + curr.hits90, 0),
    visualization: {
      criteriaPerGroup,
    },
    warnings,
  }
}

class VirtualPlayer {
  readonly id: number
  private readonly startingBalance: number

  balance: number

  betsPlaced = 0
  betsWon = 0
  betsLost = 0
  profit = 0
  wager = 0

  private currentWinStreak = 0
  private currentLoseStreak = 0
  private current0Streak = 0
  longestWinStreak = 0
  longestLoseStreak = 0
  longest0Streak = 0

  hits15 = 0 // 15x - 40x
  hits40 = 0 // 40x - 90x
  hits90 = 0 // 90x+

  criteriaHit: Record<string, number> = {}

  history: Array<{
    wager: number
    payout: number
    balance: number
    returnMultiplier: number
  }> = []

  constructor(id: number, startingBalance: number) {
    this.id = id
    this.startingBalance = startingBalance
    this.balance = startingBalance
  }

  canAfford(amount: number) {
    return this.balance >= amount
  }

  recordBet(opts: {
    criteria: string
    wager: number
    payout: number
    returnMultiplier: number
  }) {
    const { criteria, wager, payout, returnMultiplier } = opts

    if (this.criteriaHit[criteria]) {
      this.criteriaHit[criteria] = this.criteriaHit[criteria] + 1
    } else {
      this.criteriaHit[criteria] = 1
    }

    this.betsPlaced++
    this.balance = round(this.balance - wager + payout, 2)
    this.wager = round(this.wager + wager, 2)
    this.profit = round(this.profit + payout - wager, 2)

    const isWin = payout >= wager
    if (isWin) {
      this.betsWon++
      this.currentWinStreak++
      this.currentLoseStreak = 0
      this.current0Streak = 0
      this.longestWinStreak = Math.max(this.longestWinStreak, this.currentWinStreak)
    } else {
      this.betsLost++
      this.currentLoseStreak++
      this.currentWinStreak = 0
      this.longestLoseStreak = Math.max(this.longestLoseStreak, this.currentLoseStreak)

      if (payout === 0) {
        this.current0Streak++
        this.longest0Streak = Math.max(this.longest0Streak, this.current0Streak)
      }
    }

    if (returnMultiplier >= 90) {
      this.hits90++
    } else if (returnMultiplier >= 40) {
      this.hits40++
    } else if (returnMultiplier >= 15) {
      this.hits15++
    }

    this.history.push({
      wager,
      payout,
      balance: this.balance,
      returnMultiplier,
    })
  }

  resetForGroup() {
    this.currentWinStreak = 0
    this.currentLoseStreak = 0
    this.current0Streak = 0
  }
}

class LutSelector {
  private cumulativeWeights: Float64Array
  private totalWeight: number

  constructor(lut: LookupTable) {
    this.cumulativeWeights = new Float64Array(lut.length)
    let sum = 0
    for (let i = 0; i < lut.length; i++) {
      sum += lut[i]![1]
      this.cumulativeWeights[i] = sum
    }
    this.totalWeight = sum
  }

  select(r: number): number {
    const target = r * this.totalWeight
    let low = 0
    let high = this.cumulativeWeights.length - 1

    while (low < high) {
      const mid = (low + high) >>> 1
      if (this.cumulativeWeights[mid]! < target) {
        low = mid + 1
      } else {
        high = mid
      }
    }
    return low
  }
}

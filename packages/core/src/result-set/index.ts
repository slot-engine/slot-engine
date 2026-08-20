import assert from "assert"
import { AnyGameModes, AnySymbols, AnyUserData } from "../types"
import { GameContext } from "../game-context"
import { Simulation } from "../simulation"
import { SPIN_TYPE } from "../constants"

export class ResultSet<TUserState extends AnyUserData> {
  criteria: string
  quota: number
  multiplier?: number | [number, number]
  reelWeights: ReelWeights<TUserState>
  userData?: Record<string, any>
  forceMaxWin?: boolean
  forceFreespins?: boolean
  evaluate?: (ctx: GameContext<AnyGameModes, AnySymbols, TUserState>) => boolean

  constructor(opts: ResultSetOpts<TUserState>) {
    this.criteria = opts.criteria
    this.quota = opts.quota
    this.multiplier = opts.multiplier
    this.reelWeights = opts.reelWeights
    this.userData = opts.userData
    this.forceMaxWin = opts.forceMaxWin
    this.forceFreespins = opts.forceFreespins
    this.evaluate = opts.evaluate

    if (Array.isArray(this.multiplier)) {
      assert(
        this.multiplier.length === 2 && this.multiplier[0] <= this.multiplier[1],
        `ResultSet "${this.criteria}": multiplier range must be [min, max] with min <= max.`,
      )
    }
  }

  static getNumberOfSimsForCriteria(ctx: Simulation, gameModeName: string) {
    assert(ctx.simRunsAmount, "Simulation configuration is not set.")

    const simNums = ctx.simRunsAmount[gameModeName]
    const resultSets = ctx.gameConfig.gameModes[gameModeName]?.resultSets

    if (!resultSets || resultSets.length === 0) {
      throw new Error(`No ResultSets found for game mode: ${gameModeName}.`)
    }

    if (simNums === undefined || simNums <= 0) {
      throw new Error(`No simulations configured for game mode "${gameModeName}".`)
    }

    if (resultSets.length > simNums) {
      throw new Error(
        `Game mode "${gameModeName}" has ${resultSets.length} ResultSets but only ${simNums} simulations. ` +
          `Need at least one simulation per ResultSet — increase simRunsAmount or reduce ResultSets.`,
      )
    }

    const totalQuota = resultSets.reduce((sum, rs) => sum + rs.quota, 0)
    assert(
      totalQuota > 0,
      `Game mode "${gameModeName}": ResultSet quotas must sum to a positive number.`,
    )

    // Hamilton / largest-remainder allocation (avoids the old floor-to-1 + while
    // loop that hung when ResultSets outnumbered sims).
    const exact = resultSets.map((rs) => ({
      criteria: rs.criteria,
      value: (rs.quota / totalQuota) * simNums,
    }))

    const numberOfSimsForCriteria: Record<string, number> = {}
    let assigned = 0
    for (const row of exact) {
      const n = Math.floor(row.value)
      numberOfSimsForCriteria[row.criteria] = n
      assigned += n
    }

    let remaining = simNums - assigned
    const byFrac = [...exact].sort(
      (a, b) => b.value - Math.floor(b.value) - (a.value - Math.floor(a.value)),
    )
    for (let i = 0; remaining > 0; i++, remaining--) {
      numberOfSimsForCriteria[byFrac[i % byFrac.length]!.criteria]! += 1
    }

    // Prefer at least one book per ResultSet when sims allow it (steal from the fattest).
    for (const rs of resultSets) {
      if (numberOfSimsForCriteria[rs.criteria]! > 0) continue
      const donor = Object.entries(numberOfSimsForCriteria)
        .sort(([, a], [, b]) => b - a)
        .find(([, n]) => n > 1)
      assert(
        donor,
        `Unable to allocate at least one simulation to ResultSet "${rs.criteria}".`,
      )
      numberOfSimsForCriteria[donor[0]]! -= 1
      numberOfSimsForCriteria[rs.criteria] = 1
    }

    const total = Object.values(numberOfSimsForCriteria).reduce((a, b) => a + b, 0)
    assert(
      total === simNums,
      `Criteria allocation mismatch for mode "${gameModeName}": expected ${simNums}, got ${total}.`,
    )

    return numberOfSimsForCriteria
  }

  /**
   * Checks if core criteria is met, e.g. target multiplier or max win.
   *
   * Multiplier checks use Stake book precision (0.01x / cent units). Raw float
   * equality against unrounded wallet totals never matches reliably and causes
   * the simulation retry loop to spin until the 50k safety exit.
   */
  meetsCriteria(ctx: GameContext) {
    // @ts-ignore TODO: Fix type errors with AnyTypes
    const customEval = this.evaluate?.(ctx)

    const freespinsMet = this.forceFreespins ? ctx.state.triggeredFreespins : true

    const wallet = ctx.services.wallet._getWallet()
    const currentWin = wallet.getCurrentWin()
    const winCents = toPayoutCents(currentWin)
    const maxWinCents = toPayoutCents(ctx.config.maxWinX)

    let multiplierMet: boolean
    if (this.forceMaxWin) {
      multiplierMet = true
    } else if (this.multiplier === undefined) {
      multiplierMet = winCents > 0
    } else if (Array.isArray(this.multiplier)) {
      multiplierMet =
        winCents >= toPayoutCents(this.multiplier[0]) &&
        winCents <= toPayoutCents(this.multiplier[1])
    } else {
      multiplierMet = winCents === toPayoutCents(this.multiplier)
    }

    const respectsMaxWin = this.forceMaxWin
      ? winCents >= maxWinCents
      : winCents < maxWinCents

    const coreCriteriaMet = freespinsMet && multiplierMet && respectsMaxWin

    const finalResult =
      customEval !== undefined ? coreCriteriaMet && customEval === true : coreCriteriaMet

    if (this.forceMaxWin && respectsMaxWin) {
      ctx.services.data.tag({
        maxwin: true,
      })
    }

    return finalResult
  }
}

/**
 * Stake book / LUT payouts are stored as integer cent-units of the bet multiplier
 * (`payoutMultiplier * 100`). Criteria must compare at that precision — not raw
 * IEEE floats from wallet accumulation.
 */
export function toPayoutCents(multiplier: number): number {
  return Math.round(multiplier * 100)
}

interface ResultSetOpts<TUserState extends AnyUserData> {
  /**
   * A short string to describe the criteria for this ResultSet.
   */
  criteria: string
  /**
   * The quota of spins, out of the total simulations, that must be forced to meet the specified criteria.\
   * **Float from 0 to 1. Total quota of all ResultSets in a GameMode must be 1.**
   */
  quota: number
  /**
   * The required multiplier for a simulated spin to be accepted.
   *
   * Can be an exact value, or an inclusive `[min, max]` range.
   * Compared at 0.01x precision (cent units), matching book/LUT storage.
   *
   * Exact values can require many retries for hard-to-hit payouts.\
   * Using a range can drastically speed up the simulation.
   */
  multiplier?: number | [number, number]
  /**
   * Configure the weights of the reels in this ResultSet.
   *
   * If you need to support dynamic / special reel weights based on the simulation context,\
   * you can provide an `evaluate` function that returns the desired weights.
   *
   * If the `evaluate` function returns a falsy value, the usual spin type based weights will be used.
   *
   * @example
   * ```ts
   * new ResultSet({
   *   criteria: "superFreespins",
   *   quota: 0.05,
   *   forceFreespins: true,
   *   reelWeights: {
   *     [SPIN_TYPE.BASE_GAME]: { base1: 1 },
   *     [SPIN_TYPE.FREE_SPINS]: { bonus1: 1, bonus2: 2 },
   *     evaluate: (ctx) => {
   *       if (ctx.state.userData.triggeredSuperFreespins) {
   *         return { superbonus: 1 }
   *       }
   *     }
   *   },
   *   userData: { forceSuperFreespins: true },
   * }),
   * ```
   */
  reelWeights: ReelWeights<TUserState>
  /**
   * Optional data to use when evaluating the criteria.\
   * This can be used to pass additional context or parameters needed for the evaluation.
   */
  userData?: Record<string, any>
  /**
   * If set, this will force the game to always trigger a max win.
   */
  forceMaxWin?: boolean
  /**
   * If set, this will force the game to always trigger free spins.
   */
  forceFreespins?: boolean
  /**
   * Custom function to evaluate if the criteria is met.
   *
   * E.g. use this to check for free spins that upgraded to super free spins\
   * or other arbitrary simulation criteria.
   */
  evaluate?: (ctx: GameContext<AnyGameModes, AnySymbols, TUserState>) => boolean
}

interface ReelWeights<TUserState extends AnyUserData> {
  [SPIN_TYPE.BASE_GAME]: Record<string, number>
  [SPIN_TYPE.FREE_SPINS]: Record<string, number>
  evaluate?: (
    ctx: GameContext<AnyGameModes, AnySymbols, TUserState>,
  ) => Record<string, number> | undefined | null | false
}

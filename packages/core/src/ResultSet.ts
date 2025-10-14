import { AnyUserData } from "../index"
import { copy, RandomNumberGenerator, shuffle, weightedRandom } from "../utils"
import { Board } from "./Board"
import { GameConfig } from "./GameConfig"
import { AnySimulationContext, Simulation } from "./Simulation"

export class ResultSet<TUserState extends AnyUserData> {
  criteria: string
  quota: number
  multiplier?: number
  reelWeights: ReelWeights<TUserState>
  userData?: Record<string, any>
  forceMaxWin?: boolean
  forceFreespins?: boolean
  evaluate?: (ctx: AnySimulationContext<any, any, TUserState>) => boolean

  constructor(opts: ResultSetOpts<TUserState>) {
    this.criteria = opts.criteria
    this.quota = opts.quota
    this.multiplier = opts.multiplier
    this.reelWeights = opts.reelWeights
    this.userData = opts.userData
    this.forceMaxWin = opts.forceMaxWin
    this.forceFreespins = opts.forceFreespins
    this.evaluate = opts.evaluate

    if (this.quota < 0 || this.quota > 1) {
      throw new Error(`Quota must be a float between 0 and 1, got ${this.quota}.`)
    }
  }

  static assignCriteriaToSimulations(ctx: Simulation, gameModeName: string) {
    const rng = new RandomNumberGenerator()
    rng.setSeed(0)

    if (!ctx.simRunsAmount) {
      throw new Error("Simulation configuration is not set.")
    }

    const simNums = ctx.simRunsAmount[gameModeName]
    const resultSets = ctx.gameConfig.config.gameModes[gameModeName]?.resultSets

    if (!resultSets || resultSets.length === 0) {
      throw new Error(`No ResultSets found for game mode: ${gameModeName}.`)
    }

    if (simNums === undefined || simNums <= 0) {
      throw new Error(`No simulations configured for game mode "${gameModeName}".`)
    }

    const numberOfSimsForCriteria: Record<string, number> = Object.fromEntries(
      resultSets.map((rs) => [rs.criteria, Math.max(Math.floor(rs.quota * simNums), 1)]),
    )

    let totalSims = Object.values(numberOfSimsForCriteria).reduce(
      (sum, num) => sum + num,
      0,
    )

    let reduceSims = totalSims > simNums

    const criteriaToWeights = Object.fromEntries(
      resultSets.map((rs) => [rs.criteria, rs.quota]),
    )

    while (totalSims != simNums) {
      const rs = weightedRandom(criteriaToWeights, rng)
      if (reduceSims && numberOfSimsForCriteria[rs]! > 1) {
        numberOfSimsForCriteria[rs]! -= 1
      } else if (!reduceSims) {
        numberOfSimsForCriteria[rs]! += 1
      }

      totalSims = Object.values(numberOfSimsForCriteria).reduce(
        (sum, num) => sum + num,
        0,
      )
      reduceSims = totalSims > simNums
    }

    let allCriteria: string[] = []
    const simNumsToCriteria: Record<number, string> = {}

    Object.entries(numberOfSimsForCriteria).forEach(([criteria, num]) => {
      for (let i = 0; i <= num; i++) {
        allCriteria.push(criteria)
      }
    })

    allCriteria = shuffle(allCriteria, rng)

    for (let i = 1; i <= Math.min(simNums, allCriteria.length); i++) {
      simNumsToCriteria[i] = allCriteria[i]!
    }

    return simNumsToCriteria
  }

  /**
   * Checks if core criteria is met, e.g. target multiplier or max win.
   */
  meetsCriteria(ctx: AnySimulationContext<any, any, TUserState>) {
    const customEval = this.evaluate?.(copy(ctx))

    const freespinsMet = this.forceFreespins ? ctx.state.triggeredFreespins : true

    const multiplierMet =
      this.multiplier !== undefined
        ? ctx.wallet.getCurrentWin() === this.multiplier && !this.forceMaxWin
        : ctx.wallet.getCurrentWin() > 0 && (!this.forceMaxWin || true)

    const maxWinMet = this.forceMaxWin
      ? ctx.wallet.getCurrentWin() >= ctx.config.maxWinX
      : true

    const coreCriteriaMet = freespinsMet && multiplierMet && maxWinMet

    const finalResult =
      customEval !== undefined ? coreCriteriaMet && customEval === true : coreCriteriaMet

    if (this.forceMaxWin && maxWinMet) {
      ctx.record({
        maxwin: true,
      })
    }

    return finalResult
  }
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
   */
  multiplier?: number
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
   *     [GameConfig.SPIN_TYPE.BASE_GAME]: { base1: 1 },
   *     [GameConfig.SPIN_TYPE.FREE_SPINS]: { bonus1: 1, bonus2: 2 },
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
  evaluate?: (ctx: EvaluationContext<TUserState>) => boolean
}

interface ReelWeights<TUserState extends AnyUserData> {
  [GameConfig.SPIN_TYPE.BASE_GAME]: Record<string, number>
  [GameConfig.SPIN_TYPE.FREE_SPINS]: Record<string, number>
  evaluate?: (
    ctx: EvaluationContext<TUserState>,
  ) => Record<string, number> | undefined | null | false
}

export type EvaluationContext<TUserState extends AnyUserData> = Board<
  any,
  any,
  TUserState
>

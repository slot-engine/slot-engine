/**
 * A rule that reshapes the payout distribution of a criteria *before* the
 * optimization runs. Weights of results whose payout multiplier falls within
 * `winRange` are multiplied by `factor`.
 *
 * The optimizer still enforces the configured hit rates and RTP exactly,
 * so scaling only changes the *shape* of the distribution, e.g. making
 * wins between 10x and 20x twice as likely relative to other wins.
 */
export interface ScaleRule {
  /**
   * The inclusive payout multiplier range `[min, max]` this rule applies to.
   */
  winRange: [number, number]
  /**
   * The factor to multiply the weights by.\
   * Values > 1 make results in the range more likely, values < 1 make them less likely.
   */
  factor: number
}

/**
 * The optimization target for a single criteria (ResultSet) of a game mode.
 *
 * - `hitRate` pins how often the criteria occurs. It may be omitted for **at most one**
 *   criteria per game mode, which then absorbs the remaining probability.
 * - `rtp` / `avgWin` (mutually exclusive) pin how much the criteria pays out.
 *   If omitted, the criteria shares the remaining RTP of the game mode with all
 *   other criteria that don't define a payout target.
 */
export interface OptimizationTarget {
  /**
   * The target hit rate as "1 in N spins", e.g. `150` means the criteria
   * occurs once every 150 spins on average.
   *
   * Can be omitted for **at most one** criteria per game mode. That criteria
   * then absorbs the remaining probability (commonly the "0" / losing criteria
   * or the most frequent win criteria).
   */
  hitRate?: number
  /**
   * The target RTP contribution of this criteria, as a fraction of the bet cost (e.g. `0.38`).
   *
   * Optional: criteria without `rtp` / `avgWin` automatically share the remaining
   * RTP of the game mode. Cannot be combined with `avgWin`.
   */
  rtp?: number
  /**
   * The target average payout multiplier per hit of this criteria (e.g. `5000` for max wins).
   * Alternative to `rtp`: the RTP contribution is derived as `avgWin / (hitRate * cost)`.
   */
  avgWin?: number
  /**
   * Optional rules to reshape the payout distribution within this criteria.
   */
  scale?: ScaleRule[]
}

/**
 * Optimization configuration for a single game mode.
 */
export interface GameModeOptimization {
  /**
   * The optimization targets, keyed by ResultSet criteria name.
   * Every criteria of the game mode must have a target.
   */
  targets: Record<string, OptimizationTarget>
  /**
   * The scale used to convert the optimized probabilities to integer weights.\
   * The final weight of a result is `round(probability * weightScale)`.
   *
   * Default: `2^50`
   */
  weightScale?: number
}

/**
 * Options for the {@link optimize} function.
 */
export interface OptimizeOptions extends GameModeOptimization {
  input: {
    /**
     * Path to the unoptimized lookup table CSV.
     */
    lookupTable: string
    /**
     * Path to the segmented lookup table CSV.
     */
    lookupTableSegmented: string
  }
  output: {
    /**
     * Path the optimized lookup table CSV is written to.
     */
    lookupTable: string
  }
  /**
   * The bet cost of the game mode.
   */
  cost: number
  /**
   * The target RTP (0-1).
   */
  rtp: number
  /**
   * The divisor applied to the raw payout column of the lookup table to get
   * the payout multiplier. Lookup tables store payouts multiplied by 100.
   *
   * Default: `100`
   */
  payoutDivisor?: number
  /**
   * Log progress and a result summary to the console.
   *
   * Default: `true`
   */
  verbose?: boolean
}

/**
 * Achieved statistics for a single criteria after optimization.
 */
export interface CriteriaResult {
  /**
   * Number of books belonging to this criteria.
   */
  books: number
  /**
   * The achieved probability of this criteria occurring on a spin.
   */
  probability: number
  /**
   * The achieved hit rate as "1 in N spins".
   */
  hitRate: number
  /**
   * The achieved RTP contribution as a fraction of the bet cost.
   */
  rtp: number
  /**
   * The achieved average payout multiplier per hit.
   */
  avgWin: number
  /**
   * The lowest payout multiplier of this criteria.
   */
  minWin: number
  /**
   * The highest payout multiplier of this criteria.
   */
  maxWin: number
  /**
   * Number of books whose probability was so small it rounded to an integer weight of 0.
   * These books can never be drawn by the RGS.
   */
  zeroWeightBooks: number
}

/**
 * The result returned by {@link optimize}.
 */
export interface OptimizeResult {
  /**
   * Total number of books in the lookup table.
   */
  totalBooks: number
  /**
   * The achieved RTP of the game mode, computed from the final integer weights.
   */
  rtp: number
  /**
   * The weight scale used to convert probabilities to integer weights.
   */
  weightScale: number
  /**
   * Achieved statistics per criteria.
   */
  criteria: Record<string, CriteriaResult>
}

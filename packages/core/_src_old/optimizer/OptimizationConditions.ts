import assert from "assert"

export class OptimizationConditions {
  protected rtp?: number | "x"
  protected avgWin?: number
  protected hitRate?: number | "x"
  protected searchRange: number[]
  protected forceSearch: Record<string, string>
  priority: number

  constructor(opts: OptimizationConditionsOpts) {
    let { rtp, avgWin, hitRate, searchConditions, priority } = opts

    if (rtp == undefined || rtp === "x") {
      assert(avgWin !== undefined && hitRate !== undefined, "If RTP is not specified, hit-rate (hr) and average win amount (av_win) must be given.")
      rtp = Math.round((avgWin! / Number(hitRate)) * 100000) / 100000
    }

    let noneCount = 0
    for (const val of [rtp, avgWin, hitRate]) {
      if (val === undefined) noneCount++
    }
    assert(noneCount <= 1, "Invalid combination of optimization conditions.")

    this.searchRange = [-1, -1]
    this.forceSearch = {}

    if (typeof searchConditions === "number") {
      this.searchRange = [searchConditions, searchConditions]
    }
    if (Array.isArray(searchConditions)) {
      if (searchConditions[0] > searchConditions[1] || searchConditions.length !== 2) {
        throw new Error("Invalid searchConditions range.")
      }
      this.searchRange = searchConditions
    }
    if (typeof searchConditions === "object" && !Array.isArray(searchConditions)) {
      this.searchRange = [-1, -1]
      this.forceSearch = searchConditions
    }

    this.rtp = rtp
    this.avgWin = avgWin
    this.hitRate = hitRate
    this.priority = priority
  }

  getRtp() {
    return this.rtp
  }

  getAvgWin() {
    return this.avgWin
  }

  getHitRate() {
    return this.hitRate
  }

  getSearchRange() {
    return this.searchRange
  }

  getForceSearch() {
    return this.forceSearch
  }
}

interface OptimizationConditionsOpts {
  /**
   * The desired RTP (0-1)
   */
  rtp?: number | "x"
  /**
   * The desired average win (per spin).
   */
  avgWin?: number
  /**
   * The desired hit rate (e.g. `200` to hit 1 in 200 spins).
   */
  hitRate?: number | "x"
  /**
   * A way of filtering results by
   *
   * - A number (payout multiplier), e.g. `5000`
   * - Force record value, e.g. `{ "symbolId": "scatter" }`
   * - A range of numbers, e.g. `[0, 100]` (payout multiplier range)
   */
  searchConditions?: number | Record<string, string> | [number, number]
  /**
   * **Priority matters!**\
   * Higher priority conditions will be evaluated first.\
   * After a book matching this condition is found, the book will be removed from the pool\
   * and can't be used to satisfy other conditions with lower priority.
   * 
   * TODO add better explanation
   */
  priority: number
}

import { GameContext } from "../game-context"
import { GameSymbol } from "../game-symbol"
import { Reels } from "../types"

export class WinType {
  protected payout: number
  protected winCombinations: WinCombination[]
  protected ctx: GameContext
  protected readonly wildSymbol?: WildSymbol

  constructor(opts: WinTypeOpts) {
    this.ctx = opts.ctx
    this.payout = 0
    this.winCombinations = []
    this.wildSymbol = opts?.wildSymbol
  }

  /**
   * Implementation of win evaluation logic. Sets `this.payout` and `this.winCombinations`.
   */
  evaluateWins(board: Reels) {
    return this
  }

  /**
   * Custom post-processing of wins, e.g. for handling multipliers.
   */
  postProcess(func: WinPostProcessFn<typeof this.winCombinations>) {
    const result = func(this.winCombinations, this.ctx)
    this.winCombinations = result.winCombinations
    this.payout = result.winCombinations.reduce((sum, w) => sum + w.payout, 0)
    return this
  }

  /**
   * Returns the total payout and detailed win combinations.
   */
  getWins() {
    return {
      payout: this.payout,
      winCombinations: this.winCombinations,
    }
  }

  protected isWild(symbol: GameSymbol) {
    return !!this.wildSymbol && symbol.compare(this.wildSymbol)
  }

  protected getSymbolPayout(symbol: GameSymbol, count: number) {
    if (!symbol.pays) return 0

    let clusterSize = 0

    const sizes = Object.keys(symbol.pays)
      .map((s) => parseInt(s, 10))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b)

    for (const size of sizes) {
      if (size > count) break
      clusterSize = size
    }

    return symbol.pays[clusterSize] || 0
  }
}

export interface WinTypeOpts {
  /**
   * A reference to the game context.
   */
  ctx: GameContext<any, any, any> // TODO: Hacky and stupid. Fix AnyTypes.
  /**
   * Configuration used to identify wild symbols on the board.\
   * You can either provide a specific `GameSymbol` instance or a set of properties to match against symbols on the board.
   *
   * @example
   * If you have different wild symbols, each with a property `isWild: true`, you can define:
   * ```ts
   * wildSymbol: { isWild: true }
   * ```
   *
   * @example
   * If you have a single wild symbol instance, you can define:
   * ```ts
   * wildSymbol: myWildSymbol
   * ```
   */
  wildSymbol?: WildSymbol
}

export type WinCombination = {
  payout: number
  kind: number
  baseSymbol: GameSymbol
  symbols: Array<{
    symbol: GameSymbol
    isWild: boolean
    substitutedFor?: GameSymbol
    reelIndex: number
    posIndex: number
  }>
}

export type WinPostProcessFn<TWinCombs extends WinCombination[]> = (
  wins: TWinCombs,
  ctx: GameContext,
) => {
  winCombinations: TWinCombs
}

type WildSymbol = GameSymbol | Record<string, any>

export type Symbol = { reel: number; row: number; symbol: GameSymbol }
export type SymbolList = Array<Symbol>
export type SymbolMap = Map<string, Symbol>

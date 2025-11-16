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
  postProcess(func: PostProcessFn<typeof this.winCombinations>) {
    const result = func(this, this.ctx)
    this.payout = result.payout
    this.winCombinations = result.winCombinations
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
  symbols: Array<{
    symbol: GameSymbol
    isWild: boolean
    substitutedFor?: GameSymbol
    reelIndex: number
    posIndex: number
  }>
}

type PostProcessFn<TWinCombs extends WinCombination[]> = (
  winType: WinType,
  ctx: GameContext,
) => {
  payout: number
  winCombinations: TWinCombs
}

type WildSymbol = GameSymbol | Record<string, any>

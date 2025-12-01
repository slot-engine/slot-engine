import { GameSymbol } from "../game-symbol"
import { SymbolList, WinCombination, WinType, WinTypeOpts } from "."
import { Reels } from "../types"

export class ManywaysWinType extends WinType {
  declare protected winCombinations: ManywaysWinCombination[]
  declare getWins: () => {
    payout: number
    winCombinations: ManywaysWinCombination[]
  }

  private _checked: SymbolList = []
  private _checkedWilds: SymbolList = []

  constructor(opts: ManywaysWinTypeOpts) {
    super(opts)
  }

  private validateConfig() {}

  /**
   * Calculates wins based on the defined paylines and provided board state.\
   * Retrieve the results using `getWins()` after.
   */
  evaluateWins(board: Reels) {
    this.validateConfig()

    const waysWins: ManywaysWinCombination[] = []

    const reels = board

    // A wild on the first reel can start a win for any symbol on second reel.
    // Store the possible wins in a map with the base symbol id as key.
    // The value is an array of "reels" containing all matching symbols for that base symbol.
    const possibleWaysWins = new Map<string, Record<string, SymbolList>>()

    // Identify all candidate symbols that can form a win starting from Reel 1.
    // We scan from left to right. If a reel contains a Wild, it can "bridge" to the next reel.
    // We collect all non-wild symbols we encounter as potential win candidates.
    // We also collect the Wild symbol itself as a candidate for pure wild wins.
    const candidateSymbols = new Map<string, GameSymbol>()
    let searchReelIdx = 0
    let searchActive = true

    while (searchActive && searchReelIdx < reels.length) {
      const reel = reels[searchReelIdx]!
      let hasWild = false

      for (const symbol of reel) {
        candidateSymbols.set(symbol.id, symbol)
        if (this.isWild(symbol)) {
          hasWild = true
        }
      }

      // If this reel has no wilds, we can't extend the search for *new* starting symbols
      // beyond this reel (because a win must be continuous from the start).
      if (!hasWild) {
        searchActive = false
      }
      searchReelIdx++
    }

    for (const baseSymbol of candidateSymbols.values()) {
      let symbolList: Record<string, SymbolList> = {}
      let isInterrupted = false

      for (const [ridx, reel] of reels.entries()) {
        if (isInterrupted) break

        for (const [sidx, symbol] of reel.entries()) {
          const isMatch = baseSymbol.compare(symbol) || this.isWild(symbol)

          if (isMatch) {
            if (!symbolList[ridx]) {
              symbolList[ridx] = []
            }
            symbolList[ridx].push({ reel: ridx, row: sidx, symbol })
          }
        }

        if (!symbolList[ridx]) {
          isInterrupted = true
          break
        }
      }

      const minSymLine = Math.min(
        ...Object.keys(baseSymbol!.pays || {}).map((k) => parseInt(k, 10)),
      )
      const wayLength = this.getWayLength(symbolList)

      if (wayLength >= minSymLine) {
        possibleWaysWins.set(baseSymbol.id, symbolList)
      }
    }

    for (const [baseSymbolId, symbolList] of possibleWaysWins.entries()) {
      const wayLength = this.getWayLength(symbolList)

      let baseSymbol = Object.values(symbolList)
        .flatMap((l) => l.map((s) => s))
        .find((s) => !this.isWild(s.symbol))?.symbol

      if (!baseSymbol) baseSymbol = symbolList[0]![0]!.symbol

      const singleWayPayout = this.getSymbolPayout(baseSymbol, wayLength)
      const totalWays = Object.values(symbolList).reduce(
        (ways, syms) => ways * syms.length,
        1,
      )
      const totalPayout = singleWayPayout * totalWays

      waysWins.push({
        kind: wayLength,
        baseSymbol,
        symbols: Object.values(symbolList).flatMap((reel) =>
          reel.map((s) => ({
            symbol: s.symbol,
            isWild: this.isWild(s.symbol),
            reelIndex: s.reel,
            posIndex: s.row,
          })),
        ),
        ways: totalWays,
        payout: totalPayout,
      })
    }

    for (const win of waysWins) {
      this.ctx.services.data.recordSymbolOccurrence({
        kind: win.kind,
        symbolId: win.baseSymbol.id,
        spinType: this.ctx.state.currentSpinType,
      })
    }

    this.payout = waysWins.reduce((sum, l) => sum + l.payout, 0)
    this.winCombinations = waysWins

    return this
  }

  private getWayLength(symbolList: Record<string, SymbolList>) {
    return Math.max(...Object.keys(symbolList).map((k) => parseInt(k, 10))) + 1
  }

  private isChecked(ridx: number, sidx: number) {
    return !!this._checked.find((c) => c.reel === ridx && c.row === sidx)
  }

  private isCheckedWild(ridx: number, sidx: number) {
    return !!this._checkedWilds.find((c) => c.reel === ridx && c.row === sidx)
  }
}

interface ManywaysWinTypeOpts extends WinTypeOpts {}

export interface ManywaysWinCombination extends WinCombination {
  ways: number
}

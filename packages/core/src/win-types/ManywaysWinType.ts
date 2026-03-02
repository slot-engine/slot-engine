import { GameSymbol } from "../game-symbol"
import { SymbolList, WinCombination, WinType, WinTypeOpts } from "."
import { Reels } from "../types"

export class ManywaysWinType extends WinType {
  declare protected winCombinations: ManywaysWinCombination[]
  declare getWins: () => {
    payout: number
    winCombinations: ManywaysWinCombination[]
  }

  constructor(opts: ManywaysWinTypeOpts) {
    super(opts)
  }

  private validateConfig() {}

  /**
   * Calculates wins based on the defined paylines and provided board state.\
   * Retrieve the results using `getWins()` after.
   */
  evaluateWins(
    board: Reels,
    opts: {
      jumpGaps?: boolean
    } = {},
  ) {
    this.validateConfig()

    const { jumpGaps = false } = opts
    const waysWins: ManywaysWinCombination[] = []
    const reels = board
    const numReels = reels.length

    // Identify all candidate symbols that can form a win starting from Reel 1.
    // We scan from left to right. If a reel contains a Wild, it can "bridge" to the next reel.
    // We collect all non-wild symbols we encounter as potential win candidates.
    // We also collect the Wild symbol itself as a candidate for pure wild wins.
    const candidateSymbols = new Map<string, GameSymbol>()

    if (jumpGaps) {
      for (const reel of reels) {
        for (const symbol of reel) {
          candidateSymbols.set(symbol.id, symbol)
        }
      }
    } else {
      let searchReelIdx = 0
      let searchActive = true

      while (searchActive && searchReelIdx < numReels) {
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
    }

    for (const baseSymbol of candidateSymbols.values()) {
      const symbolList: SymbolList[] = []
      let wayLength = 0
      let firstNonWildSymbol: GameSymbol | undefined
      let totalWays = 1

      for (let ridx = 0; ridx < numReels; ridx++) {
        const reel = reels[ridx]!
        let reelMatches: SymbolList | undefined

        for (let sidx = 0; sidx < reel.length; sidx++) {
          const symbol = reel[sidx]!
          const isMatch = baseSymbol.compare(symbol) || this.isWild(symbol)

          if (isMatch) {
            if (!reelMatches) {
              reelMatches = []
            }
            reelMatches.push({ reel: ridx, row: sidx, symbol })

            if (!firstNonWildSymbol && !this.isWild(symbol)) {
              firstNonWildSymbol = symbol
            }
          }
        }

        if (reelMatches) {
          symbolList[wayLength++] = reelMatches
          totalWays *= reelMatches.length
        } else if (!jumpGaps) {
          break
        }
      }

      const pays = baseSymbol.pays || {}
      let minSymLine = Infinity
      for (const key in pays) {
        const num = parseInt(key, 10)
        if (num < minSymLine) minSymLine = num
      }

      if (wayLength >= minSymLine) {
        const winBaseSymbol = firstNonWildSymbol || symbolList[0]![0]!.symbol
        const singleWayPayout = this.getSymbolPayout(winBaseSymbol, wayLength)
        const totalPayout = singleWayPayout * totalWays

        const symbols: ManywaysWinCombination["symbols"] = []
        for (let i = 0; i < wayLength; i++) {
          const reelSyms = symbolList[i]!
          for (let j = 0; j < reelSyms.length; j++) {
            const s = reelSyms[j]!
            symbols.push({
              symbol: s.symbol,
              isWild: this.isWild(s.symbol),
              reelIndex: s.reel,
              posIndex: s.row,
            })
          }
        }

        waysWins.push({
          kind: wayLength,
          baseSymbol: winBaseSymbol,
          symbols,
          ways: totalWays,
          payout: totalPayout,
        })

        this.ctx.services.data.recordSymbolOccurrence({
          kind: wayLength,
          symbolId: winBaseSymbol.id,
          spinType: this.ctx.state.currentSpinType,
        })
      }
    }

    let totalPayout = 0
    for (let i = 0; i < waysWins.length; i++) {
      totalPayout += waysWins[i]!.payout
    }

    this.payout = totalPayout
    this.winCombinations = waysWins

    return this
  }
}

interface ManywaysWinTypeOpts extends WinTypeOpts {}

export interface ManywaysWinCombination extends WinCombination {
  ways: number
}

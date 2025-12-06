import assert from "assert"
import { GameContext } from "../game-context"
import { Reels } from "../types"
import { GameSymbol } from "../game-symbol"
import { WinCombination } from "../win-types"

/**
 * This general board class is designed to function with or without a game context.
 */
export class Board {
  /**
   * The current reels on the board.\
   * Includes only the visible symbols (without padding).
   */
  reels: Reels
  /**
   * The top padding symbols on the board.\
   * These are the symbols above the visible area.
   */
  paddingTop: Reels
  /**
   * The bottom padding symbols on the board.\
   * These are the symbols below the visible area.
   */
  paddingBottom: Reels
  /**
   * The anticipation values for each reel on the board.\
   * Used for triggering anticipation effects.
   */
  anticipation: boolean[]
  lastDrawnReelStops: number[]
  lastUsedReels: Reels

  constructor() {
    this.reels = []
    this.paddingTop = []
    this.paddingBottom = []
    this.anticipation = []
    this.lastDrawnReelStops = []
    this.lastUsedReels = []
  }

  getSymbol(reelIndex: number, rowIndex: number) {
    return this.reels[reelIndex]?.[rowIndex]
  }

  setSymbol(reelIndex: number, rowIndex: number, symbol: GameSymbol) {
    this.reels[reelIndex] = this.reels[reelIndex] || []
    this.reels[reelIndex]![rowIndex] = symbol
  }

  makeEmptyReels(opts: { ctx: GameContext; reelsAmount?: number }) {
    const length =
      opts.reelsAmount ?? opts.ctx.services.game.getCurrentGameMode().reelsAmount

    assert(length, "Cannot make empty reels without context or reelsAmount.")

    return Array.from({ length }, () => [])
  }

  countSymbolsOnReel(
    symbolOrProperties: GameSymbol | Record<string, any>,
    reelIndex: number,
  ) {
    let total = 0

    for (const symbol of this.reels[reelIndex]!) {
      let matches = true
      if (symbolOrProperties instanceof GameSymbol) {
        if (symbol.id !== symbolOrProperties.id) matches = false
      } else {
        for (const [key, value] of Object.entries(symbolOrProperties)) {
          if (!symbol.properties.has(key) || symbol.properties.get(key) !== value) {
            matches = false
            break
          }
        }
      }
      if (matches) {
        total++
      }
    }

    return total
  }

  countSymbolsOnBoard(
    symbolOrProperties: GameSymbol | Record<string, any>,
  ): [number, Record<number, number>] {
    let total = 0
    const onReel: Record<number, number> = {}

    for (const [ridx, reel] of this.reels.entries()) {
      for (const symbol of reel) {
        let matches = true

        if (symbolOrProperties instanceof GameSymbol) {
          if (symbol.id !== symbolOrProperties.id) matches = false
        } else {
          for (const [key, value] of Object.entries(symbolOrProperties)) {
            if (!symbol.properties.has(key) || symbol.properties.get(key) !== value) {
              matches = false
              break
            }
          }
        }

        if (matches) {
          total++
          if (onReel[ridx] === undefined) {
            onReel[ridx] = 1
          } else {
            onReel[ridx]++
          }
        }
      }
    }

    return [total, onReel]
  }

  isSymbolOnAnyReelMultipleTimes(symbol: GameSymbol) {
    for (const reel of this.reels) {
      let count = 0
      for (const sym of reel) {
        if (sym.id === symbol.id) {
          count++
        }
        if (count > 1) {
          return true
        }
      }
    }
    return false
  }

  getReelStopsForSymbol(reels: Reels, symbol: GameSymbol) {
    const reelStops: number[][] = []
    for (let ridx = 0; ridx < reels.length; ridx++) {
      const reel = reels[ridx]!
      const positions: number[] = []
      for (let pos = 0; pos < reel.length; pos++) {
        if (reel[pos]!.id === symbol.id) {
          positions.push(pos)
        }
      }
      reelStops.push(positions)
    }
    return reelStops
  }

  combineReelStops(opts: {
    ctx: GameContext
    reelsAmount?: number
    reelStops: number[][][]
  }) {
    const reelsAmount =
      opts.reelsAmount ?? opts.ctx.services.game.getCurrentGameMode().reelsAmount

    assert(reelsAmount, "Cannot combine reel stops without context or reelsAmount.")

    const combined: number[][] = []
    for (let ridx = 0; ridx < reelsAmount; ridx++) {
      combined[ridx] = []
      for (const stops of opts.reelStops) {
        combined[ridx] = combined[ridx]!.concat(stops[ridx]!)
      }
    }
    return combined
  }

  getRandomReelStops(opts: {
    ctx: GameContext
    reelsAmount?: number
    reels: Reels
    reelStops: number[][]
    amount: number
  }) {
    const reelsAmount =
      opts.reelsAmount ?? opts.ctx.services.game.getCurrentGameMode().reelsAmount

    assert(reelsAmount, "Cannot get random reel stops without context or reelsAmount.")

    const symProbsOnReels: number[] = []
    const stopPositionsForReels: Record<number, number> = {}

    for (let ridx = 0; ridx < reelsAmount; ridx++) {
      symProbsOnReels.push(opts.reelStops[ridx]!.length / opts.reels[ridx]!.length)
    }

    while (Object.keys(stopPositionsForReels).length !== opts.amount) {
      const possibleReels: number[] = []
      for (let i = 0; i < reelsAmount; i++) {
        if (symProbsOnReels[i]! > 0) {
          possibleReels.push(i)
        }
      }
      const possibleProbs = symProbsOnReels.filter((p) => p > 0)
      const weights = Object.fromEntries(
        possibleReels.map((ridx, idx) => [ridx, possibleProbs[idx]!]),
      )
      const chosenReel = opts.ctx.services.rng.weightedRandom(weights)
      const chosenStop = opts.ctx.services.rng.randomItem(
        opts.reelStops[Number(chosenReel)]!,
      )
      symProbsOnReels[Number(chosenReel)] = 0
      stopPositionsForReels[Number(chosenReel)] = chosenStop
    }

    return stopPositionsForReels
  }

  getRandomReelset(ctx: GameContext) {
    const weights = ctx.state.currentResultSet.reelWeights
    const evalWeights = ctx.state.currentResultSet.reelWeights.evaluate?.(ctx)

    let reelSetId: string = ""

    if (evalWeights) {
      reelSetId = ctx.services.rng.weightedRandom(evalWeights)
    } else {
      reelSetId = ctx.services.rng.weightedRandom(weights[ctx.state.currentSpinType]!)
    }

    const reelSet = ctx.services.game.getReelsetById(ctx.state.currentGameMode, reelSetId)

    return reelSet
  }

  resetReels(opts: { ctx: GameContext; reelsAmount?: number }) {
    const length =
      opts.reelsAmount ?? opts.ctx.services.game.getCurrentGameMode().reelsAmount

    this.reels = this.makeEmptyReels(opts)
    this.anticipation = Array.from({ length }, () => false)
    this.paddingTop = this.makeEmptyReels(opts)
    this.paddingBottom = this.makeEmptyReels(opts)
  }

  drawBoardMixed(opts: {
    ctx: GameContext
    reels: Reels
    forcedStops?: Record<string, number>
    forcedStopsOffset?: boolean
    reelsAmount?: number
    symbolsPerReel?: number[]
    padSymbols?: number
  }) {
    this.resetReels(opts)

    const reelsAmount =
      opts.reelsAmount ?? opts.ctx.services.game.getCurrentGameMode().reelsAmount
    const symbolsPerReel =
      opts.symbolsPerReel ?? opts.ctx.services.game.getCurrentGameMode().symbolsPerReel
    const padSymbols = opts.padSymbols ?? opts.ctx.config.padSymbols

    const finalReelStops: (number | null)[] = Array.from(
      { length: reelsAmount },
      () => null,
    )

    if (opts.forcedStops) {
      // Fill in forced stops
      for (const [r, stopPos] of Object.entries(opts.forcedStops)) {
        const reelIdx = Number(r)

        const symCount = symbolsPerReel[reelIdx]!

        if (opts.forcedStopsOffset !== false) {
          finalReelStops[reelIdx] =
            stopPos - Math.round(opts.ctx.services.rng.randomFloat(0, symCount - 1))
        } else {
          finalReelStops[reelIdx] = stopPos
        }

        if (finalReelStops[reelIdx]! < 0) {
          finalReelStops[reelIdx] = opts.reels[reelIdx]!.length + finalReelStops[reelIdx]!
        }
      }
    }

    // Fill in random stops for reels without a forced stop
    for (let i = 0; i < finalReelStops.length; i++) {
      if (finalReelStops[i] === null) {
        finalReelStops[i] = Math.floor(
          opts.ctx.services.rng.randomFloat(0, opts.reels[i]!.length - 1),
        )
      }
    }

    this.lastDrawnReelStops = finalReelStops.map((pos) => pos!) as number[]
    this.lastUsedReels = opts.reels

    for (let ridx = 0; ridx < reelsAmount; ridx++) {
      const reelPos = finalReelStops[ridx]!
      const reelLength = opts.reels[ridx]!.length

      for (let p = padSymbols - 1; p >= 0; p--) {
        const topPos = (((reelPos - (p + 1)) % reelLength) + reelLength) % reelLength
        this.paddingTop[ridx]!.push(opts.reels[ridx]![topPos]!)
        const bottomPos = (reelPos + symbolsPerReel[ridx]! + p) % reelLength
        this.paddingBottom[ridx]!.unshift(opts.reels[ridx]![bottomPos]!)
      }

      for (let row = 0; row < symbolsPerReel[ridx]!; row++) {
        const symbol = opts.reels[ridx]![(reelPos + row) % reelLength]

        if (!symbol) {
          throw new Error(`Failed to get symbol at pos ${reelPos + row} on reel ${ridx}`)
        }

        this.reels[ridx]![row] = symbol
      }
    }
  }

  tumbleBoard(opts: {
    ctx: GameContext
    symbolsToDelete: Array<{ reelIdx: number; rowIdx: number }>
    reelsAmount?: number
    symbolsPerReel?: number[]
    padSymbols?: number
  }) {
    assert(this.lastDrawnReelStops.length > 0, "Cannot tumble board before drawing it.")

    const reelsAmount =
      opts.reelsAmount ?? opts.ctx.services.game.getCurrentGameMode().reelsAmount
    const symbolsPerReel =
      opts.symbolsPerReel ?? opts.ctx.services.game.getCurrentGameMode().symbolsPerReel
    const padSymbols = opts.padSymbols ?? opts.ctx.config.padSymbols

    if (!opts.ctx && !reelsAmount && !symbolsPerReel) {
      throw new Error(
        "If ctx is not provided, reelsAmount and symbolsPerReel must be given.",
      )
    }

    const reels = this.lastUsedReels

    // Sort deletions by row index descending to avoid index shifting issues
    const sortedDeletions = [...opts.symbolsToDelete].sort((a, b) => b.rowIdx - a.rowIdx)

    sortedDeletions.forEach(({ reelIdx, rowIdx }) => {
      this.reels[reelIdx]!.splice(rowIdx, 1)
    })

    const newFirstSymbolPositions: Record<number, number> = {}

    /**
     * A mapping of reel index to the new symbols that were added to that reel during the tumble.\
     * The topmost added symbols are at the start of the array.
     */
    const newBoardSymbols: Record<string, GameSymbol[]> = {}

    /**
     * A mapping of reel index to the new padding top symbols that were added to that reel during the tumble.
     * The topmost added symbols are at the start of the array.
     */
    const newPaddingTopSymbols: Record<string, GameSymbol[]> = {}

    for (let ridx = 0; ridx < reelsAmount; ridx++) {
      // Drop down padding symbols from top for as long as reel is not filled and padding top has symbols
      while (this.reels[ridx]!.length < symbolsPerReel[ridx]!) {
        const padSymbol = this.paddingTop[ridx]!.pop()
        if (padSymbol) {
          this.reels[ridx]!.unshift(padSymbol)

          if (!newBoardSymbols[ridx]) {
            newBoardSymbols[ridx] = []
          }

          newBoardSymbols[ridx]!.unshift(padSymbol)
        } else {
          break
        }
      }

      const previousStop = this.lastDrawnReelStops[ridx]!
      const stopBeforePad = previousStop - padSymbols - 1
      const symbolsNeeded = symbolsPerReel[ridx]! - this.reels[ridx]!.length
      // Drop rest of symbols
      for (let s = 0; s < symbolsNeeded; s++) {
        const symbolPos = (stopBeforePad - s + reels[ridx]!.length) % reels[ridx]!.length
        const newSymbol = reels[ridx]![symbolPos]

        assert(newSymbol, "Failed to get new symbol for tumbling.")

        this.reels[ridx]!.unshift(newSymbol)
        newFirstSymbolPositions[ridx] = symbolPos

        if (!newBoardSymbols[ridx]) {
          newBoardSymbols[ridx] = []
        }

        newBoardSymbols[ridx]!.unshift(newSymbol)
      }
    }

    // Add new padding top symbols
    for (let ridx = 0; ridx < reelsAmount; ridx++) {
      const firstSymbolPos = newFirstSymbolPositions[ridx]!

      if (firstSymbolPos === undefined) continue

      for (let p = 1; p <= padSymbols; p++) {
        const topPos = (firstSymbolPos - p + reels[ridx]!.length) % reels[ridx]!.length
        const padSymbol = reels[ridx]![topPos]

        assert(padSymbol, "Failed to get new padding symbol for tumbling.")

        this.paddingTop[ridx]!.unshift(padSymbol)

        if (!newPaddingTopSymbols[ridx]) {
          newPaddingTopSymbols[ridx] = []
        }

        newPaddingTopSymbols[ridx]!.unshift(padSymbol)
      }
    }

    // Ensure future tumbles start from the new top positions
    this.lastDrawnReelStops = this.lastDrawnReelStops.map((stop, ridx) => {
      return newFirstSymbolPositions[ridx] ?? stop
    })

    return {
      newBoardSymbols,
      newPaddingTopSymbols,
    }
  }

  dedupeWinSymbolsForTumble(winCombinations: WinCombination[]) {
    const symbolsMap = new Map<string, { reelIdx: number; rowIdx: number }>()
    winCombinations.forEach((wc) => {
      wc.symbols.forEach((s) => {
        symbolsMap.set(`${s.reelIndex},${s.posIndex}`, {
          reelIdx: s.reelIndex,
          rowIdx: s.posIndex,
        })
      })
    })
    const symbolsToRemove = Array.from(symbolsMap.values())
    return symbolsToRemove
  }
}

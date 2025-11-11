import assert from "assert"
import { AbstractService } from "."
import { GameContext } from "../game-context"
import { GameSymbol } from "../game-symbol"
import { AnyGameModes, AnySymbols, AnyUserData, Reels } from "../types"

export class BoardService<
  TGameModes extends AnyGameModes = AnyGameModes,
  TSymbols extends AnySymbols = AnySymbols,
  TUserState extends AnyUserData = AnyUserData,
> extends AbstractService {
  /**
   * The current reels on the board.\
   * Includes only the visible symbols (without padding).
   */
  private reels: Reels
  /**
   * The top padding symbols on the board.\
   * These are the symbols above the visible area.
   */
  private paddingTop: Reels
  /**
   * The bottom padding symbols on the board.\
   * These are the symbols below the visible area.
   */
  private paddingBottom: Reels
  /**
   * The anticipation values for each reel on the board.\
   * Used for triggering anticipation effects.
   */
  private anticipation: number[]
  private lastDrawnReelStops: number[]
  private lastUsedReels: Reels

  constructor(ctx: () => GameContext<TGameModes, TSymbols, TUserState>) {
    // @ts-ignore TODO: Fix type errors with AnyTypes
    super(ctx)

    this.reels = []
    this.paddingTop = []
    this.paddingBottom = []
    this.anticipation = []
    this.lastDrawnReelStops = []
    this.lastUsedReels = []
  }

  /**
   * Resets the board to an empty state.\
   * This is called before drawing a new board.
   */
  resetBoard() {
    this.resetReels()
    this.lastDrawnReelStops = []
  }

  private makeEmptyReels() {
    return Array.from(
      { length: this.ctx().services.game.getCurrentGameMode().reelsAmount },
      () => [],
    )
  }

  private resetReels() {
    this.reels = this.makeEmptyReels()
    this.anticipation = Array.from(
      { length: this.ctx().services.game.getCurrentGameMode().reelsAmount },
      () => 0,
    )
    this.paddingTop = this.makeEmptyReels()
    this.paddingBottom = this.makeEmptyReels()
  }

  /**
   * Sets the anticipation value for a specific reel.\
   * Value must be either 0 (no anticipation) or 1 (anticipation active).
   */
  setAnticipationForReel(reelIndex: number, value: number) {
    assert(value == 1 || value == 0, "Anticipation value must be 0 or 1")
    this.anticipation[reelIndex] = value
  }

  /**
   * Counts how many symbols matching the criteria are on a specific reel.
   */
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

  /**
   * Counts how many symbols matching the criteria are on the board.
   *
   * Passing a GameSymbol will compare by ID, passing a properties object will compare by properties.
   *
   * Returns a tuple where the first element is the total count, and the second element is a record of counts per reel index.
   */
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

  /**
   * Checks if a symbol appears more than once on any reel in the current reel set.
   *
   * Useful to check for "forbidden" generations, e.g. 2 scatters on one reel.
   */
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

  /**
   * Gets all reel stops (positions) where the specified symbol appears in the current reel set.\
   * Returns an array of arrays, where each inner array contains the positions for the corresponding reel.
   */
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

  /**
   * Combines multiple arrays of reel stops into a single array of reel stops.\
   */
  combineReelStops(...reelStops: number[][][]) {
    const combined: number[][] = []
    for (
      let ridx = 0;
      ridx < this.ctx().services.game.getCurrentGameMode().reelsAmount;
      ridx++
    ) {
      combined[ridx] = []
      for (const stops of reelStops) {
        combined[ridx] = combined[ridx]!.concat(stops[ridx]!)
      }
    }
    return combined
  }

  /**
   * From a list of reel stops on reels, selects a random stop for a speficied number of random symbols.
   *
   * Mostly useful for placing scatter symbols on the board.
   */
  getRandomReelStops(reels: Reels, reelStops: number[][], amount: number) {
    const reelsAmount = this.ctx().services.game.getCurrentGameMode().reelsAmount
    const symProbsOnReels: number[] = []
    const stopPositionsForReels: Record<string, number> = {}

    for (let ridx = 0; ridx < reelsAmount; ridx++) {
      symProbsOnReels.push(reelStops[ridx]!.length / reels[ridx]!.length)
    }

    while (Object.keys(stopPositionsForReels).length !== amount) {
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
      const chosenReel = this.ctx().services.rng.weightedRandom(weights)
      const chosenStop = this.ctx().services.rng.randomItem(
        reelStops[Number(chosenReel)]!,
      )
      symProbsOnReels[Number(chosenReel)] = 0
      stopPositionsForReels[chosenReel] = chosenStop
    }

    return stopPositionsForReels
  }

  /**
   * Selects a random reel set based on the configured weights of the current result set.\
   * Returns the reels as arrays of GameSymbols.
   */
  getRandomReelset() {
    const weights = this.ctx().state.currentResultSet.reelWeights
    const evalWeights = this.ctx().state.currentResultSet.reelWeights.evaluate?.(this)

    let reelSetId: string = ""

    if (evalWeights) {
      reelSetId = this.ctx().services.rng.weightedRandom(evalWeights)
    } else {
      reelSetId = this.ctx().services.rng.weightedRandom(
        weights[this.ctx().state.currentSpinType]!,
      )
    }

    const reelSet = this.ctx().services.game.getReelsetById(
      this.ctx().state.currentGameMode,
      reelSetId,
    )

    return reelSet
  }

  /**
   * Draws a board using specified reel stops.
   */
  drawBoardWithForcedStops(reels: Reels, forcedStops: Record<string, number>) {
    this.drawBoardMixed(reels, forcedStops)
  }

  /**
   * Draws a board using random reel stops.
   */
  drawBoardWithRandomStops(reels: Reels) {
    this.drawBoardMixed(reels)
  }

  private drawBoardMixed(reels: Reels, forcedStops?: Record<string, number>) {
    this.resetReels()

    const currentGameMode = this.ctx().services.game.getCurrentGameMode()

    const finalReelStops: (number | null)[] = Array.from(
      { length: currentGameMode.reelsAmount },
      () => null,
    )

    if (forcedStops) {
      // Fill in forced stops
      for (const [r, stopPos] of Object.entries(forcedStops)) {
        const reelIdx = Number(r)

        const symCount = currentGameMode.symbolsPerReel[reelIdx]!

        finalReelStops[reelIdx] =
          stopPos - Math.round(this.ctx().services.rng.randomFloat(0, symCount - 1))

        if (finalReelStops[reelIdx]! < 0) {
          finalReelStops[reelIdx] = reels[reelIdx]!.length + finalReelStops[reelIdx]!
        }
      }
    }

    // Fill in random stops for reels without a forced stop
    for (let i = 0; i < finalReelStops.length; i++) {
      if (finalReelStops[i] === null) {
        finalReelStops[i] = Math.floor(
          this.ctx().services.rng.randomFloat(0, reels[i]!.length - 1),
        )
      }
    }

    this.lastDrawnReelStops = finalReelStops.map((pos) => pos!) as number[]
    this.lastUsedReels = reels

    for (let ridx = 0; ridx < currentGameMode.reelsAmount; ridx++) {
      const reelPos = finalReelStops[ridx]!

      for (let p = this.ctx().config.padSymbols - 1; p >= 0; p--) {
        const topPos = (reelPos - (p + 1)) % reels[ridx]!.length
        this.paddingTop[ridx]!.push(reels[ridx]![topPos]!)
        const bottomPos =
          (reelPos + currentGameMode.symbolsPerReel[ridx]! + p) % reels[ridx]!.length
        this.paddingBottom[ridx]!.unshift(reels[ridx]![bottomPos]!)
      }

      for (let row = 0; row < currentGameMode.symbolsPerReel[ridx]!; row++) {
        const symbol = reels[ridx]![(reelPos + row) % reels[ridx]!.length]

        if (!symbol) {
          throw new Error(`Failed to get symbol at pos ${reelPos + row} on reel ${ridx}`)
        }

        this.reels[ridx]![row] = symbol
      }
    }
  }

  /**
   * Tumbles the board. All given symbols will be deleted and new symbols will fall from the top.
   */
  tumbleBoard(symbolsToDelete: Array<{ reelIdx: number; rowIdx: number }>) {
    assert(this.lastDrawnReelStops.length > 0, "Cannot tumble board before drawing it.")

    const reelsAmount = this.ctx().services.game.getCurrentGameMode().reelsAmount
    const symbolsPerReel = this.ctx().services.game.getCurrentGameMode().symbolsPerReel
    const reels = this.lastUsedReels

    symbolsToDelete.forEach(({ reelIdx, rowIdx }) => {
      this.reels[reelIdx]!.splice(rowIdx, 1)
    })

    const newFirstSymbolPositions: Record<number, number> = {}

    for (let ridx = 0; ridx < reelsAmount; ridx++) {
      // Drop down padding symbols from top
      while (this.reels[ridx]!.length < symbolsPerReel[ridx]!) {
        const padSymbol = this.paddingTop[ridx]!.pop()
        if (padSymbol) {
          this.reels[ridx]!.unshift(padSymbol)
        } else {
          break
        }
      }

      const previousStop = this.lastDrawnReelStops[ridx]!
      const stopBeforePad = previousStop - this.ctx().config.padSymbols - 1
      const symbolsNeeded = symbolsPerReel[ridx]! - this.reels[ridx]!.length
      // Drop rest of symbols
      for (let s = 0; s < symbolsNeeded; s++) {
        const symbolPos = (stopBeforePad - s + reels[ridx]!.length) % reels[ridx]!.length
        const newSymbol = reels[ridx]![symbolPos]

        assert(newSymbol, "Failed to get new symbol for tumbling.")

        this.reels[ridx]!.unshift(newSymbol)
        newFirstSymbolPositions[ridx] = symbolPos
      }
    }

    // Add new padding top symbols
    for (let ridx = 0; ridx < reelsAmount; ridx++) {
      const firstSymbolPos = newFirstSymbolPositions[ridx]!
      for (let p = 1; p <= this.ctx().config.padSymbols; p++) {
        const topPos = (firstSymbolPos - p + reels[ridx]!.length) % reels[ridx]!.length
        const padSymbol = reels[ridx]![topPos]

        assert(padSymbol, "Failed to get new padding symbol for tumbling.")

        this.paddingTop[ridx]!.unshift(padSymbol)
      }
    }
  }
}

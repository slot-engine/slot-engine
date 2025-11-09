import assert from "assert"
import { AnyGameModes, AnySymbols, AnyUserData, CommonGameOptions } from "../index"
import { randomItem, weightedRandom } from "../utils"
import { GameState } from "./GameState"
import { GameSymbol } from "./GameSymbol"
import { Reels } from "./ReelGenerator"
import { AnySimulationContext } from "./Simulation"

/**
 * A version of the Board class that is disconnected from the actual game state\
 * and operates on a copy of the game context.
 *
 * Can be used in custom game logic where you need to evaluate an additional board or reels independent of the main board,\
 * similar to the top and bottom reels of the game "San Quentin".
 */
export class StandaloneBoard {
  protected reels: Reels
  protected paddingTop: Reels
  protected paddingBottom: Reels
  protected anticipation: number[]
  protected ctx: AnySimulationContext

  constructor(opts: StandaloneBoardOpts) {
    this.reels = []
    this.paddingTop = []
    this.paddingBottom = []
    this.anticipation = []
    this.ctx = opts.ctx
  }

  /**
   * Updates the context used by this board instance.
   */
  context(ctx: AnySimulationContext) {
    this.ctx = ctx
  }

  /**
   * Resets the board to an empty state.\
   * This is called before drawing a new board.
   */
  resetBoard() {
    this.resetReels()
  }

  private makeEmptyReels() {
    return Array.from({ length: this.ctx.getCurrentGameMode().reelsAmount }, () => [])
  }

  private resetReels() {
    this.reels = this.makeEmptyReels()
    this.anticipation = Array.from(
      { length: this.ctx.getCurrentGameMode().reelsAmount },
      () => 0,
    )
    this.paddingTop = this.makeEmptyReels()
    this.paddingBottom = this.makeEmptyReels()
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

    const finalReelStops: (number | null)[] = Array.from(
      { length: this.ctx.getCurrentGameMode().reelsAmount },
      () => null,
    )

    if (forcedStops) {
      // Fill in forced stops
      for (const [r, stopPos] of Object.entries(forcedStops)) {
        const reelIdx = Number(r)
        const symCount = this.ctx.getCurrentGameMode().symbolsPerReel[reelIdx]!
        finalReelStops[reelIdx] =
          stopPos - Math.round(this.ctx.state.rng.randomFloat(0, symCount - 1))
      }
    }

    // Fill in random stops for reels without a forced stop
    for (let i = 0; i < finalReelStops.length; i++) {
      if (finalReelStops[i] === null) {
        finalReelStops[i] = Math.floor(
          this.ctx.state.rng.randomFloat(0, reels[i]!.length - 1),
        )
      }
    }

    for (let ridx = 0; ridx < this.ctx.getCurrentGameMode().reelsAmount; ridx++) {
      const reelPos = finalReelStops[ridx]!

      for (let p = this.ctx.config.padSymbols - 1; p >= 0; p--) {
        const topPos = (reelPos - (p + 1)) % reels[ridx]!.length
        this.paddingTop[ridx]!.push(reels[ridx]![topPos]!)
        const bottomPos =
          (reelPos + this.ctx.getCurrentGameMode().symbolsPerReel[ridx]! + p) %
          reels[ridx]!.length
        this.paddingBottom[ridx]!.unshift(reels[ridx]![bottomPos]!)
      }

      for (
        let row = 0;
        row < this.ctx.getCurrentGameMode().symbolsPerReel[ridx]!;
        row++
      ) {
        const symbol = reels[ridx]![(reelPos + row) % reels[ridx]!.length]

        if (!symbol) {
          throw new Error(`Failed to get symbol at pos ${reelPos + row} on reel ${ridx}`)
        }

        this.reels[ridx]![row] = symbol
      }
    }
  }
}

interface StandaloneBoardOpts {
  ctx: AnySimulationContext
}

/**
 * Extends GameState. Provides board-related functionality.
 */
export class Board<
  TGameModes extends AnyGameModes,
  TSymbols extends AnySymbols,
  TUserState extends AnyUserData,
> extends GameState<TGameModes, TSymbols, TUserState> {
  board: {
    reels: Reels
    paddingTop: Reels
    paddingBottom: Reels
    anticipation: number[]
    lastDrawnReelStops: number[]
    lastUsedReels: Reels
  }

  constructor(opts: CommonGameOptions<TGameModes, TSymbols, TUserState>) {
    super(opts)

    this.board = {
      reels: [],
      paddingTop: [],
      paddingBottom: [],
      anticipation: [],
      lastDrawnReelStops: [],
      lastUsedReels: [],
    }
  }

  /**
   * Resets the board to an empty state.\
   * This is called before drawing a new board.
   */
  resetBoard() {
    this.resetReels()
    this.board.lastDrawnReelStops = []
  }

  private makeEmptyReels() {
    return Array.from({ length: this.getCurrentGameMode().reelsAmount }, () => [])
  }

  private resetReels() {
    this.board.reels = this.makeEmptyReels()
    this.board.anticipation = Array.from(
      { length: this.getCurrentGameMode().reelsAmount },
      () => 0,
    )
    this.board.paddingTop = this.makeEmptyReels()
    this.board.paddingBottom = this.makeEmptyReels()
  }

  /**
   * Counts how many symbols matching the criteria are on a specific reel.
   */
  countSymbolsOnReel(
    symbolOrProperties: GameSymbol | Record<string, any>,
    reelIndex: number,
  ) {
    let total = 0

    for (const symbol of this.board.reels[reelIndex]!) {
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

    for (const [ridx, reel] of this.board.reels.entries()) {
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
    for (const reel of this.board.reels) {
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
    for (let ridx = 0; ridx < this.getCurrentGameMode().reelsAmount; ridx++) {
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
    const reelsAmount = this.getCurrentGameMode().reelsAmount
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
      const chosenReel = weightedRandom(weights, this.state.rng)
      const chosenStop = randomItem(reelStops[Number(chosenReel)]!, this.state.rng)
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
    const weights = this.state.currentResultSet.reelWeights
    const evalWeights = this.state.currentResultSet.reelWeights.evaluate?.(
      this as Board<any, any, any>,
    )

    let reelSetId: string = ""

    if (evalWeights) {
      reelSetId = weightedRandom(evalWeights, this.state.rng)
    } else {
      reelSetId = weightedRandom(weights[this.state.currentSpinType]!, this.state.rng)
    }

    const reelSet = this.getReelsetById(this.state.currentGameMode, reelSetId)
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

    const finalReelStops: (number | null)[] = Array.from(
      { length: this.getCurrentGameMode().reelsAmount },
      () => null,
    )

    if (forcedStops) {
      // Fill in forced stops
      for (const [r, stopPos] of Object.entries(forcedStops)) {
        const reelIdx = Number(r)
        const symCount = this.getCurrentGameMode().symbolsPerReel[reelIdx]!
        finalReelStops[reelIdx] =
          stopPos - Math.round(this.state.rng.randomFloat(0, symCount - 1))
        if (finalReelStops[reelIdx]! < 0) {
          finalReelStops[reelIdx] = reels[reelIdx]!.length + finalReelStops[reelIdx]!
        }
      }
    }

    // Fill in random stops for reels without a forced stop
    for (let i = 0; i < finalReelStops.length; i++) {
      if (finalReelStops[i] === null) {
        finalReelStops[i] = Math.floor(
          this.state.rng.randomFloat(0, reels[i]!.length - 1),
        )
      }
    }

    this.board.lastDrawnReelStops = finalReelStops.map((pos) => pos!) as number[]
    this.board.lastUsedReels = reels

    for (let ridx = 0; ridx < this.getCurrentGameMode().reelsAmount; ridx++) {
      const reelPos = finalReelStops[ridx]!

      for (let p = this.config.padSymbols - 1; p >= 0; p--) {
        const topPos = (reelPos - (p + 1)) % reels[ridx]!.length
        this.board.paddingTop[ridx]!.push(reels[ridx]![topPos]!)
        const bottomPos =
          (reelPos + this.getCurrentGameMode().symbolsPerReel[ridx]! + p) %
          reels[ridx]!.length
        this.board.paddingBottom[ridx]!.unshift(reels[ridx]![bottomPos]!)
      }

      for (let row = 0; row < this.getCurrentGameMode().symbolsPerReel[ridx]!; row++) {
        const symbol = reels[ridx]![(reelPos + row) % reels[ridx]!.length]

        if (!symbol) {
          throw new Error(`Failed to get symbol at pos ${reelPos + row} on reel ${ridx}`)
        }

        this.board.reels[ridx]![row] = symbol
      }
    }
  }

  /**
   * Tumbles the board. All given symbols will be deleted and new symbols will fall from the top.
   */
  tumbleBoard(symbolsToDelete: Array<{ reelIdx: number; rowIdx: number }>) {
    assert(
      this.board.lastDrawnReelStops.length > 0,
      "Cannot tumble board before drawing it.",
    )

    const reelsAmount = this.getCurrentGameMode().reelsAmount
    const symbolsPerReel = this.getCurrentGameMode().symbolsPerReel
    const reels = this.board.lastUsedReels

    symbolsToDelete.forEach(({ reelIdx, rowIdx }) => {
      this.board.reels[reelIdx]!.splice(rowIdx, 1)
    })

    const newFirstSymbolPositions: Record<number, number> = {}

    for (let ridx = 0; ridx < reelsAmount; ridx++) {
      // Drop down padding symbols from top
      while (this.board.reels[ridx]!.length < symbolsPerReel[ridx]!) {
        const padSymbol = this.board.paddingTop[ridx]!.pop()
        if (padSymbol) {
          this.board.reels[ridx]!.unshift(padSymbol)
        } else {
          break
        }
      }

      const previousStop = this.board.lastDrawnReelStops[ridx]!
      const stopBeforePad = previousStop - this.config.padSymbols - 1
      const symbolsNeeded = symbolsPerReel[ridx]! - this.board.reels[ridx]!.length
      // Drop rest of symbols
      for (let s = 0; s < symbolsNeeded; s++) {
        const symbolPos = (stopBeforePad - s + reels[ridx]!.length) % reels[ridx]!.length
        const newSymbol = reels[ridx]![symbolPos]

        assert(newSymbol, "Failed to get new symbol for tumbling.")

        this.board.reels[ridx]!.unshift(newSymbol)
        newFirstSymbolPositions[ridx] = symbolPos
      }
    }

    // Add new padding top symbols
    for (let ridx = 0; ridx < reelsAmount; ridx++) {
      const firstSymbolPos = newFirstSymbolPositions[ridx]!
      for (let p = 1; p <= this.config.padSymbols; p++) {
        const topPos = (firstSymbolPos - p + reels[ridx]!.length) % reels[ridx]!.length
        const padSymbol = reels[ridx]![topPos]

        assert(padSymbol, "Failed to get new padding symbol for tumbling.")

        this.board.paddingTop[ridx]!.unshift(padSymbol)
      }
    }
  }
}

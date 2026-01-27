import { GameContext } from "../game-context"
import { GameSymbol } from "../game-symbol"
import { Reels } from "../types"
import { Board } from "."
import { WinCombination } from "../win-types"

export class StandaloneBoard {
  private board: Board
  private ctx: GameContext
  private reelsAmount: number
  private symbolsPerReel: number[]
  private padSymbols: number

  constructor(opts: StandaloneBoardOptions) {
    this.board = new Board()
    this.ctx = opts.ctx
    this.reelsAmount = opts.reelsAmount
    this.symbolsPerReel = opts.symbolsPerReel
    this.padSymbols = opts.padSymbols
  }

  /**
   * Resets the board to an empty state.\
   * This is called before drawing a new board.
   */
  resetBoard() {
    this.resetReels()
    this.board.lastDrawnReelStops = []
  }

  /**
   * Gets the current reels and symbols on the board.
   */
  getBoardReels() {
    return this.board.reels
  }

  getPaddingTop() {
    return this.board.paddingTop
  }

  getPaddingBottom() {
    return this.board.paddingBottom
  }
  
  getAnticipation() {
    return this.board.anticipation
  }

  getLockedReels() {
    return this.board.reelsLocked
  }

  /**
   * Gets the symbol at the specified reel and row index.
   */
  getSymbol(reelIndex: number, rowIndex: number) {
    return this.board.getSymbol(reelIndex, rowIndex)
  }

  /**
   * Sets the symbol at the specified reel and row index.
   */
  setSymbol(reelIndex: number, rowIndex: number, symbol: GameSymbol) {
    this.board.setSymbol(reelIndex, rowIndex, symbol)
  }

  /**
   * Removes the symbol at the specified reel and row index.
   */
  removeSymbol(reelIndex: number, rowIndex: number) {
    this.board.removeSymbol(reelIndex, rowIndex)
  }

  private resetReels() {
    this.board.resetReels({
      ctx: this.ctx,
    })
  }

  /**
   * Sets the anticipation value for a specific reel.
   */
  setAnticipationForReel(reelIndex: number, value: boolean) {
    this.board.anticipation[reelIndex] = value
  }

  /**
   * Sets the locked state for a specific reel.
   */
  setReelLocked(reelIndex: number, value: boolean) {
    this.board.reelsLocked[reelIndex] = value
  }

  /**
   * Counts how many symbols matching the criteria are on a specific reel.
   */
  countSymbolsOnReel(
    symbolOrProperties: GameSymbol | Record<string, any>,
    reelIndex: number,
  ) {
    return this.board.countSymbolsOnReel(symbolOrProperties, reelIndex)
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
    return this.board.countSymbolsOnBoard(symbolOrProperties)
  }

  /**
   * Checks if a symbol appears more than once on any reel in the current reel set.
   *
   * Useful to check for "forbidden" generations, e.g. 2 scatters on one reel.
   */
  isSymbolOnAnyReelMultipleTimes(symbol: GameSymbol) {
    return this.board.isSymbolOnAnyReelMultipleTimes(symbol)
  }

  /**
   * Gets all reel stops (positions) where the specified symbol appears in the current reel set.\
   * Returns an array of arrays, where each inner array contains the positions for the corresponding reel.
   */
  getReelStopsForSymbol(reels: Reels, symbol: GameSymbol) {
    return this.board.getReelStopsForSymbol(reels, symbol)
  }

  /**
   * Combines multiple arrays of reel stops into a single array of reel stops.\
   */
  combineReelStops(...reelStops: number[][][]) {
    return this.board.combineReelStops({
      ctx: this.ctx,
      reelStops,
    })
  }

  /**
   * From a list of reel stops on reels, selects a random stop for a speficied number of random symbols.
   *
   * Mostly useful for placing scatter symbols on the board.
   */
  getRandomReelStops(reels: Reels, reelStops: number[][], amount: number) {
    return this.board.getRandomReelStops({
      ctx: this.ctx,
      reels,
      reelsAmount: this.reelsAmount,
      reelStops,
      amount,
    })
  }

  /**
   * Selects a random reel set based on the configured weights of the current result set.\
   * Returns the reels as arrays of GameSymbols.
   */
  getRandomReelset() {
    return this.board.getRandomReelset(this.ctx)
  }

  /**
   * Draws a board using specified reel stops.
   */
  drawBoardWithForcedStops(opts: {
    reels: Reels
    forcedStops: Record<string, number>
    randomOffset?: boolean
  }) {
    return this.drawBoardMixed(opts.reels, opts.forcedStops, opts.randomOffset)
  }

  /**
   * Draws a board using random reel stops.
   */
  drawBoardWithRandomStops(reels: Reels) {
    return this.drawBoardMixed(reels)
  }

  private drawBoardMixed(
    reels: Reels,
    forcedStops?: Record<string, number>,
    forcedStopsOffset?: boolean,
  ) {
    return this.board.drawBoardMixed({
      ctx: this.ctx,
      reels,
      forcedStops,
      forcedStopsOffset,
      reelsAmount: this.reelsAmount,
      symbolsPerReel: this.symbolsPerReel,
      padSymbols: this.padSymbols,
    })
  }

  /**
   * Tumbles the board. All given symbols will be deleted and new symbols will fall from the top.
   */
  tumbleBoard(symbolsToDelete: Array<{ reelIdx: number; rowIdx: number }>) {
    return this.board.tumbleBoard({
      ctx: this.ctx,
      symbolsToDelete,
      reelsAmount: this.reelsAmount,
      symbolsPerReel: this.symbolsPerReel,
      padSymbols: this.padSymbols,
    })
  }

  /**
   * **Experimental - May be changed or replaced in the future**
   * 
   * Tumbles the board normally like `tumbleBoard`, but allows specifying a different reel set to get symbols from.\
   * Also requires specifying the starting stops from where the symbols will be tumbled.\
   * **This method does not remember the last tumbled position. Use this if you need to do a singular one-off tumble.**
   */
  tumbleBoardAndForget(opts: {
    symbolsToDelete: Array<{ reelIdx: number; rowIdx: number }>
    reels: Reels
    forcedStops: number[]
  }) {
    return this.board.tumbleBoard({
      ctx: this.ctx,
      symbolsToDelete: opts.symbolsToDelete,
      reelsAmount: this.reelsAmount,
      symbolsPerReel: this.symbolsPerReel,
      padSymbols: this.padSymbols,
      reels: opts.reels,
      startingStops: opts.forcedStops,
    })
  }

  /**
   * Dedupes win symbols for tumble.\
   * Returns a list of symbols to remove from the board based on the given win combinations.
   *
   * Since it may be possible that multiple win combinations include the same symbol (e.g. Wilds),\
   * this method ensures that each symbol is only listed once for removal. Otherwise tumbling may break.
   */
  dedupeWinSymbolsForTumble(winCombinations: WinCombination[]) {
    return this.board.dedupeWinSymbolsForTumble(winCombinations)
  }

  /**
   * Sets symbolsPerReel.
   */
  setSymbolsPerReel(symbolsPerReel: number[]) {
    this.symbolsPerReel = symbolsPerReel
  }

  /**
   * Sets the reelsAmount.
   */
  setReelsAmount(reelsAmount: number) {
    this.reelsAmount = reelsAmount
  }
}

interface StandaloneBoardOptions {
  ctx: GameContext
  reelsAmount: number
  symbolsPerReel: number[]
  padSymbols: number
}

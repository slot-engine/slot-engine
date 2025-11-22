import { SPIN_TYPE } from "../constants"
import { GameContext } from "../game-context"
import { SpinType } from "../types"

export class Wallet {
  /**
   * Total win amount (as the bet multiplier) from all simulations.
   */
  protected cumulativeWins = 0
  /**
   * Total win amount (as the bet multiplier) per spin type.
   *
   * @example
   * ```ts
   * {
   *   basegame: 50,
   *   freespins: 100,
   *   superfreespins: 200,
   * }
   * ```
   */
  protected cumulativeWinsPerSpinType = {
    [SPIN_TYPE.BASE_GAME]: 0,
    [SPIN_TYPE.FREE_SPINS]: 0,
  }
  /**
   * Current win amount (as the bet multiplier) for the ongoing simulation.
   */
  protected currentWin = 0
  /**
   * Current win amount (as the bet multiplier) for the ongoing simulation per spin type.
   *
   * @example
   * ```ts
   * {
   *   basegame: 50,
   *   freespins: 100,
   *   superfreespins: 200,
   * }
   * ```
   */
  protected currentWinPerSpinType = {
    [SPIN_TYPE.BASE_GAME]: 0,
    [SPIN_TYPE.FREE_SPINS]: 0,
  }
  /**
   * Holds the current win amount for a single (free) spin.\
   * After each spin, this amount is added to `currentWinPerSpinType` and then reset to zero.
   */
  protected currentSpinWin = 0
  /**
   * Current win amount (as the bet multiplier) for the ongoing tumble sequence.
   */
  protected currentTumbleWin = 0

  constructor() {}

  /**
   * Updates the win for the current spin.
   *
   * Should be called after each tumble event, if applicable.\
   * Or generally call this to add wins during a spin.
   *
   * After each (free) spin, this amount should be added to `currentWinPerSpinType` via `confirmSpinWin()`
   */
  addSpinWin(amount: number) {
    this.currentSpinWin += amount
  }

  /**
   * Assigns a win amount to the given spin type.
   *
   * Should be called after `addSpinWin()`, and after your tumble events are played out,\
   * and after a (free) spin is played out to finalize the win.
   */
  confirmSpinWin(spinType: SpinType) {
    if (!Object.keys(this.currentWinPerSpinType).includes(spinType)) {
      throw new Error(`Spin type "${spinType}" does not exist in the wallet.`)
    }
    this.currentWinPerSpinType[spinType]! += this.currentSpinWin
    this.currentWin += this.currentSpinWin
    this.currentSpinWin = 0
    this.currentTumbleWin = 0
  }

  /**
   * Returns the accumulated win amount (as the bet multiplier) from all simulations.
   */
  getCumulativeWins() {
    return this.cumulativeWins
  }

  /**
   * Returns the accumulated win amount (as the bet multiplier) per spin type from all simulations.
   */
  getCumulativeWinsPerSpinType() {
    return this.cumulativeWinsPerSpinType
  }

  /**
   * Returns the current win amount (as the bet multiplier) for the ongoing simulation.
   */
  getCurrentWin() {
    return this.currentWin
  }

  /**
   * Returns the current win amount (as the bet multiplier) per spin type for the ongoing simulation.
   */
  getCurrentWinPerSpinType() {
    return this.currentWinPerSpinType
  }

  /**
   * Adds a win to `currentSpinWin` and `currentTumbleWin`.
   *
   * After each (free) spin, this amount should be added to `currentWinPerSpinType` via `confirmSpinWin()`
   */
  addTumbleWin(amount: number) {
    this.currentTumbleWin += amount
    this.addSpinWin(amount)
  }

  /**
   * Resets the current win amounts to zero.
   */
  resetCurrentWin() {
    this.currentWin = 0
    this.currentSpinWin = 0
    this.currentTumbleWin = 0

    for (const spinType of Object.keys(this.currentWinPerSpinType)) {
      this.currentWinPerSpinType[spinType as SpinType] = 0
    }
  }

  /**
   * Adds current wins to cumulative wins and resets current wins to zero.
   */
  confirmWins(ctx: GameContext) {
    function process(number: number) {
      return Math.round(Math.min(number, ctx.config.maxWinX) * 100) / 100
    }

    this.currentWin = process(this.currentWin)
    this.cumulativeWins += this.currentWin
    let spinTypeWins = 0

    for (const spinType of Object.keys(this.currentWinPerSpinType)) {
      const st = spinType as SpinType
      const spinTypeWin = process(this.currentWinPerSpinType[st])
      this.cumulativeWinsPerSpinType[st]! += spinTypeWin
      spinTypeWins += spinTypeWin
    }

    if (process(spinTypeWins) !== this.currentWin) {
      throw new Error(
        `Inconsistent wallet state: currentWin (${this.currentWin}) does not equal spinTypeWins (${spinTypeWins}).`,
      )
    }

    this.resetCurrentWin()
  }

  /**
   * Intended for internal use only.
   *
   * Transfers the win data from the given wallet to the calling book.
   */
  writePayoutToBook(ctx: GameContext) {
    function process(number: number) {
      return Math.round(Math.min(number, ctx.config.maxWinX) * 100) / 100
    }

    const wallet = ctx.services.wallet._getWallet()
    const book = ctx.services.data._getBook()

    book.payout = Math.round(process(wallet.getCurrentWin()) * 100)
    book.basegameWins = process(
      wallet.getCurrentWinPerSpinType()[SPIN_TYPE.BASE_GAME] || 0,
    )
    book.freespinsWins = process(
      wallet.getCurrentWinPerSpinType()[SPIN_TYPE.FREE_SPINS] || 0,
    )
  }

  /**
   * Intended for internal use only.
   */
  serialize() {
    return {
      cumulativeWins: this.cumulativeWins,
      cumulativeWinsPerSpinType: this.cumulativeWinsPerSpinType,
      currentWin: this.currentWin,
      currentWinPerSpinType: this.currentWinPerSpinType,
      currentSpinWin: this.currentSpinWin,
      currentTumbleWin: this.currentTumbleWin,
    }
  }

  /**
   * Intended for internal use only.
   */
  merge(wallet: Wallet) {
    this.cumulativeWins += wallet.getCumulativeWins()
    const otherWinsPerSpinType = wallet.getCumulativeWinsPerSpinType()

    for (const spinType of Object.keys(this.cumulativeWinsPerSpinType)) {
      this.cumulativeWinsPerSpinType[spinType as SpinType]! +=
        otherWinsPerSpinType[spinType as SpinType] || 0
    }
  }

  /**
   * Intended for internal use only.
   */
  mergeSerialized(data: ReturnType<Wallet["serialize"]>) {
    this.cumulativeWins += data.cumulativeWins
    for (const spinType of Object.keys(this.cumulativeWinsPerSpinType)) {
      this.cumulativeWinsPerSpinType[spinType as SpinType]! +=
        data.cumulativeWinsPerSpinType[spinType as SpinType] || 0
    }
    this.currentWin += data.currentWin
    this.currentSpinWin += data.currentSpinWin
    this.currentTumbleWin += data.currentTumbleWin
    for (const spinType of Object.keys(this.currentWinPerSpinType)) {
      this.currentWinPerSpinType[spinType as SpinType]! +=
        data.currentWinPerSpinType[spinType as SpinType] || 0
    }
  }
}

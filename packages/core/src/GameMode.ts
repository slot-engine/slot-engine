import { type ReelGenerator } from "./ReelGenerator"
import { type ResultSet } from "./ResultSet"

export class GameMode {
  name: GameModeName
  reelsAmount: number
  symbolsPerReel: number[]
  cost: number
  rtp: number
  reelSets: ReelGenerator[]
  resultSets: ResultSet<any>[]
  isBonusBuy: boolean

  constructor(opts: GameModeOpts) {
    this.name = opts.name
    this.reelsAmount = opts.reelsAmount
    this.symbolsPerReel = opts.symbolsPerReel
    this.cost = opts.cost
    this.rtp = opts.rtp
    this.reelSets = opts.reelSets
    this.resultSets = opts.resultSets
    this.isBonusBuy = opts.isBonusBuy

    if (this.symbolsPerReel.length !== this.reelsAmount) {
      throw new Error(
        `symbolsPerReel length (${this.symbolsPerReel.length}) must match reelsAmount (${this.reelsAmount}).`,
      )
    }

    if (this.resultSets.length == 0) {
      throw new Error("GameMode must have at least one ResultSet defined.")
    }
  }
}

export interface GameModeOpts {
  /**
   * Name of the game mode.
   */
  name: GameModeName
  /**
   * Number of reels the board has.
   */
  reelsAmount: number
  /**
   * How many symbols each reel has. Array length must match `reelsAmount`.\
   * The number at an array index represents the number of symbols on that reel.
   */
  symbolsPerReel: number[]
  /**
   * Cost of the game mode, multiplied by the base bet.
   */
  cost: number
  /**
   * The target RTP of the game.
   */
  rtp: number
  /**
   * Defines and generates all reels for the game.\
   * Which reels are used in a spin is determined by the ResultSet of the current game mode.
   *
   * It is common to have one reel set for the base game and another for free spins.\
   * Each `ResultSet` can then set the weights of these reel sets to control which\
   * reel set is used for a specific criteria.
   *
   * The generator can be adjusted to match the reels to your games needs.
   */
  reelSets: ReelGenerator[]
  /**
   * A ResultSet defines how often a specific outcome should be generated.\
   * For example, a ResultSet can be used to force a specific ratio of max wins\
   * in the simulations to ensure there are different frontend representations.
   */
  resultSets: ResultSet<any>[]
  /**
   * Whether this game mode is a bonus buy.
   */
  isBonusBuy: boolean
}

export type GameModeName =
  | "base"
  | "base-extra-chance-2x"
  | "base-extra-chance-10x"
  | "bonus"
  | string

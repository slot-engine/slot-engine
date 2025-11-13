import { RandomNumberGenerator } from "../service/rng"
import { Reels } from "../types"
export { GeneratedReelSet } from "./GeneratedReelSet"
export { StaticReelSet } from "./StaticReelSet"

export class ReelSet {
  id: string
  associatedGameModeName: string
  reels: Reels
  protected rng: RandomNumberGenerator

  constructor(opts: ReelSetOptions) {
    this.id = opts.id
    this.associatedGameModeName = ""
    this.reels = []
    this.rng = new RandomNumberGenerator()
    this.rng.setSeed(opts.seed ?? 0)
  }
}

export interface ReelSetOptions {
  /**
   * The unique identifier of the reel generator.\
   * Must be unique per game mode.
   */
  id: string
  /**
   * Optional seed for the RNG to ensure reproducible results.
   *
   * Default seed is `0`.
   *
   * Note: Seeds 0 and 1 produce the same results.
   */
  seed?: number
}

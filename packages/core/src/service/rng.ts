import { AbstractService } from "."
import { RandomNumberGenerator } from "../rng"
import { GameContext } from "../game-context"
import { AnyGameModes, AnySymbols, AnyUserData } from "../types"

export class RngService<
  TGameModes extends AnyGameModes = AnyGameModes,
  TSymbols extends AnySymbols = AnySymbols,
  TUserState extends AnyUserData = AnyUserData,
> extends AbstractService {
  protected rng = new RandomNumberGenerator()

  constructor(ctx: () => GameContext<TGameModes, TSymbols, TUserState>) {
    // @ts-ignore TODO: Fix type errors with AnyTypes
    super(ctx)
  }

  /**
   * Random weighted selection from a set of items.
   */
  weightedRandom = this.rng.weightedRandom.bind(this.rng)

  /**
   * Selects a random item from an array.
   */
  randomItem = this.rng.randomItem.bind(this.rng)

  /**
   * Shuffles an array.
   */
  shuffle = this.rng.shuffle.bind(this.rng)

  /**
   * Generates a random float between two values.
   */
  randomFloat = this.rng.randomFloat.bind(this.rng)

  /**
   * Sets the seed for the RNG.
   */
  setSeedIfDifferent = this.rng.setSeedIfDifferent.bind(this.rng)
}

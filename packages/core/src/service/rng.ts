import { AbstractService } from "."
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
  weightedRandom<T extends Record<string, number>>(weights: T) {
    const totalWeight = Object.values(weights).reduce(
      (sum: number, weight) => sum + (weight as number),
      0,
    )
    const randomValue = this.rng.randomFloat(0, 1) * totalWeight

    let cumulativeWeight = 0
    for (const [key, weight] of Object.entries(weights)) {
      cumulativeWeight += weight as number
      if (randomValue < cumulativeWeight) {
        return key
      }
    }

    throw new Error("No item selected in weighted random selection.")
  }

  /**
   * Selects a random item from an array.
   */
  randomItem<T>(array: T[]) {
    if (array.length === 0) {
      throw new Error("Cannot select a random item from an empty array.")
    }
    const randomIndex = Math.floor(this.rng.randomFloat(0, 1) * array.length)
    return array[randomIndex]!
  }

  /**
   * Shuffles an array.
   */
  shuffle<T>(array: T[]): T[] {
    const newArray = [...array]
    let currentIndex = newArray.length,
      randomIndex

    while (currentIndex != 0) {
      randomIndex = Math.floor(this.rng.randomFloat(0, 1) * currentIndex)
      currentIndex--
      ;[newArray[currentIndex] as any, newArray[randomIndex] as any] = [
        newArray[randomIndex],
        newArray[currentIndex],
      ]
    }

    return newArray
  }

  /**
   * Generates a random float between two values.
   */
  randomFloat = this.rng.randomFloat.bind(this.rng)

  /**
   * Sets the seed for the RNG.
   */
  setSeedIfDifferent = this.rng.setSeedIfDifferent.bind(this.rng)
}

class RandomNumberGenerator {
  mIdum: number
  mIy: number
  mIv: Array<number>
  NTAB: number
  IA: number
  IM: number
  IQ: number
  IR: number
  NDIV: number
  AM: number
  RNMX: number

  protected _currentSeed: number = 0

  constructor() {
    this.mIdum = 0
    this.mIy = 0
    this.mIv = []

    this.NTAB = 32
    this.IA = 16807
    this.IM = 2147483647
    this.IQ = 127773
    this.IR = 2836
    this.NDIV = 1 + (this.IM - 1) / this.NTAB
    this.AM = 1.0 / this.IM
    this.RNMX = 1.0 - 1.2e-7
  }

  getCurrentSeed() {
    return this._currentSeed
  }

  protected setCurrentSeed(seed: number) {
    this._currentSeed = seed
  }

  setSeed(seed: number): void {
    this.mIdum = seed
    this.setCurrentSeed(seed)

    if (seed >= 0) {
      this.mIdum = -seed
    }

    this.mIy = 0
  }

  setSeedIfDifferent(seed: number) {
    if (this.getCurrentSeed() !== seed) {
      this.setSeed(seed)
    }
  }

  generateRandomNumber(): number {
    let k: number
    let j: number

    if (this.mIdum <= 0 || this.mIy === 0) {
      if (-this.mIdum < 1) {
        this.mIdum = 1
      } else {
        this.mIdum = -this.mIdum
      }

      for (j = this.NTAB + 7; j >= 0; j -= 1) {
        k = Math.floor(this.mIdum / this.IQ)
        this.mIdum = Math.floor(this.IA * (this.mIdum - k * this.IQ) - this.IR * k)

        if (this.mIdum < 0) {
          this.mIdum += this.IM
        }

        if (j < this.NTAB) {
          this.mIv[j] = this.mIdum
        }
      }

      ;[this.mIy as any] = this.mIv
    }

    k = Math.floor(this.mIdum / this.IQ)
    this.mIdum = Math.floor(this.IA * (this.mIdum - k * this.IQ) - this.IR * k)

    if (this.mIdum < 0) {
      this.mIdum += this.IM
    }

    j = Math.floor(this.mIy / this.NDIV)

    this.mIy = Math.floor(this.mIv[j] as any)
    this.mIv[j] = this.mIdum

    return this.mIy
  }

  randomFloat(low: number, high: number): number {
    let float: number = this.AM * this.generateRandomNumber()

    if (float > this.RNMX) {
      float = this.RNMX
    }

    return float * (high - low) + low
  }
}

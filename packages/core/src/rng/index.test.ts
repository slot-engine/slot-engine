import { describe, expect, it } from "vitest"
import { RandomNumberGenerator } from "."

function seeded(seed: number) {
  const rng = new RandomNumberGenerator()
  rng.setSeed(seed)
  return rng
}

function seededWithFormulaBefore04(seed: number) {
  const rng = new RandomNumberGenerator()
  rng.mIdum = -seed
  rng.mIy = 0
  return rng
}

function stream(rng: RandomNumberGenerator, length: number) {
  return Array.from({ length }, () => rng.generateRandomNumber())
}

describe("RandomNumberGenerator seeding", () => {
  it("gives seeds 0 and 1 different streams", () => {
    expect(seeded(0).generateRandomNumber()).not.toBe(seeded(1).generateRandomNumber())
    expect(stream(seeded(0), 20)).not.toEqual(stream(seeded(1), 20))
  })

  it("gives seeds 0 to 999 pairwise distinct first values", () => {
    const firstValues = Array.from({ length: 1000 }, (_, seed) =>
      seeded(seed).generateRandomNumber(),
    )
    expect(new Set(firstValues).size).toBe(1000)
  })

  it("plays the stream that seed + 1 played before 0.4", () => {
    for (const seed of [0, 1, 2, 41, 999, 123_456]) {
      expect(stream(seeded(seed), 20)).toEqual(
        stream(seededWithFormulaBefore04(seed + 1), 20),
      )
    }
  })

  it("keeps the stream of seed 0, the default of reel sets", () => {
    expect(stream(seeded(0), 20)).toEqual(stream(seededWithFormulaBefore04(0), 20))
  })

  it("seeds an RNG that has no seed yet on setSeedIfDifferent(0)", () => {
    const rng = new RandomNumberGenerator()
    expect(rng.getCurrentSeed()).toBeNull()
    stream(rng, 5)

    rng.setSeedIfDifferent(0)

    expect(rng.getCurrentSeed()).toBe(0)
    expect(stream(rng, 20)).toEqual(stream(seeded(0), 20))
  })

  it("continues the stream on setSeedIfDifferent with the current seed", () => {
    const rng = seeded(7)
    const first = rng.generateRandomNumber()

    rng.setSeedIfDifferent(7)

    expect([first, rng.generateRandomNumber()]).toEqual(stream(seeded(7), 2))
  })

  it("round-trips a missing seed through a state snapshot", () => {
    const fresh = new RandomNumberGenerator()
    const snapshot = fresh.getStateSnapshot()
    expect(snapshot.currentSeed).toBeNull()

    const rng = seeded(3)
    rng.restoreStateSnapshot(snapshot)

    expect(rng.getCurrentSeed()).toBeNull()
    expect(stream(rng, 20)).toEqual(stream(fresh, 20))
  })
})

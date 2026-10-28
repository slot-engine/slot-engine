import { describe, it, expect } from "vitest"
import { computePayoutStatistics } from "./payout-ranges"
import type { LookupTable, LookupTableSegmented } from "../types"

const segmented: LookupTableSegmented = [
  [1, "0", 0, 0],
  [2, "basegame", 0.5, 0],
  [3, "basegame", 1, 0],
  [4, "freespins", 0.5, 0.5],
  [5, "freespins", 0, 1.5],
  [6, "freespins", 20, 30],
  [7, "maxwin", 0, 100000],
]

const published: LookupTable = [
  [1, 50, 0],
  [2, 20, 50],
  [3, 10, 100],
  [4, 8, 100],
  [5, 2, 150],
  [6, 9, 5000],
  [7, 1, 10000000],
]

const sum = (values: Record<string, number>) =>
  Object.values(values).reduce((total, value) => total + value, 0)

describe("computePayoutStatistics", () => {
  it("weights each range by the published lookup table", () => {
    const { payoutChances } = computePayoutStatistics("base", segmented, published)

    expect(payoutChances.overall).toEqual({
      "0-0.1": 0.5,
      "0-0.99": 0.2,
      "1-1.99": 0.2,
      "50-99.99": 0.09,
      "100000-Infinity": 0.01,
    })
    expect(sum(payoutChances.overall)).toBeCloseTo(1, 12)
  })

  it("splits each range's chance across criteria without conditioning on them", () => {
    const { payoutChances } = computePayoutStatistics("base", segmented, published)

    for (const [rangeKey, chance] of Object.entries(payoutChances.overall)) {
      const criteriaChances = Object.values(payoutChances.criteria).map(
        (ranges) => ranges[rangeKey] ?? 0,
      )
      expect(criteriaChances.reduce((total, value) => total + value, 0)).toBeCloseTo(
        chance,
        12,
      )
    }
    expect(payoutChances.criteria["freespins"]).toEqual({
      "1-1.99": 0.1,
      "50-99.99": 0.09,
    })
  })

  it("counts a zero-weight book as an occurrence without adding chance", () => {
    const withZeroWeight: LookupTable = published.map(([bookId, weight, payout]) =>
      bookId === 6 ? [bookId, 0, payout] : [bookId, weight, payout],
    )

    const stats = computePayoutStatistics("base", segmented, withZeroWeight)

    expect(stats.allPayouts.overall["50-99.99"]).toBe(1)
    expect(stats.payoutChances.overall["50-99.99"]).toBe(0)
    expect(sum(stats.payoutChances.overall)).toBeCloseTo(1, 12)
  })

  it("treats a book missing from the published table as weight 0", () => {
    const stats = computePayoutStatistics(
      "base",
      [...segmented, [8, "basegame", 15, 0]],
      published,
    )

    expect(stats.allPayouts.overall["10-19.99"]).toBe(1)
    expect(stats.payoutChances.overall["10-19.99"]).toBe(0)
    expect(sum(stats.payoutChances.overall)).toBeCloseTo(1, 12)
  })

  it("orders range keys by range start regardless of row order", () => {
    const shuffled: LookupTableSegmented = [
      [1, "basegame", 50, 0],
      [2, "basegame", 0, 0],
      [3, "basegame", 2, 0],
      [4, "basegame", 1000, 0],
      [5, "basegame", 1, 0],
    ]
    const weights: LookupTable = shuffled.map(([bookId]) => [bookId, 1, 0])
    const expected = ["0-0.1", "1-1.99", "2-2.99", "50-99.99", "1000-1999.99"]

    const stats = computePayoutStatistics("base", shuffled, weights)

    for (const breakdown of [
      stats.allPayouts,
      stats.uniquePayouts,
      stats.payoutChances,
    ]) {
      expect(Object.keys(breakdown.overall)).toEqual(expected)
      expect(Object.keys(breakdown.criteria["basegame"] ?? {})).toEqual(expected)
    }
  })

  it.each([
    [0, "0-0.1"],
    [0.5, "0-0.99"],
    [1, "1-1.99"],
    [1.99, "1-1.99"],
    [100000, "100000-Infinity"],
  ])("puts payout %d into range %s", (payout, rangeKey) => {
    const stats = computePayoutStatistics(
      "base",
      [[1, "basegame", payout, 0]],
      [[1, 1, payout * 100]],
    )

    expect(stats.allPayouts.overall).toEqual({ [rangeKey]: 1 })
  })

  it("counts distinct payout values per range", () => {
    const repeated: LookupTableSegmented = [
      [1, "basegame", 1, 0],
      [2, "basegame", 1, 0],
      [3, "freespins", 0.5, 0.5],
      [4, "freespins", 1.5, 0],
    ]

    const stats = computePayoutStatistics("base", repeated, [])

    expect(stats.allPayouts.overall).toEqual({ "1-1.99": 4 })
    expect(stats.uniquePayouts.overall).toEqual({ "1-1.99": 2 })
    expect(stats.uniquePayouts.criteria).toEqual({
      basegame: { "1-1.99": 1 },
      freespins: { "1-1.99": 2 },
    })
  })

  it("reports zero chances when the published table has no weight", () => {
    const weightless: LookupTable = published.map(([bookId, , payout]) => [
      bookId,
      0,
      payout,
    ])

    const { payoutChances } = computePayoutStatistics("base", segmented, weightless)

    const chances = [
      ...Object.values(payoutChances.overall),
      ...Object.values(payoutChances.criteria).flatMap((ranges) => Object.values(ranges)),
    ]
    expect(chances).toHaveLength(11)
    expect(chances.every((chance) => chance === 0)).toBe(true)
  })
})

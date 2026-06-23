import { describe, it, expect } from "vitest"
import {
  PayoutGroup,
  InfeasibleError,
  tiltedMean,
  tiltedDistribution,
  solveTilt,
  achievableRange,
} from "./solver"

function makeGroup(xs: number[], ms: number[]): PayoutGroup {
  return { xs: new Float64Array(xs), ms: new Float64Array(ms) }
}

describe("tiltedMean", () => {
  it("equals the prior mean at mu = 0", () => {
    const group = makeGroup([0, 1, 2, 10], [1, 2, 3, 4])
    const expected = (0 * 1 + 1 * 2 + 2 * 3 + 10 * 4) / 10
    expect(tiltedMean(group, 0)).toBeCloseTo(expected, 12)
  })

  it("decreases as mu increases", () => {
    const group = makeGroup([1, 5, 50], [1, 1, 1])
    expect(tiltedMean(group, 1)).toBeLessThan(tiltedMean(group, 0))
    expect(tiltedMean(group, 0)).toBeLessThan(tiltedMean(group, -1))
  })

  it("is numerically stable for large payouts", () => {
    const group = makeGroup([0, 5000], [1, 1])
    expect(tiltedMean(group, 0.01)).toBeGreaterThan(0)
    expect(tiltedMean(group, -0.01)).toBeLessThanOrEqual(5000)
    expect(Number.isFinite(tiltedMean(group, 1))).toBe(true)
    expect(Number.isFinite(tiltedMean(group, -1))).toBe(true)
  })
})

describe("solveTilt", () => {
  it("returns mu = 0 when the target equals the prior mean", () => {
    const group = makeGroup([1, 2, 3], [1, 1, 1])
    const mu = solveTilt([{ group, p: 1 }], 2)
    expect(mu).toBeCloseTo(0, 8)
  })

  it("finds a tilt that achieves a lower mean", () => {
    const group = makeGroup([0.5, 1, 5, 20, 100], [10, 10, 5, 2, 1])
    const target = 1.2
    const mu = solveTilt([{ group, p: 1 }], target)
    expect(tiltedMean(group, mu)).toBeCloseTo(target, 8)
    expect(mu).toBeGreaterThan(0)
  })

  it("finds a tilt that achieves a higher mean", () => {
    const group = makeGroup([0.5, 1, 5, 20, 100], [10, 10, 5, 2, 1])
    const target = 50
    const mu = solveTilt([{ group, p: 1 }], target)
    expect(tiltedMean(group, mu)).toBeCloseTo(target, 6)
    expect(mu).toBeLessThan(0)
  })

  it("solves a combined target across multiple groups", () => {
    const a = makeGroup([1, 2, 10], [5, 3, 1])
    const b = makeGroup([5, 50, 500], [10, 4, 1])
    const groups = [
      { group: a, p: 0.5 },
      { group: b, p: 0.01 },
    ]
    const [min, max] = achievableRange(groups)
    const target = (min + max) / 3
    const mu = solveTilt(groups, target)
    const achieved = 0.5 * tiltedMean(a, mu) + 0.01 * tiltedMean(b, mu)
    expect(achieved).toBeCloseTo(target, 8)
  })

  it("throws InfeasibleError when the target is out of range", () => {
    const group = makeGroup([1, 2, 3], [1, 1, 1])
    expect(() => solveTilt([{ group, p: 1 }], 5)).toThrow(InfeasibleError)
    expect(() => solveTilt([{ group, p: 1 }], 0.5)).toThrow(InfeasibleError)
  })

  it("handles constant groups (single unique payout)", () => {
    const group = makeGroup([5000], [123])
    expect(solveTilt([{ group, p: 1 }], 5000)).toBe(0)
    expect(() => solveTilt([{ group, p: 1 }], 4000)).toThrow(InfeasibleError)
  })
})

describe("tiltedDistribution", () => {
  it("sums to p and matches the tilted mean", () => {
    const group = makeGroup([0.5, 1, 5, 20, 100], [10, 10, 5, 2, 1])
    const mu = solveTilt([{ group, p: 1 }], 3)
    const q = tiltedDistribution(group, mu, 0.25)

    let sum = 0
    let mean = 0
    for (let i = 0; i < q.length; i++) {
      sum += q[i]!
      mean += q[i]! * group.xs[i]!
    }
    expect(sum).toBeCloseTo(0.25, 12)
    expect(mean / sum).toBeCloseTo(3, 8)
  })

  it("preserves the prior shape at mu = 0", () => {
    const group = makeGroup([1, 2, 3], [1, 2, 7])
    const q = tiltedDistribution(group, 0, 1)
    expect(q[0]).toBeCloseTo(0.1, 12)
    expect(q[1]).toBeCloseTo(0.2, 12)
    expect(q[2]).toBeCloseTo(0.7, 12)
  })
})

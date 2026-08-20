import { describe, expect, it } from "vitest"
import { ResultSet, toPayoutCents } from "./index"
import { SPIN_TYPE } from "../constants"

const reelWeights = {
  [SPIN_TYPE.BASE_GAME]: { base: 1 },
  [SPIN_TYPE.FREE_SPINS]: { bonus: 1 },
}

function mockSim(simNums: number, quotas: Array<{ criteria: string; quota: number }>) {
  return {
    simRunsAmount: { base: simNums },
    gameConfig: {
      gameModes: {
        base: {
          resultSets: quotas.map(
            (q) =>
              new ResultSet({
                criteria: q.criteria,
                quota: q.quota,
                reelWeights,
              }),
          ),
        },
      },
    },
  } as any
}

describe("toPayoutCents", () => {
  it("rounds wallet float noise to Stake book cent units", () => {
    expect(toPayoutCents(5)).toBe(500)
    expect(toPayoutCents(5.0000000002)).toBe(500)
    expect(toPayoutCents(4.9999999998)).toBe(500)
    expect(toPayoutCents(0)).toBe(0)
    expect(toPayoutCents(0.004)).toBe(0)
    expect(toPayoutCents(0.005)).toBe(1)
  })

  it("makes exact multiplier criteria comparable after float accumulation", () => {
    // Classic IEEE failure mode that wallet line-sum noise hits in practice
    const noisy = 0.1 + 0.2
    expect(noisy === 0.3).toBe(false)
    expect(toPayoutCents(noisy)).toBe(toPayoutCents(0.3))
  })
})

describe("ResultSet.getNumberOfSimsForCriteria", () => {
  it("allocates exactly simRuns and prefers ≥1 per ResultSet", () => {
    const counts = ResultSet.getNumberOfSimsForCriteria(
      mockSim(100, [
        { criteria: "0", quota: 0.4 },
        { criteria: "basegame", quota: 0.4 },
        { criteria: "freespins", quota: 0.195 },
        { criteria: "maxwin", quota: 0.005 },
      ]),
      "base",
    )
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(100)
    expect(counts.maxwin).toBeGreaterThanOrEqual(1)
    expect(counts["0"]).toBeGreaterThanOrEqual(1)
  })

  it("fails fast when ResultSets outnumber simulations (no hang)", () => {
    expect(() =>
      ResultSet.getNumberOfSimsForCriteria(
        mockSim(2, [
          { criteria: "a", quota: 1 },
          { criteria: "b", quota: 1 },
          { criteria: "c", quota: 1 },
        ]),
        "base",
      ),
    ).toThrow(/only 2 simulations/)
  })
})

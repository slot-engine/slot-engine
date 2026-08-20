import { describe, expect, it } from "vitest"
import { toPayoutCents } from "./index"

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

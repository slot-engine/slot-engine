import { describe, expect, it } from "vitest"
import { getMaxwinHitrate } from "./utils"

describe("getMaxwinHitrate", () => {
  it("returns Infinity when the max pay has zero weight (no NaN)", () => {
    const rate = getMaxwinHitrate({ 0: 0.9, 5: 0.1, 5000: 0 })
    expect(rate).toBe(Infinity)
    expect(Number.isNaN(rate)).toBe(false)
  })

  it("returns 1-in-N when max pay has weight", () => {
    // Normalized weights: max 5000 has 0.01 → 1/0.01 = 100
    expect(getMaxwinHitrate({ 0: 0.5, 10: 0.49, 5000: 0.01 })).toBe(100)
  })
})

import { describe, expect, it } from "vitest"
import { suggestOptimizationTargets } from "./suggest"

describe("suggestOptimizationTargets", () => {
  it("uses 0 as absorber and pins maxwin hitRate", () => {
    const targets = suggestOptimizationTargets({
      criteriaBookCounts: { "0": 400, basegame: 400, freespins: 190, maxwin: 10 },
      maxWinX: 5000,
    })
    expect(targets["0"]).toEqual({})
    expect(targets.maxwin?.hitRate).toBeGreaterThanOrEqual(10_000)
    expect(targets.basegame?.hitRate).toBeGreaterThan(1)
    expect(targets.freespins?.hitRate).toBeGreaterThan(targets.basegame!.hitRate!)
  })
})

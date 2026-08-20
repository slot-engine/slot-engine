import { describe, expect, it } from "vitest"
import {
  assertLookupIdsSequential,
  retryBudgetForResultSet,
  retrySeed,
  splitCountsAcrossChunks,
} from "./utils"
import fs from "fs"
import os from "os"
import path from "path"

describe("splitCountsAcrossChunks", () => {
  it("uses largest-remainder (pre-floor fractions) for leftover counts", () => {
    // criteria a count=7 across sizes [5,10] (filler makes totals match):
    // raw [2.333, 4.666] → floor [2,4] +1 to larger frac → [2,5]
    const perChunk = splitCountsAcrossChunks({ a: 7, filler: 8 }, [5, 10])
    expect(perChunk.map((c) => c.a)).toEqual([2, 5])
    expect(perChunk[0]!.a! + perChunk[1]!.a!).toBe(7)
  })

  it("preserves criteria totals and chunk sizes", () => {
    const perChunk = splitCountsAcrossChunks({ a: 10, b: 5 }, [7, 8])
    expect(perChunk.reduce((s, c) => s + (c.a ?? 0), 0)).toBe(10)
    expect(perChunk.reduce((s, c) => s + (c.b ?? 0), 0)).toBe(5)
    expect(Object.values(perChunk[0]!).reduce((a, b) => a + b, 0)).toBe(7)
    expect(Object.values(perChunk[1]!).reduce((a, b) => a + b, 0)).toBe(8)
  })
})

describe("retrySeed / retryBudget", () => {
  it("keeps attempt 0 on simId and diverges retries", () => {
    expect(retrySeed(42, 0)).toBe(42)
    expect(retrySeed(42, 1)).not.toBe(42)
    expect(retrySeed(42, 1)).toBe(retrySeed(42, 1))
  })

  it("gives exact multipliers a tighter budget than forceMaxWin", () => {
    expect(retryBudgetForResultSet({ multiplier: 5 })).toBeLessThan(
      retryBudgetForResultSet({ forceMaxWin: true }),
    )
  })
})

describe("assertLookupIdsSequential", () => {
  it("rejects gaps", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lut-"))
    const p = path.join(dir, "lut.csv")
    fs.writeFileSync(p, "1,1,0\n3,1,100\n")
    expect(() => assertLookupIdsSequential(p, "base")).toThrow(/contiguous/)
  })
})


describe("splitCountsAcrossChunks", () => {
  it("uses largest-remainder (pre-floor fractions) for leftover counts", () => {
    // criteria a count=7 across sizes [5,10] (filler makes totals match):
    // raw [2.333, 4.666] → floor [2,4] +1 to larger frac → [2,5]
    const perChunk = splitCountsAcrossChunks({ a: 7, filler: 8 }, [5, 10])
    expect(perChunk.map((c) => c.a)).toEqual([2, 5])
    expect(perChunk[0]!.a! + perChunk[1]!.a!).toBe(7)
  })

  it("preserves criteria totals and chunk sizes", () => {
    const perChunk = splitCountsAcrossChunks({ a: 10, b: 5 }, [7, 8])
    expect(perChunk.reduce((s, c) => s + (c.a ?? 0), 0)).toBe(10)
    expect(perChunk.reduce((s, c) => s + (c.b ?? 0), 0)).toBe(5)
    expect(Object.values(perChunk[0]!).reduce((a, b) => a + b, 0)).toBe(7)
    expect(Object.values(perChunk[1]!).reduce((a, b) => a + b, 0)).toBe(8)
  })
})

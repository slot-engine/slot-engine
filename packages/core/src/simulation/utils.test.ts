import { describe, expect, it } from "vitest"
import { splitCountsAcrossChunks } from "./utils"

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

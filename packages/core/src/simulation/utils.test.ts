import { describe, expect, it } from "vitest"
import { getSimRangesForChunks } from "./utils"

describe("getSimRangesForChunks", () => {
  it("starts at 0 and splits the remainder across the first chunks", () => {
    expect(getSimRangesForChunks(10, 3)).toEqual([
      [0, 3],
      [4, 6],
      [7, 9],
    ])
  })

  it("uses one chunk when there are fewer sims than chunks", () => {
    expect(getSimRangesForChunks(1, 8)).toEqual([[0, 0]])
  })

  it("returns one empty range for zero sims", () => {
    const sizes = getSimRangesForChunks(0, 4).map(([start, end]) => end - start + 1)
    expect(sizes).toEqual([0])
  })
})

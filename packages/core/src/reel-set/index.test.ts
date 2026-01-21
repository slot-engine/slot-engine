import { describe, it, expect } from "vitest"
import { createTestContext } from "../game-context"
import { GameSymbol } from "../game-symbol"
import { StaticReelSet } from "../reel-set/StaticReelSet"
import { GameMode } from "../game-mode"
import path from "path"

const A = new GameSymbol({ id: "A" })
const B = new GameSymbol({ id: "B" })
const C = new GameSymbol({ id: "C" })
const D = new GameSymbol({ id: "D" })
const E = new GameSymbol({ id: "E" })
const F = new GameSymbol({ id: "F" })

let ctx = createTestContext({
  symbols: {
    A,
    B,
    C,
    D,
    E,
    F,
  },
  gameModes: {
    base: new GameMode({
      name: "base",
      reelsAmount: 6,
      symbolsPerReel: [5, 5, 5, 5, 5, 5],
      cost: 1,
      reelSets: [
        new StaticReelSet({
          id: "placeholder",
          reels: [],
        }),
      ],
      resultSets: [],
      rtp: 0.9,
      isBonusBuy: false,
    }),
  },
})

describe("StaticReelSet", () => {
  it("builds even reels correctly", () => {
    const reelset = new StaticReelSet({
      id: "test",
      csvPath: path.join(__dirname, "__fixtures__", "test-reels-even.csv"),
    })
    reelset.associatedGameModeName = "base"
    reelset.generateReels(ctx.config)

    expect(reelset.reels).toEqual([
      [A, A, A, A, A, A, A, A],
      [B, B, B, B, B, B, B, B],
      [C, C, C, C, C, C, C, C],
      [D, D, D, D, D, D, D, D],
      [E, E, E, E, E, E, E, E],
      [F, F, F, F, F, F, F, F],
    ])
  })

  it("builds uneven reels correctly", () => {
    const reelset = new StaticReelSet({
      id: "test",
      csvPath: path.join(__dirname, "__fixtures__", "test-reels-uneven.csv"),
    })
    reelset.associatedGameModeName = "base"
    reelset.generateReels(ctx.config)

    expect(reelset.reels).toEqual([
      [A, A, A, A, A, A, A, A],
      [B, B, B, B, B, B],
      [C, C, C, C, C, C, C],
      [D, D, D, D, D, D, D, D],
      [E, E, E, E, E, E],
      [F, F, F, F, F, F, F],
    ])
  })
})

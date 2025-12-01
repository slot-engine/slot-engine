import { describe, it, expect } from "vitest"
import { createTestContext } from "../game-context"
import { Reels } from "../types"
import { GameSymbol } from "../game-symbol"
import { ManywaysWinType } from "./ManywaysWinType"

const ctx = createTestContext({
  gameModes: {
    base: {
      name: "base",
      reelsAmount: 5,
      symbolsPerReel: [3, 3, 3, 3, 3],
      cost: 1,
      reelSets: [],
      resultSets: [],
      rtp: 1,
      isBonusBuy: false,
    },
  },
})

describe("ManywaysWinType", () => {
  let reels: Reels
  ctx.state.currentGameMode = "base"

  const pays = {
    3: 0.5,
    4: 1,
    5: 2,
  }

  const paysHigher = {
    3: 1,
    4: 3,
    5: 5,
  }

  const W = new GameSymbol({
    id: "W",
    properties: { isWild: true },
    pays: paysHigher,
  })

  const A = new GameSymbol({
    id: "A",
    pays,
  })

  const B = new GameSymbol({
    id: "B",
    pays,
  })

  const C = new GameSymbol({
    id: "C",
    pays,
  })

  it("recognizes ways", () => {
    reels = [
      [A, C, B],
      [A, A, C],
      [B, A, A],
      [B, A, A],
      [B, B, C],
    ]

    const ways = new ManywaysWinType({ ctx })

    const { payout, winCombinations } = ways.evaluateWins(reels).getWins()

    expect(winCombinations.length).toBe(1)
    expect(winCombinations[0]?.ways).toBe(8)
    expect(payout).toBe(8)
  })

  it("recognizes ways with mixed wilds", () => {
    reels = [
      [A, C, B],
      [A, W, C],
      [B, A, A],
      [B, A, A],
      [B, B, C],
    ]

    const ways = new ManywaysWinType({ ctx, wildSymbol: W })

    const { payout, winCombinations } = ways.evaluateWins(reels).getWins()

    expect(winCombinations.length).toBe(2)
    expect(winCombinations[0]?.ways).toBe(8)
    expect(winCombinations[1]?.ways).toBe(2)
    expect(payout).toBe(12)
  })

  it("recognizes ways with starting wilds", () => {
    reels = [
      [W, C, W],
      [A, W, C],
      [B, B, A],
      [B, A, A],
      [B, C, C],
    ]

    const ways = new ManywaysWinType({ ctx, wildSymbol: W })

    const { payout, winCombinations } = ways.evaluateWins(reels).getWins()

    expect(winCombinations.length).toBe(2)
    expect(winCombinations[0]?.ways).toBe(8)
    expect(winCombinations[1]?.ways).toBe(4)
    expect(payout).toBe(16)
  })

  it("counts wilds as individual win", () => {
    reels = [
      [W, C, W],
      [A, W, C],
      [W, W, A],
      [B, A, A],
      [B, C, C],
    ]

    const ways = new ManywaysWinType({ ctx, wildSymbol: W })

    const { payout, winCombinations } = ways.evaluateWins(reels).getWins()

    expect(winCombinations.length).toBe(4)
    expect(winCombinations[0]?.ways).toBe(4)
    expect(winCombinations[1]?.ways).toBe(12)
    expect(winCombinations[2]?.ways).toBe(24)
    expect(winCombinations[3]?.ways).toBe(4)
    expect(payout).toBe(42)
  })
})

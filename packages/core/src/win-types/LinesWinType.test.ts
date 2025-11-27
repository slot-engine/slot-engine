import { describe, it, expect } from "vitest"
import { createTestContext } from "../game-context"
import { Reels } from "../types"
import { GameSymbol } from "../game-symbol"
import { LinesWinType } from "./LinesWinType"

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

describe("LinesWinType", () => {
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

  it("recognizes lines with mixed wilds", () => {
    reels = [
      [A, C, B],
      [A, C, B],
      [C, W, B],
      [B, A, B],
      [B, B, C],
    ]

    const lines = new LinesWinType({
      ctx,
      wildSymbol: W,
      lines: {
        1: [0, 0, 0, 0, 0],
        2: [1, 1, 1, 1, 1],
        3: [2, 2, 2, 2, 2],
        4: [0, 0, 1, 2, 2],
        5: [2, 2, 1, 0, 0],
      },
    })

    const { payout, winCombinations } = lines.evaluateWins(reels).getWins()

    expect(winCombinations.length).toBe(4)
    expect(winCombinations[0]?.kind).toBe(3)
    expect(winCombinations[1]?.kind).toBe(4)
    expect(winCombinations[2]?.kind).toBe(3)
    expect(winCombinations[3]?.kind).toBe(5)
    expect(payout).toBe(4)
  })

  it("recognizes lines with starting wilds", () => {
    reels = [
      [W, C, B],
      [W, C, B],
      [A, C, B],
      [A, C, B],
      [A, C, B],
    ]

    const lines = new LinesWinType({
      ctx,
      wildSymbol: W,
      lines: {
        1: [0, 0, 0, 0, 0],
      },
    })

    const { payout, winCombinations } = lines.evaluateWins(reels).getWins()

    expect(winCombinations.length).toBe(1)
    expect(winCombinations[0]?.baseSymbol.id).toBe("A")
    expect(payout).toBe(2)
  })

  it("uses the highest paying symbol", () => {
    reels = [
      [W, C, B],
      [W, C, B],
      [W, C, B],
      [W, C, B],
      [A, C, B],
    ]

    const lines = new LinesWinType({
      ctx,
      wildSymbol: W,
      lines: {
        1: [0, 0, 0, 0, 0],
      },
    })

    const { payout, winCombinations } = lines.evaluateWins(reels).getWins()

    expect(winCombinations.length).toBe(1)
    expect(winCombinations[0]?.baseSymbol.id).toBe("W")
    expect(payout).toBe(3)
  })
})

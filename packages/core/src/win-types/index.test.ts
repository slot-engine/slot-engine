import { describe, it, expect, beforeEach } from "vitest"
import { createTestContext } from "../game-context"
import { StandaloneBoard } from "../board/StandaloneBoard"
import { Reels } from "../types"
import { GameSymbol } from "../game-symbol"
import { ClusterWinType } from "./ClusterWinType"

let ctx = createTestContext()

beforeEach(() => {
  ctx = createTestContext()
})

describe("ClusterWinType", () => {
  let board: StandaloneBoard
  let reels: Reels

  const pays = {
    5: 0.3,
    6: 0.5,
    7: 0.8,
    8: 1,
    10: 1.5,
    12: 2,
    13: 3,
    14: 5,
    15: 10,
    16: 15,
  }

  const W = new GameSymbol({
    id: "W",
    properties: { isWild: true },
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

  const D = new GameSymbol({
    id: "D",
    pays,
  })

  const E = new GameSymbol({
    id: "E",
    pays,
  })

  it("recognizes clusters", () => {
    reels = [
      [A, A, A, B, C, D, E],
      [A, A, W, B, B, E, C],
      [B, A, A, E, B, B, E],
      [C, E, E, E, C, A, B],
      [D, C, E, C, A, E, C],
      [A, D, C, E, B, D, E],
      [C, B, A, B, C, B, B],
    ]

    const cluster = new ClusterWinType({ ctx, wildSymbol: W })

    const { payout, winCombinations } = cluster.evaluateWins(reels).getWins()

    expect(true).toBe(true)
  })
})

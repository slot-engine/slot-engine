import { describe, it, expect } from "vitest"
import { createTestContext } from "../game-context"
import { Reels } from "../types"
import { GameSymbol } from "../game-symbol"
import { ClusterWinType } from "./ClusterWinType"

const ctx = createTestContext()

describe("ClusterWinType", () => {
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
    pays,
  })

  const X = new GameSymbol({
    id: "X",
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

  it("recognizes clusters with mixed wilds", () => {
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

    expect(winCombinations.length).toBe(4)
    expect(winCombinations[0]?.baseSymbol.id).toBe("A")
    expect(winCombinations[0]?.symbols.some((c) => c.symbol.id == "W")).toBe(true)
    expect(winCombinations[0]?.symbols.filter((c) => c.symbol.id == "W").length).toBe(1)
    expect(payout).toBe(1.8)
  })

  it("recognizes wild-only clusters", () => {
    reels = [
      [A, B, A, B, A, B, A],
      [B, A, B, A, B, A, B],
      [A, B, W, W, W, B, A],
      [B, A, W, W, W, A, B],
      [A, B, W, W, W, B, A],
      [B, A, B, A, B, A, B],
      [A, B, A, B, A, B, A],
    ]

    const cluster = new ClusterWinType({ ctx, wildSymbol: W })

    const { payout, winCombinations } = cluster.evaluateWins(reels).getWins()

    expect(winCombinations.length).toBe(3)
    expect(winCombinations[0]?.baseSymbol.id).toBe("B")
    expect(winCombinations[0]?.symbols.length).toBe(17)
    expect(winCombinations[1]?.baseSymbol.id).toBe("A")
    expect(winCombinations[1]?.symbols.length).toBe(13)
    expect(winCombinations[2]?.baseSymbol.id).toBe("W")
    expect(winCombinations[2]?.symbols.length).toBe(9)
    expect(payout).toBe(19)
  })

  it("recognizes full-board cluster", () => {
    reels = [
      [W, W, W, W, W, W, W],
      [W, W, W, W, W, W, W],
      [W, W, W, W, W, W, W],
      [W, W, W, W, W, W, W],
      [W, W, W, W, W, W, W],
      [W, W, W, W, W, W, W],
      [W, W, W, W, W, W, W],
    ]

    const cluster = new ClusterWinType({ ctx, wildSymbol: W })

    const { payout, winCombinations } = cluster.evaluateWins(reels).getWins()

    expect(winCombinations.length).toBe(1)
    expect(payout).toBe(15)
  })

  it("only counts paying symbols", () => {
    reels = [
      [W, W, W, W, W],
      [W, W, W, W, W],
      [X, X, X, X, X],
      [X, X, X, X, X],
    ]

    const cluster = new ClusterWinType({ ctx, wildSymbol: W })

    const { payout, winCombinations } = cluster.evaluateWins(reels).getWins()

    expect(winCombinations.length).toBe(1)
    expect(winCombinations[0]?.payout).toBe(1.5)
    expect(payout).toBe(1.5)
  })
})

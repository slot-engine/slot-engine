import { describe, it, expect, beforeEach } from "vitest"
import { createTestContext } from "../game-context"
import { GameSymbol } from "../game-symbol"
import { ClusterWinType } from "./ClusterWinType"
import { GameMode } from "../game-mode"
import { StaticReelSet } from "../reel-set/StaticReelSet"

describe("WinType", () => {
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
    25: 50,
  }

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

  const ctx = createTestContext({
    symbols: {
      A,
      B,
      C,
    },
    gameModes: {
      base: new GameMode({
        name: "base",
        reelsAmount: 5,
        symbolsPerReel: [5, 5, 5, 5, 5],
        cost: 1,
        reelSets: [
          new StaticReelSet({
            id: "default",
            reels: [
              ["A", "C", "B", "A", "A", "C", "A", "B", "C", "A"],
              ["A", "A", "C", "B", "A", "B", "C", "A", "B", "C"],
              ["B", "A", "A", "C", "B", "A", "B", "C", "A", "B"],
              ["B", "C", "A", "A", "B", "C", "C", "C", "A", "B"],
              ["B", "B", "C", "A", "C", "C", "A", "B", "C", "A"],
            ],
          }),
        ],
        resultSets: [],
        rtp: 0.9,
        isBonusBuy: false,
      }),
    },
  })

  beforeEach(() => {
    ctx.state.currentGameMode = "base"
    ctx.services.game._generateReels()
  })

  it("recognizes changes to ctx", () => {
    ctx.services.board.drawBoardWithRandomStops(
      ctx.services.game.getReelsetById("base", "default")!,
    )

    const cluster = new ClusterWinType({ ctx })

    const reels = ctx.services.board.getBoardReels()
    for (let r = 0; r < reels.length; r++) {
      for (let s = 0; s < reels[r]!.length; s++) {
        ctx.services.board.setSymbol(r, s, A)
      }
    }

    const { payout, winCombinations } = cluster
      .evaluateWins(ctx.services.board.getBoardReels())
      .getWins()

    expect(winCombinations.length).toBe(1)
    expect(winCombinations[0]?.baseSymbol.id).toBe("A")
    expect(payout).toBe(50)
  })
})

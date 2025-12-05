import { describe, it, expect } from "vitest"
import { createTestContext } from "../game-context"
import { Reels } from "../types"
import { GameSymbol } from "../game-symbol"
import { StaticReelSet } from "../reel-set/StaticReelSet"

const pays = {
  3: 0.5,
  4: 1,
  5: 2,
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
    base: {
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
      rtp: 1,
      isBonusBuy: false,
    },
  },
})

describe("Board", () => {
  let reels: Reels
  ctx.state.currentGameMode = "base"
  ctx.services.game._generateReels()

  it("tumbles board correctly", () => {
    reels = ctx.services.game.getReelsetById("base", "default")

    ctx.services.board.drawBoardWithForcedStops({
      reels,
      forcedStops: {
        "0": 5,
        "1": 5,
        "2": 5,
        "3": 5,
        "4": 5,
      },
      randomOffset: false,
    })

    const boardBeforeTumble = ctx.services.board.getBoardReels()
    const paddingTopBeforeTumble = ctx.services.board.getPaddingTop()

    let idsOnBoard = boardBeforeTumble.map((reel) => reel.map((symbol) => symbol.id))
    let paddingTopIds = paddingTopBeforeTumble.flatMap((reel) =>
      reel.map((symbol) => symbol.id),
    )

    expect(idsOnBoard).toEqual([
      ["C", "A", "B", "C", "A"],
      ["B", "C", "A", "B", "C"],
      ["A", "B", "C", "A", "B"],
      ["C", "C", "C", "A", "B"],
      ["C", "A", "B", "C", "A"],
    ])

    expect(paddingTopIds).toEqual(["A", "A", "B", "B", "C"])

    const symbolsToDelete = [
      { reelIdx: 1, rowIdx: 1 },
      { reelIdx: 2, rowIdx: 1 },
      { reelIdx: 3, rowIdx: 1 },
      { reelIdx: 1, rowIdx: 2 },
      { reelIdx: 2, rowIdx: 2 },
      { reelIdx: 3, rowIdx: 2 },
    ]

    const { newBoardSymbols, newPaddingTopSymbols } =
      ctx.services.board.tumbleBoard(symbolsToDelete)

    const boardAfterTumble = ctx.services.board.getBoardReels()
    const paddingTopAfterTumble = ctx.services.board.getPaddingTop()

    idsOnBoard = boardAfterTumble.map((reel) => reel.map((symbol) => symbol.id))
    paddingTopIds = paddingTopAfterTumble.flatMap((reel) =>
      reel.map((symbol) => symbol.id),
    )

    expect(idsOnBoard).toEqual([
      ["C", "A", "B", "C", "A"],
      ["B", "A", "B", "B", "C"],
      ["C", "B", "A", "A", "B"],
      ["A", "B", "C", "A", "B"],
      ["C", "A", "B", "C", "A"],
    ])

    expect(paddingTopIds).toEqual(["A", "C", "A", "A", "C"])

    expect(newBoardSymbols).toEqual({
      "1": [B, A],
      "2": [C, B],
      "3": [A, B],
    })

    expect(newPaddingTopSymbols).toEqual({
      "1": [C],
      "2": [A],
      "3": [A],
    })
  })

  it("tumbles correctly multiple times", () => {
    reels = ctx.services.game.getReelsetById("base", "default")

    ctx.services.board.drawBoardWithForcedStops({
      reels,
      forcedStops: {
        "0": 5,
        "1": 5,
        "2": 5,
        "3": 5,
        "4": 5,
      },
      randomOffset: false,
    })

    const boardBeforeTumble = ctx.services.board.getBoardReels()
    const paddingTopBeforeTumble = ctx.services.board.getPaddingTop()

    expect(boardBeforeTumble).toEqual([
      [C, A, B, C, A],
      [B, C, A, B, C],
      [A, B, C, A, B],
      [C, C, C, A, B],
      [C, A, B, C, A],
    ])

    expect(paddingTopBeforeTumble).toEqual([[A], [A], [B], [B], [C]])

    const symbolsToDelete = [
      { reelIdx: 0, rowIdx: 1 },
      { reelIdx: 1, rowIdx: 1 },
      { reelIdx: 2, rowIdx: 1 },
      { reelIdx: 3, rowIdx: 1 },
      { reelIdx: 4, rowIdx: 1 },
      { reelIdx: 0, rowIdx: 2 },
      { reelIdx: 1, rowIdx: 2 },
      { reelIdx: 2, rowIdx: 2 },
      { reelIdx: 3, rowIdx: 2 },
      { reelIdx: 4, rowIdx: 2 },
    ]

    ctx.services.board.tumbleBoard(symbolsToDelete)
    ctx.services.board.tumbleBoard(symbolsToDelete)

    const boardAfterTumble = ctx.services.board.getBoardReels()
    const paddingTopAfterTumble = ctx.services.board.getPaddingTop()

    expect(boardAfterTumble).toEqual([
      [C, B, A, C, A],
      [A, C, B, B, C],
      [A, A, C, A, B],
      [C, A, A, A, B],
      [B, C, A, C, A],
    ])

    expect(paddingTopAfterTumble).toEqual([[A], [A], [B], [B], [B]])
  })
})

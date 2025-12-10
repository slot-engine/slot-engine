import { describe, it, expect, beforeEach } from "vitest"
import { createTestContext } from "../game-context"
import { Reels } from "../types"
import { GameSymbol } from "../game-symbol"
import { StaticReelSet } from "../reel-set/StaticReelSet"
import { GameMode } from "../game-mode"

const pays = {
  3: 0.5,
  4: 1,
  5: 2,
}

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

let ctx = createTestContext({
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

const ctx2 = createTestContext({
  padSymbols: 0,
  symbols: {
    X,
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
            ["A", "B", "C", "A", "B", "C", "A", "B", "C"],
            ["A", "B", "C", "A", "B", "C", "A", "B", "C"],
            ["A", "B", "C", "A", "B", "C", "A", "B", "C"],
            ["A", "B", "C", "A", "B", "C", "A", "B", "C"],
            ["A", "B", "C", "A", "B", "C", "A", "B", "C"],
          ],
        }),
        new StaticReelSet({
          id: "blocker",
          reels: [
            ["X", "X", "X", "X", "X"],
            ["X", "X", "X", "X", "X"],
            ["X", "X", "X", "X", "X"],
            ["X", "X", "X", "X", "X"],
            ["X", "X", "X", "X", "X"],
          ],
        }),
      ],
      resultSets: [],
      rtp: 0.9,
      isBonusBuy: false,
    }),
  },
})

describe("Board", () => {
  let reels: Reels

  beforeEach(() => {
    ctx.state.currentGameMode = "base"
    ctx.services.game._generateReels()
    ctx2.state.currentGameMode = "base"
    ctx2.services.game._generateReels()
  })

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

    let boardAfterTumble = ctx.services.board.getBoardReels()
    let paddingTopAfterTumble = ctx.services.board.getPaddingTop()

    expect(boardAfterTumble).toEqual([
      [C, B, A, C, A],
      [A, C, B, B, C],
      [A, A, C, A, B],
      [C, A, A, A, B],
      [B, C, A, C, A],
    ])

    expect(paddingTopAfterTumble).toEqual([[A], [A], [B], [B], [B]])

    ctx.services.board.tumbleBoard(symbolsToDelete)

    boardAfterTumble = ctx.services.board.getBoardReels()
    paddingTopAfterTumble = ctx.services.board.getPaddingTop()

    expect(boardAfterTumble).toEqual([
      [A, A, C, C, A],
      [C, A, A, B, C],
      [B, B, A, A, B],
      [B, B, C, A, B],
      [A, B, B, C, A],
    ])

    expect(paddingTopAfterTumble).toEqual([[C], [B], [A], [A], [C]])
  })

  it("tumbles and forgets", () => {
    ctx = ctx2

    reels = ctx.services.game.getReelsetById("base", "default")

    ctx.services.board.setSymbolsPerReel([2, 5, 3, 5, 2])

    ctx.services.board.drawBoardWithForcedStops({
      reels,
      forcedStops: {
        "0": 3,
        "1": 3,
        "2": 3,
        "3": 3,
        "4": 3,
      },
      randomOffset: false,
    })

    expect(ctx.services.board.getBoardReels()).toEqual([
      [A, B],
      [A, B, C, A, B],
      [A, B, C],
      [A, B, C, A, B],
      [A, B],
    ])

    ctx.services.board.setSymbolsPerReel([5, 5, 5, 5, 5])

    const blockers = ctx.services.game.getReelsetById("base", "blocker")
    ctx.services.board.tumbleBoardAndForget({
      symbolsToDelete: [],
      reels: blockers,
      forcedStops: [0, 0, 0, 0, 0],
    })

    expect(ctx.services.board.getBoardReels()).toEqual([
      [X, X, X, A, B],
      [A, B, C, A, B],
      [X, X, A, B, C],
      [A, B, C, A, B],
      [X, X, X, A, B],
    ])

    const symbolsToDelete = [
      { reelIdx: 0, rowIdx: 1 },
      { reelIdx: 1, rowIdx: 1 },
      { reelIdx: 2, rowIdx: 1 },
      { reelIdx: 3, rowIdx: 1 },
      { reelIdx: 4, rowIdx: 1 },
    ]

    ctx.services.board.tumbleBoard(symbolsToDelete)

    expect(ctx.services.board.getBoardReels()).toEqual([
      [C, X, X, A, B],
      [C, A, C, A, B],
      [C, X, A, B, C],
      [C, A, C, A, B],
      [C, X, X, A, B],
    ])

    ctx.services.board.tumbleBoard(symbolsToDelete)

    expect(ctx.services.board.getBoardReels()).toEqual([
      [B, C, X, A, B],
      [B, C, C, A, B],
      [B, C, A, B, C],
      [B, C, C, A, B],
      [B, C, X, A, B],
    ])
  })
})

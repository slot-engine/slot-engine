import {
  ClusterWinType,
  WinCombination,
  GameContext,
  Reels,
  SPIN_TYPE,
} from "@slot-engine/core"
import { GameModesType, SymbolsType, UserStateType } from ".."

type Context = GameContext<GameModesType, SymbolsType, UserStateType>

/**
 * This game flow demonstrates a cluster-based slot game with tumbling reels.
 * Similar to the game "Sugar Rush", win combinations build up multipliers on the board.
 * A multiplier doubles for each tumble win it's part of, up to a maximum of 128x.
 * During free spins, multipliers do not reset between spins.
 */

export function onHandleGameFlow(ctx: Context) {
  // Build initial board multipliers starting at 0
  makeInitialBoardMultis(ctx)

  // Build the initial board
  drawBoard(ctx)

  // Set anticipation states based on scatters on board
  handleAnticipation(ctx)

  // Create event to tell the client what to render
  ctx.services.data.addBookEvent({
    type: "board-reveal",
    data: {
      // Note: If you can, only send IDs to minimize data size.
      board: getSymIdsFromReels(ctx.services.board.getBoardReels()),
      padTop: getSymIdsFromReels(ctx.services.board.getPaddingTop()),
      padBottom: getSymIdsFromReels(ctx.services.board.getPaddingBottom()),
      anticipation: ctx.services.board.getAnticipation(),
    },
  })

  // Tumble until no more wins.
  // This also creates event data for the frontend.
  handleTumbles(ctx)

  // Finalize this round's win
  ctx.services.wallet.confirmSpinWin()

  ctx.services.data.addBookEvent({
    type: "show-final-win",
    data: {
      payout: ctx.services.wallet.getCurrentWin(),
    },
  })

  // Maybe enter free spins loop
  checkFreespins(ctx)
}

function drawBoard(ctx: Context) {
  const reels = ctx.services.board.getRandomReelset()
  const scatter = ctx.config.symbols.get("S")!

  const numScatters = Number(
    ctx.services.rng.weightedRandom(
      getScatterWeights(ctx.state.currentResultSet.criteria),
    ),
  )

  if (
    // If free spins are forced via the result set, draw board with scatters
    ctx.state.currentResultSet.forceFreespins &&
    ctx.state.currentSpinType == SPIN_TYPE.BASE_GAME
  ) {
    while (true) {
      ctx.services.board.resetBoard()

      const reelStops = ctx.services.board.getReelStopsForSymbol(reels, scatter)
      const scatterReelStops = ctx.services.board.getRandomReelStops(
        reels,
        reelStops,
        numScatters,
      )

      ctx.services.board.drawBoardWithForcedStops({
        reels,
        forcedStops: scatterReelStops,
      })

      const scatInvalid = ctx.services.board.isSymbolOnAnyReelMultipleTimes(scatter)
      const [scatCount] = ctx.services.board.countSymbolsOnBoard(scatter)

      if (scatCount == numScatters && !scatInvalid) break
    }
  } else if (
    // If spin should NOT trigger free spins, draw board with up to 2 scatters
    !ctx.state.currentResultSet.forceFreespins &&
    ctx.state.currentSpinType == SPIN_TYPE.BASE_GAME
  ) {
    while (true) {
      ctx.services.board.resetBoard()
      ctx.services.board.drawBoardWithRandomStops(reels)

      const scatInvalid = ctx.services.board.isSymbolOnAnyReelMultipleTimes(scatter)
      const [scatCount] = ctx.services.board.countSymbolsOnBoard(scatter)

      if (scatCount > ctx.config.anticipationTriggers[ctx.state.currentSpinType]) {
        continue
      }

      if (!scatInvalid) break
    }
  } else {
    // If no special ResultSet criteria, draw board normally
    while (true) {
      ctx.services.board.resetBoard()
      ctx.services.board.drawBoardWithRandomStops(reels)
      const scatInvalid = ctx.services.board.isSymbolOnAnyReelMultipleTimes(scatter)
      if (!scatInvalid) break
    }
  }
}

function handleAnticipation(ctx: Context) {
  const scatter = ctx.config.symbols.get("S")!
  const [_, scatCount] = ctx.services.board.countSymbolsOnBoard(scatter)

  let count = 0

  for (const [i, reel] of ctx.services.board.getBoardReels().entries()) {
    if (count >= ctx.config.anticipationTriggers[ctx.state.currentSpinType]) {
      ctx.services.board.setAnticipationForReel(i, true)
    }
    if (scatCount[i] > 0) {
      count++
    }
  }
}

function handleTumbles(ctx: Context) {
  const cluster = new ClusterWinType({
    ctx,
    wildSymbol: { isWild: true },
  })

  // Keep tumbling until no more wins
  while (true) {
    const { payout, winCombinations } = cluster
      .evaluateWins(ctx.services.board.getBoardReels())
      .postProcess((wins) => processWins(wins, ctx))
      .getWins()

    if (payout === 0) break

    // Deduplicate win symbols to avoid double processing
    const winSymbols = ctx.services.game.dedupeWinSymbols(winCombinations)

    // Add event to tell client about all wins.
    // It could then highlight and destroy the winning symbols.
    ctx.services.data.addBookEvent({
      type: "highlight-cluster-wins",
      data: {
        winSymbols,
      },
    })

    // `addTumbleWin` already calls `addSpinWin`, so no need to do it here.
    // If this wasn't a tumble based game, we would call `addSpinWin` instead.
    ctx.services.wallet.addTumbleWin(payout)

    ctx.services.data.addBookEvent({
      type: "update-tumble-win",
      data: {
        payout,
      },
    })

    // Double board multipliers after win, capped at 128x
    for (const sym of winSymbols) {
      const currentMulti = ctx.state.userData.boardMultis[sym.reelIdx][sym.rowIdx]
      const newMulti = Math.max(1, Math.min(currentMulti * 2, 128))
      ctx.state.userData.boardMultis[sym.reelIdx][sym.rowIdx] = newMulti
    }

    ctx.services.data.addBookEvent({
      type: "update-multipliers",
      data: {
        multipliers: ctx.state.userData.boardMultis,
      },
    })

    // Tumbling the board gives us the newly added symbols as well.
    // We can tell the client which new symbols to animate in.
    const { newBoardSymbols, newPaddingTopSymbols } =
      ctx.services.board.tumbleBoard(winSymbols)

    // Note: If you can, only send IDs to minimize data size.
    ctx.services.data.addBookEvent({
      type: "tumble-symbols",
      data: {
        newBoardSymbols: Object.fromEntries(
          Object.entries(newBoardSymbols).map(([reelIdx, symbols]) => [
            reelIdx,
            symbols.map((s) => s.id),
          ]),
        ),
        newPaddingTopSymbols: Object.fromEntries(
          Object.entries(newPaddingTopSymbols).map(([reelIdx, symbols]) => [
            reelIdx,
            symbols.map((s) => s.id),
          ]),
        ),
      },
    })
  }
}

function checkFreespins(ctx: Context) {
  const scatter = ctx.config.symbols.get("S")!
  const [scatCount] = ctx.services.board.countSymbolsOnBoard(scatter)

  const freespinsAwarded = ctx.services.game.getFreeSpinsForScatters(
    ctx.state.currentSpinType,
    scatCount,
  )

  // no freespins, return early
  if (freespinsAwarded <= 0) return

  ctx.services.game.awardFreespins(freespinsAwarded)

  // Ensure we only trigger free spins from base game.
  // Our playFreeSpins function handles the free spins loop already and we don't want recursion.
  if (ctx.state.currentSpinType == SPIN_TYPE.BASE_GAME) {
    ctx.services.data.addBookEvent({
      type: "fs-triggered",
      data: {
        fs: freespinsAwarded,
      },
    })

    // We can optionally record how many scatters triggered the free spins
    ctx.services.data.recordSymbolOccurrence({
      kind: scatCount,
      symbolId: scatter.id,
      spinType: ctx.state.currentSpinType,
    })

    ctx.services.data.record({
      triggeredFS: true,
    })

    playFreeSpins(ctx)
    // We return here to avoid recording a retrigger event right after all free spins were played
    return
  }

  // If we are already in free spins, record a retrigger event
  if (ctx.state.currentSpinType == SPIN_TYPE.FREE_SPINS) {
    ctx.services.data.addBookEvent({
      type: "fs-retriggered",
      data: {
        fs: freespinsAwarded,
      },
    })
  }
}

function playFreeSpins(ctx: Context) {
  // Change spin type to free spins manually (Slot Engine does not do this automatically yet)
  ctx.state.currentSpinType = SPIN_TYPE.FREE_SPINS

  // Free spins loop
  while (ctx.state.currentFreespinAmount > 0) {
    ctx.state.currentFreespinAmount--

    ctx.services.data.addBookEvent({
      type: "update-fs-amount",
      data: {
        fs: ctx.state.currentFreespinAmount,
        totalFs: ctx.state.totalFreespinAmount,
      },
    })

    drawBoard(ctx)
    handleAnticipation(ctx)

    ctx.services.data.addBookEvent({
      type: "board-reveal",
      data: {
        // Note: If you can, only send IDs to minimize data size.
        board: getSymIdsFromReels(ctx.services.board.getBoardReels()),
        padTop: getSymIdsFromReels(ctx.services.board.getPaddingTop()),
        padBottom: getSymIdsFromReels(ctx.services.board.getPaddingBottom()),
        anticipation: ctx.services.board.getAnticipation(),
      },
    })

    handleTumbles(ctx)
    ctx.services.wallet.confirmSpinWin()
    checkFreespins(ctx)
  }

  ctx.services.data.addBookEvent({
    type: "show-fs-win",
    data: {
      payout: ctx.services.wallet.getCurrentWin(),
    },
  })
}

function getScatterWeights(key: string) {
  const SCATTER_WEIGHTS = {
    freespins: {
      3: 80,
      4: 10,
      5: 1,
      6: 0.5,
      7: 0.1,
    },
    maxwin: {
      6: 1,
      7: 2,
    },
  }

  if (key in SCATTER_WEIGHTS) {
    return SCATTER_WEIGHTS[key as keyof typeof SCATTER_WEIGHTS]
  }

  return SCATTER_WEIGHTS.freespins
}

function makeInitialBoardMultis(ctx: Context) {
  const mode =
    ctx.config.gameModes[ctx.state.currentGameMode as keyof typeof ctx.config.gameModes]

  const reelsNum = mode.reelsAmount
  const symbolsPerReel = mode.symbolsPerReel

  const boardMultis: number[][] = []

  for (let r = 0; r < reelsNum; r++) {
    const reelMultis: number[] = []
    for (let s = 0; s < symbolsPerReel[r]; s++) {
      reelMultis.push(0)
    }
    boardMultis.push(reelMultis)
  }

  ctx.state.userData.boardMultis = boardMultis
}

function processWins(wins: WinCombination[], ctx: Context) {
  const winCombinations = wins.map((wc) => {
    const multiForCluster = wc.symbols.reduce((multi, s) => {
      const multiOnPos = ctx.state.userData.boardMultis[s.reelIndex][s.posIndex]
      // A winning cluster must first "activate" the multiplier on a position (multi 0 -> 1).
      // Only on the next win does the multiplier apply (multi 1 -> 2).
      // Multipliers themselves are updated in `handleTumbles()`.
      // This function here just applies the multiplier to the payout.
      return multiOnPos >= 2 ? multiOnPos + multi : multi
    }, 0)

    // Multi is initially 0, so we ensure at least 1x payout
    const payout = wc.payout * Math.max(1, multiForCluster)

    return {
      ...wc,
      payout,
    }
  })
  return { winCombinations }
}

function getSymIdsFromReels(reels: Reels) {
  return reels.map((reel) => reel.map((s) => s.id))
}

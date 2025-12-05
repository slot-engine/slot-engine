import {
  ClusterWinType,
  WinCombination,
  GameContext,
  GameSymbol,
  Reels,
  SPIN_TYPE,
} from "@slot-engine/core"
import { GameModesType, SymbolsType, UserStateType } from ".."

type Context = GameContext<GameModesType, SymbolsType, UserStateType>

export function onHandleGameFlow(ctx: Context) {
  makeInitialBoardMultis(ctx)
  drawBoard(ctx)
  handleAnticipation(ctx)
  handleTumbles(ctx)
  ctx.services.wallet.confirmSpinWin()
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
    drawDefaultBoard(ctx, reels, scatter)
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

  while (true) {
    const { payout, winCombinations } = cluster
      .evaluateWins(ctx.services.board.getBoardReels())
      .postProcess((wins) => processWins(wins, ctx))
      .getWins()

    if (payout === 0) break

    const symbolsToRemove = ctx.services.board.dedupeWinSymbolsForTumble(winCombinations)

    ctx.services.wallet.addTumbleWin(payout)

    for (const syms of symbolsToRemove) {
      const currentMulti = ctx.state.userData.boardMultis[syms.reelIdx][syms.rowIdx]
      const newMulti = Math.max(1, Math.min(currentMulti * 2, 128))
      ctx.state.userData.boardMultis[syms.reelIdx][syms.rowIdx] = newMulti
    }

    ctx.services.board.tumbleBoard(symbolsToRemove)
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
    ctx.services.data.recordSymbolOccurrence({
      kind: scatCount,
      symbolId: scatter.id,
      spinType: ctx.state.currentSpinType,
    })

    ctx.services.data.record({
      triggeredFS: true,
    })

    playFreeSpins(ctx)
  }
}

function playFreeSpins(ctx: Context) {
  ctx.state.currentSpinType = SPIN_TYPE.FREE_SPINS
  while (ctx.state.currentFreespinAmount > 0) {
    ctx.state.currentFreespinAmount--
    drawBoard(ctx)
    handleAnticipation(ctx)
    handleTumbles(ctx)
    ctx.services.wallet.confirmSpinWin()
    checkFreespins(ctx)
  }
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

function drawDefaultBoard(ctx: Context, reels: Reels, scatter: GameSymbol) {
  while (true) {
    ctx.services.board.resetBoard()
    ctx.services.board.drawBoardWithRandomStops(reels)

    const scatInvalid = ctx.services.board.isSymbolOnAnyReelMultipleTimes(scatter)

    if (!scatInvalid) break
  }
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
      return multiOnPos >= 2 ? multiOnPos + multi : multi
    }, 0)

    const payout = wc.payout * Math.max(1, multiForCluster)

    return {
      ...wc,
      payout,
    }
  })
  return { winCombinations }
}

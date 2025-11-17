import {
  GameContext,
  GameSymbol,
  LinesWinType,
  Reels,
  SPIN_TYPE,
} from "@slot-engine/core"
import { SymbolsType, UserStateType } from ".."

type Context = GameContext<any, SymbolsType, UserStateType>

export function onHandleGameFlow(ctx: Context) {
  drawBoard(ctx)
  ctx.services.data.addBookEvent({
    type: "test",
    data: { test: 123 },
  })
  handleAnticipation(ctx)
  handleWins(ctx)
  ctx.services.wallet.confirmSpinWin(ctx.state.currentSpinType)
  checkFreespins(ctx)
}

function drawBoard(ctx: Context) {
  const reels = ctx.services.board.getRandomReelset()
  const scatter = ctx.config.symbols.get("S")!
  const superScatter = ctx.config.symbols.get("SS")!

  let numScatters = Number(
    ctx.services.rng.weightedRandom(
      getScatterWeights(ctx.state.currentResultSet.criteria),
    ),
  )
  numScatters = ctx.services.game.verifyScatterCount(numScatters)

  if (
    // If super free spins are forced via the result set, draw board with one super scatter
    ctx.state.currentResultSet.forceFreespins &&
    ctx.state.currentResultSet.userData?.forceSuperFreespins &&
    ctx.state.currentSpinType == SPIN_TYPE.BASE_GAME
  ) {
    drawSuperFSTriggerBoard(ctx, reels, scatter, superScatter, numScatters)
  } else if (
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

      ctx.services.board.drawBoardWithForcedStops(reels, scatterReelStops)

      const scatInvalid = ctx.services.board.isSymbolOnAnyReelMultipleTimes(scatter)
      const [scatCount] = ctx.services.board.countSymbolsOnBoard(scatter)
      const [superScatCount] = ctx.services.board.countSymbolsOnBoard(superScatter)

      if (superScatCount > 0) continue
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
      const superScatInvalid =
        ctx.services.board.isSymbolOnAnyReelMultipleTimes(superScatter)
      const [scatCount] = ctx.services.board.countSymbolsOnBoard(scatter)
      const [superScatCount] = ctx.services.board.countSymbolsOnBoard(superScatter)
      const scatters = scatCount + superScatCount

      if (
        scatters > ctx.config.anticipationTriggers[ctx.state.currentSpinType] ||
        superScatCount > 1
      ) {
        continue
      }

      if (!scatInvalid && !superScatInvalid) break
    }
  } else if (
    // If FS should upgrade to super FS, increase chance of upgrade withing the current freespins batch.
    // We do this to improve performance of matching ResultSets.
    ctx.state.currentSpinType == SPIN_TYPE.FREE_SPINS &&
    ctx.state.currentResultSet.userData?.upgradeFreespins &&
    !ctx.state.userData.freespinsUpgradedToSuper
  ) {
    const result = Math.round(ctx.services.rng.randomFloat(1, 100))
    const shouldUpgrade = result <= 15
    if (shouldUpgrade) {
      drawSuperFSTriggerBoard(ctx, reels, scatter, superScatter, numScatters)
    } else {
      drawDefaultBoard(ctx, reels, scatter, superScatter)
    }
  } else {
    drawDefaultBoard(ctx, reels, scatter, superScatter)
  }
}

function handleAnticipation(ctx: Context) {
  const scatter = ctx.config.symbols.get("S")!
  const superScatter = ctx.config.symbols.get("SS")!

  const [_, scatCount] = ctx.services.board.countSymbolsOnBoard(scatter)
  const [__, superScatCount] = ctx.services.board.countSymbolsOnBoard(superScatter)

  let count = 0

  for (const [i, reel] of ctx.services.board.getBoardReels().entries()) {
    if (count >= ctx.config.anticipationTriggers[ctx.state.currentSpinType]) {
      ctx.services.board.setAnticipationForReel(i, true)
    }
    if (scatCount[i] > 0 || superScatCount[i] > 0) {
      count++
    }
  }
}

function handleWins(ctx: Context) {
  const lines = new LinesWinType({
    ctx,
    lines: {
      1: [0, 0, 0, 0, 0],
      2: [1, 1, 1, 1, 1],
      3: [2, 2, 2, 2, 2],
      4: [2, 1, 0, 1, 2],
      5: [0, 1, 2, 1, 0],
      6: [2, 1, 2, 1, 2],
      7: [0, 1, 0, 1, 0],
      8: [2, 2, 1, 0, 0],
      9: [0, 0, 1, 2, 2],
      10: [1, 0, 0, 0, 1],
      11: [1, 2, 2, 2, 1],
      12: [0, 1, 1, 1, 0],
      13: [2, 1, 1, 1, 2],
      14: [1, 0, 1, 0, 1],
      15: [1, 2, 1, 2, 1],
    },
    wildSymbol: { isWild: true },
  })

  const { payout, winCombinations } = lines
    .evaluateWins(ctx.services.board.getBoardReels())
    .getWins()

  ctx.services.wallet.addSpinWin(payout)
}

function checkFreespins(ctx: Context) {
  const scatter = ctx.config.symbols.get("S")!
  const superScatter = ctx.config.symbols.get("SS")!

  const [scatCount] = ctx.services.board.countSymbolsOnBoard(scatter)
  const [superScatCount] = ctx.services.board.countSymbolsOnBoard(superScatter)

  const scatters = scatCount + superScatCount

  const freespinsAwarded = ctx.services.game.getFreeSpinsForScatters(
    ctx.state.currentSpinType,
    scatters,
  )

  // no freespins, return early
  if (freespinsAwarded <= 0) return

  ctx.services.game.awardFreespins(freespinsAwarded)

  if (ctx.state.currentSpinType == SPIN_TYPE.BASE_GAME) {
    ctx.services.data.recordSymbolOccurrence({
      kind: scatters,
      symbolId: scatter.id,
      spinType: ctx.state.currentSpinType,
    })

    ctx.services.data.record({
      triggeredFS: true,
    })

    // TODO FS triggered event
    if (superScatCount > 0) {
      ctx.state.userData.triggeredSuperFreespins = true
      ctx.services.data.record({
        triggeredSuperFS: true,
      })
    }
    ctx.state.currentSpinType = SPIN_TYPE.FREE_SPINS
    playFreeSpins(ctx) // only call while in base game to avoid recursion
    return // return to avoid checking freespins again after they were played
  }

  if (ctx.state.currentSpinType == SPIN_TYPE.FREE_SPINS) {
    // TODO FS retrigger event
    if (superScatCount > 0) {
      // TODO Super FS upgrade event
      ctx.state.userData.triggeredSuperFreespins = true
      ctx.state.userData.freespinsUpgradedToSuper = true
      ctx.services.data.record({
        fsUpgradeToSuper: true,
      })
    }
  }
}

function playFreeSpins(ctx: Context) {
  while (ctx.state.currentFreespinAmount > 0) {
    ctx.state.currentFreespinAmount--
    drawBoard(ctx)
    handleAnticipation(ctx)
    handleWins(ctx)
    ctx.services.wallet.confirmSpinWin(ctx.state.currentSpinType)
    checkFreespins(ctx)
  }
}

function getScatterWeights(key: string) {
  const SCATTER_WEIGHTS = {
    freespins: {
      3: 70,
      4: 25,
      5: 5,
    },
    superFreespins: {
      3: 70,
      4: 15,
      5: 3,
    },
    maxwin: {
      4: 1,
      5: 2,
    },
  }

  if (key in SCATTER_WEIGHTS) {
    return SCATTER_WEIGHTS[key as keyof typeof SCATTER_WEIGHTS]
  }

  return SCATTER_WEIGHTS.freespins
}

function drawDefaultBoard(
  ctx: Context,
  reels: Reels,
  scatter: GameSymbol,
  superScatter: GameSymbol,
) {
  while (true) {
    ctx.services.board.resetBoard()
    ctx.services.board.drawBoardWithRandomStops(reels)

    const scatInvalid = ctx.services.board.isSymbolOnAnyReelMultipleTimes(scatter)
    const superScatInvalid =
      ctx.services.board.isSymbolOnAnyReelMultipleTimes(superScatter)
    const [superScatCount] = ctx.services.board.countSymbolsOnBoard(superScatter)

    if (superScatCount > 1) {
      continue
    }

    if (!scatInvalid && !superScatInvalid) break
  }
}

function drawSuperFSTriggerBoard(
  ctx: Context,
  reels: Reels,
  scatter: GameSymbol,
  superScatter: GameSymbol,
  numScatters: number,
) {
  while (true) {
    ctx.services.board.resetBoard()

    const reelStops = ctx.services.board.combineReelStops(
      ctx.services.board.getReelStopsForSymbol(reels, scatter),
      ctx.services.board.getReelStopsForSymbol(reels, superScatter),
    )
    const scatterReelStops = ctx.services.board.getRandomReelStops(
      reels,
      reelStops,
      numScatters,
    )

    ctx.services.board.drawBoardWithForcedStops(reels, scatterReelStops)

    const scatInvalid = ctx.services.board.isSymbolOnAnyReelMultipleTimes(scatter)
    const superScatInvalid =
      ctx.services.board.isSymbolOnAnyReelMultipleTimes(superScatter)
    const [superScatCount] = ctx.services.board.countSymbolsOnBoard(superScatter)

    if (superScatCount == 1 && !scatInvalid && !superScatInvalid) {
      break
    }
  }
}

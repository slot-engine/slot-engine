import { Board, GameConfig, GameSymbol, HookContext, LinesWinType, Reels } from "core"
import { weightedRandom } from "core/utils"
import { GameType } from ".."

export function onHandleGameFlow(ctx: HookContext<GameType>) {
  drawBoard(ctx)
  ctx.state.book.addEvent({
    type: "test",
    data: { test: 123 },
  })
  handleAnticipation(ctx)
  handleWins(ctx)
  ctx.wallet.confirmSpinWin(ctx.state.currentSpinType)
  checkFreespins(ctx)

  ctx.config.symbols.get("")

  const topReel = new Board(ctx.config)
}

function drawBoard(ctx: HookContext<GameType>) {
  const { state, config } = ctx

  const reels = ctx.getRandomReelset()
  const scatter = config.symbols.get("S")!
  const superScatter = config.symbols.get("SS")!

  let numScatters = Number(
    weightedRandom(getScatterWeights(ctx.state.currentResultSet.criteria), state.rng),
  )
  numScatters = ctx.verifyScatterCount(numScatters)

  if (
    // If super free spins are forced via the result set, draw board with one super scatter
    state.currentResultSet.forceFreespins &&
    state.currentResultSet.userData?.forceSuperFreespins &&
    state.currentSpinType == GameConfig.SPIN_TYPE.BASE_GAME
  ) {
    drawSuperFSTriggerBoard(ctx, reels, scatter, superScatter, numScatters)
  } else if (
    // If free spins are forced via the result set, draw board with scatters
    state.currentResultSet.forceFreespins &&
    state.currentSpinType == GameConfig.SPIN_TYPE.BASE_GAME
  ) {
    while (true) {
      ctx.resetBoard()

      const reelStops = ctx.getReelStopsForSymbol(reels, scatter)
      const scatterReelStops = ctx.getRandomReelStops(reels, reelStops, numScatters)

      ctx.drawBoardWithForcedStops(reels, scatterReelStops)

      const scatInvalid = ctx.isSymbolOnAnyReelMultipleTimes(scatter)
      const [scatCount] = ctx.countSymbolsOnBoard(scatter)
      const [superScatCount] = ctx.countSymbolsOnBoard(superScatter)

      if (superScatCount > 0) continue
      if (scatCount == numScatters && !scatInvalid) break
    }
  } else if (
    // If spin should NOT trigger free spins, draw board with up to 2 scatters
    !state.currentResultSet.forceFreespins &&
    state.currentSpinType == GameConfig.SPIN_TYPE.BASE_GAME
  ) {
    while (true) {
      ctx.resetBoard()
      ctx.drawBoardWithRandomStops(reels)

      const scatInvalid = ctx.isSymbolOnAnyReelMultipleTimes(scatter)
      const superScatInvalid = ctx.isSymbolOnAnyReelMultipleTimes(superScatter)
      const [scatCount] = ctx.countSymbolsOnBoard(scatter)
      const [superScatCount] = ctx.countSymbolsOnBoard(superScatter)
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
    state.currentSpinType == GameConfig.SPIN_TYPE.FREE_SPINS &&
    state.currentResultSet.userData?.upgradeFreespins &&
    !state.userData.freespinsUpgradedToSuper
  ) {
    const result = Math.round(state.rng.randomFloat(1, 100))
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

function handleAnticipation(ctx: HookContext<GameType>) {
  const { state, config, board } = ctx

  const scatter = config.symbols.get("S")!
  const superScatter = config.symbols.get("SS")!

  const [_, scatCount] = ctx.countSymbolsOnBoard(scatter)
  const [__, superScatCount] = ctx.countSymbolsOnBoard(superScatter)

  let count = 0

  for (const [i, reel] of board.reels.entries()) {
    if (count >= config.anticipationTriggers[state.currentSpinType]) {
      board.anticipation[i] = 1
    }
    if (scatCount[i] > 0 || superScatCount[i] > 0) {
      count++
    }
  }
}

function handleWins(ctx: HookContext<GameType>) {
  const lines = new LinesWinType({
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

  const { payout, winCombinations } = lines.context(ctx).evaluateWins().getWins()
  ctx.wallet.addSpinWin(payout)
}

function checkFreespins(ctx: HookContext<GameType>) {
  const scatter = ctx.config.symbols.get("S")!
  const superScatter = ctx.config.symbols.get("SS")!

  const [scatCount] = ctx.countSymbolsOnBoard(scatter)
  const [superScatCount] = ctx.countSymbolsOnBoard(superScatter)

  const scatters = scatCount + superScatCount

  const freespinsAwarded = ctx.getFreeSpinsForScatters(
    ctx.state.currentSpinType,
    scatters,
  )

  // no freespins, return early
  if (freespinsAwarded <= 0) return

  ctx.awardFreespins(freespinsAwarded)

  if (ctx.state.currentSpinType == GameConfig.SPIN_TYPE.BASE_GAME) {
    ctx.recordSymbolOccurrence({
      kind: scatters,
      symbolId: scatter.id,
      spinType: ctx.state.currentSpinType,
    })

    ctx.record({
      triggeredFS: true,
    })

    // TODO FS triggered event
    if (superScatCount > 0) {
      ctx.state.userData.triggeredSuperFreespins = true
      ctx.record({
        triggeredSuperFS: true,
      })
    }
    ctx.state.currentSpinType = GameConfig.SPIN_TYPE.FREE_SPINS
    playFreeSpins(ctx) // only call while in base game to avoid recursion
    return // return to avoid checking freespins again after they were played
  }

  if (ctx.state.currentSpinType == GameConfig.SPIN_TYPE.FREE_SPINS) {
    // TODO FS retrigger event
    if (superScatCount > 0) {
      // TODO Super FS upgrade event
      ctx.state.userData.triggeredSuperFreespins = true
      ctx.state.userData.freespinsUpgradedToSuper = true
      ctx.record({
        fsUpgradeToSuper: true,
      })
    }
  }
}

function playFreeSpins(ctx: HookContext<GameType>) {
  while (ctx.state.currentFreespinAmount > 0) {
    ctx.state.currentFreespinAmount--
    drawBoard(ctx)
    handleAnticipation(ctx)
    handleWins(ctx)
    ctx.wallet.confirmSpinWin(ctx.state.currentSpinType)
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
  ctx: HookContext<GameType>,
  reels: Reels,
  scatter: GameSymbol,
  superScatter: GameSymbol,
) {
  while (true) {
    ctx.resetBoard()
    ctx.drawBoardWithRandomStops(reels)

    const scatInvalid = ctx.isSymbolOnAnyReelMultipleTimes(scatter)
    const superScatInvalid = ctx.isSymbolOnAnyReelMultipleTimes(superScatter)
    const [superScatCount] = ctx.countSymbolsOnBoard(superScatter)

    if (superScatCount > 1) {
      continue
    }

    if (!scatInvalid && !superScatInvalid) break
  }
}

function drawSuperFSTriggerBoard(
  ctx: HookContext<GameType>,
  reels: Reels,
  scatter: GameSymbol,
  superScatter: GameSymbol,
  numScatters: number,
) {
  while (true) {
    ctx.resetBoard()

    const reelStops = ctx.combineReelStops(
      ctx.getReelStopsForSymbol(reels, scatter),
      ctx.getReelStopsForSymbol(reels, superScatter),
    )
    const scatterReelStops = ctx.getRandomReelStops(reels, reelStops, numScatters)

    ctx.drawBoardWithForcedStops(reels, scatterReelStops)

    const scatInvalid = ctx.isSymbolOnAnyReelMultipleTimes(scatter)
    const superScatInvalid = ctx.isSymbolOnAnyReelMultipleTimes(superScatter)
    const [superScatCount] = ctx.countSymbolsOnBoard(superScatter)

    if (superScatCount == 1 && !scatInvalid && !superScatInvalid) {
      break
    }
  }
}

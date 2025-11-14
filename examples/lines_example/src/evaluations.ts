import { SPIN_TYPE } from "@slot-engine/core"
import { GameContextType } from ".."

export function freeSpinsUpgradeEvaluation(ctx: GameContextType) {
  if (ctx.state.currentSpinType === SPIN_TYPE.BASE_GAME) return false
  return ctx.state.userData.freespinsUpgradedToSuper as boolean
}

export function superFreespinsReelsEvaluation(ctx: GameContextType) {
  if (ctx.state.userData.triggeredSuperFreespins) {
    return { superbonus: 1 }
  }
}

export function maxwinReelsEvaluation(ctx: GameContextType) {
  if (
    ctx.state.userData.triggeredSuperFreespins &&
    ctx.state.currentResultSet.forceMaxWin
  ) {
    return { maxwin: 1 }
  }
}

export function upgradeIntoMaxwinReelsEvaluation(ctx: GameContextType) {
  if (ctx.state.userData.triggeredSuperFreespins) {
    return { superbonus: 1, maxwin: 5 }
  }
}

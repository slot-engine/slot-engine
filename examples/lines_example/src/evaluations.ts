import { GameContext, SPIN_TYPE } from "@slot-engine/core"
import { UserStateType } from ".."

export function freeSpinsUpgradeEvaluation(ctx: GameContext<any, any, UserStateType>) {
  if (ctx.state.currentSpinType === SPIN_TYPE.BASE_GAME) return false
  return ctx.state.userData.freespinsUpgradedToSuper as boolean
}

export function superFreespinsReelsEvaluation(ctx: GameContext<any, any, UserStateType>) {
  if (ctx.state.userData.triggeredSuperFreespins) {
    return { superbonus: 1 }
  }
}

export function maxwinReelsEvaluation(ctx: GameContext<any, any, UserStateType>) {
  if (
    ctx.state.userData.triggeredSuperFreespins &&
    ctx.state.currentResultSet.forceMaxWin
  ) {
    return { maxwin: 1 }
  }
}

export function upgradeIntoMaxwinReelsEvaluation(ctx: GameContext<any, any, UserStateType>) {
  if (ctx.state.userData.triggeredSuperFreespins) {
    return { superbonus: 1, maxwin: 5 }
  }
}

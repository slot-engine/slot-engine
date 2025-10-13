import { EvaluationContext, GameConfig } from "core"
import { UserStateType } from ".."

export function freeSpinsUpgradeEvaluation(ctx: EvaluationContext<UserStateType>) {
  if (ctx.state.currentSpinType === GameConfig.SPIN_TYPE.BASE_GAME) return false
  return ctx.state.userData.freespinsUpgradedToSuper as boolean
}

export function superFreespinsReelsEvaluation(ctx: EvaluationContext<UserStateType>) {
  if (ctx.state.userData.triggeredSuperFreespins) {
    return { superbonus: 1 }
  }
}

export function maxwinReelsEvaluation(ctx: EvaluationContext<UserStateType>) {
  if (
    ctx.state.userData.triggeredSuperFreespins &&
    ctx.state.currentResultSet.forceMaxWin
  ) {
    return { maxwin: 1 }
  }
}

export function upgradeIntoMaxwinReelsEvaluation(ctx: EvaluationContext<UserStateType>) {
  if (ctx.state.userData.triggeredSuperFreespins) {
    return { superbonus: 1, maxwin: 5 }
  }
}

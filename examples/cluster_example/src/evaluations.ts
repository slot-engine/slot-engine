import { GameContext } from "@slot-engine/core"
import { UserStateType } from ".."

export function maxwinReelsEvaluation(ctx: GameContext<any, any, UserStateType>) {
  if (ctx.state.currentResultSet.forceMaxWin) {
    return { maxwin: 1 }
  }
}

import { GameContext } from "../game-context"

export class AbstractService {
  /**
   * Function that returns the current game context.
   */
  protected ctx: () => GameContext

  constructor(ctx: () => GameContext) {
    this.ctx = ctx
  }
}

import { GameContext } from "../game-context"

export class AbstractService {
  constructor(protected ctx: () => GameContext) {}
}

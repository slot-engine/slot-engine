import { GameContext } from "../game-context"

export class AbstractService {
  constructor(private ctx: () => GameContext) {}
}

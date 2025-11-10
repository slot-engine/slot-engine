import { AbstractService } from "."
import { GameContext } from "../game-context"
import { AnyGameModes, AnySymbols, AnyUserData, SpinType } from "../types"

export class GameService<
  TGameModes extends AnyGameModes = AnyGameModes,
  TSymbols extends AnySymbols = AnySymbols,
  TUserState extends AnyUserData = AnyUserData,
> extends AbstractService {
  constructor(ctx: () => GameContext<TGameModes, TSymbols, TUserState>) {
    // @ts-ignore TODO: Fix type errors with AnyTypes
    super(ctx)
  }

  /**
   * Retrieves a reel set by its ID within a specific game mode.
   */
  getReelsetById(gameMode: string, id: string) {
    const reelSet = this.ctx().config.gameModes[gameMode]!.reelSets.find(
      (rs) => rs.id === id,
    )
    if (!reelSet) {
      throw new Error(
        `Reel set with id "${id}" not found in game mode "${gameMode}". Available reel sets: ${this.ctx()
          .config.gameModes[gameMode]!.reelSets.map((rs) => rs.id)
          .join(", ")}`,
      )
    }
    return reelSet.reels
  }

  /**
   * Retrieves the number of free spins awarded for a given spin type and scatter count.
   */
  getFreeSpinsForScatters(spinType: SpinType, scatterCount: number) {
    const freespinsConfig = this.ctx().config.scatterToFreespins[spinType]
    if (!freespinsConfig) {
      throw new Error(
        `No free spins configuration found for spin type "${spinType}". Please check your game configuration.`,
      )
    }
    return freespinsConfig[scatterCount] || 0
  }

  /**
   * Retrieves a result set by its criteria within a specific game mode.
   */
  getResultSetByCriteria(mode: string, criteria: string) {
    const gameMode = this.ctx().config.gameModes[mode]
    if (!gameMode) {
      throw new Error(`Game mode "${mode}" not found in game config.`)
    }
    const resultSet = gameMode.resultSets.find((rs) => rs.criteria === criteria)
    if (!resultSet) {
      throw new Error(
        `Criteria "${criteria}" not found in game mode "${mode}". Available criteria: ${gameMode.resultSets
          .map((rs) => rs.criteria)
          .join(", ")}`,
      )
    }
    return resultSet
  }

  /**
   * Returns all configured symbols as an array.
   */
  getSymbolArray() {
    return Array.from(this.ctx().config.symbols).map(([n, v]) => v)
  }
}

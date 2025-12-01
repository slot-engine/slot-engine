import { AbstractService } from "."
import { GameConfig } from "../game-config"
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
   * Intended for internal use only.\
   * Generates reels for all reel sets in the game configuration.
   */
  _generateReels() {
    const config = this.ctx().config
    for (const mode of Object.values(config.gameModes)) {
      if (mode.reelSets && mode.reelSets.length > 0) {
        for (const reelSet of Object.values(mode.reelSets)) {
          reelSet.associatedGameModeName = mode.name
          reelSet.generateReels(config)
        }
      } else {
        throw new Error(
          `Game mode "${mode.name}" has no reel sets defined. Cannot generate reelset files.`,
        )
      }
    }
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

  /**
   * Gets the configuration for the current game mode.
   */
  getCurrentGameMode() {
    return this.ctx().config.gameModes[this.ctx().state.currentGameMode]!
  }

  /**
   * Ensures the requested number of scatters is valid based on the game configuration.\
   * Returns a valid number of scatters.
   */
  verifyScatterCount(numScatters: number) {
    const scatterCounts =
      this.ctx().config.scatterToFreespins[this.ctx().state.currentSpinType]
    if (!scatterCounts) {
      throw new Error(
        `No scatter counts defined for spin type "${this.ctx().state.currentSpinType}". Please check your game configuration.`,
      )
    }
    const validCounts = Object.keys(scatterCounts).map((key) => parseInt(key, 10))
    if (validCounts.length === 0) {
      throw new Error(
        `No scatter counts defined for spin type "${this.ctx().state.currentSpinType}". Please check your game configuration.`,
      )
    }
    if (numScatters < Math.min(...validCounts)) {
      return Math.min(...validCounts)
    }
    if (numScatters > Math.max(...validCounts)) {
      return Math.max(...validCounts)
    }
    return numScatters
  }

  /**
   * Increases the freespin count by the specified amount.
   *
   * Also sets `state.triggeredFreespins` to true.
   */
  awardFreespins(amount: number) {
    this.ctx().state.currentFreespinAmount += amount
    this.ctx().state.totalFreespinAmount += amount
    this.ctx().state.triggeredFreespins = true
  }
}

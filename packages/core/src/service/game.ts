import { AbstractService } from "."
import { GameContext } from "../game-context"
import { AnyGameModes, AnySymbols, AnyUserData, SpinType } from "../types"
import { WinCombination } from "../win-types"

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
   * Increases the freespin count by the specified amount.
   *
   * Also sets `state.triggeredFreespins` to true.
   */
  awardFreespins(amount: number) {
    this.ctx().state.currentFreespinAmount += amount
    this.ctx().state.totalFreespinAmount += amount
    this.ctx().state.triggeredFreespins = true
  }

  /**
   * Dedupes win symbols.
   *
   * Since it may be possible that multiple win combinations include the same symbol (e.g. Wilds),\
   * this method ensures that each symbol is only listed once.
   * 
   * If you want to tumble based on winning symbols, run them through this method first.
   */
  dedupeWinSymbols(winCombinations: WinCombination[]) {
    const symbolsMap = new Map<string, { reelIdx: number; rowIdx: number }>()
    winCombinations.forEach((wc) => {
      wc.symbols.forEach((s) => {
        symbolsMap.set(`${s.reelIndex},${s.posIndex}`, {
          reelIdx: s.reelIndex,
          rowIdx: s.posIndex,
        })
      })
    })
    const symbolsToRemove = Array.from(symbolsMap.values())
    return symbolsToRemove
  }
}

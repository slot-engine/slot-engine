import { AnyGameModes, AnySymbols, AnyUserData, CommonGameOptions, GameHooks } from "../index"
import { GameMode, GameModeName } from "./GameMode"
import { GameSymbol } from "./GameSymbol"

/**
 * Static configuration for a slot game.\
 * This shouldn't change during gameplay.
 */
export class GameConfig<
  TGameModes extends AnyGameModes = AnyGameModes,
  TSymbols extends AnySymbols = AnySymbols,
  TUserState extends AnyUserData = AnyUserData,
> {
  readonly config: {
    readonly id: string
    readonly name: string
    readonly gameModes: Record<GameModeName, GameMode>
    readonly symbols: Map<TSymbols[number]["id"], TSymbols[number]>
    readonly padSymbols?: number
    readonly scatterToFreespins: Record<string, Record<number, number>>
    readonly anticipationTriggers: Record<SpinType, number>
    readonly maxWinX: number
    readonly outputDir: string
    readonly hooks: GameHooks<TGameModes, TSymbols, TUserState>
    readonly userState?: TUserState
  }

  constructor(opts: CommonGameOptions<TGameModes, TSymbols, TUserState>) {
    this.config = {
      id: opts.id,
      name: opts.name,
      gameModes: opts.gameModes,
      symbols: new Map<string, GameSymbol>(),
      padSymbols: opts.padSymbols || 0,
      scatterToFreespins: opts.scatterToFreespins,
      anticipationTriggers: {
        [GameConfig.SPIN_TYPE.BASE_GAME]: getAnticipationTrigger(
          GameConfig.SPIN_TYPE.BASE_GAME,
        ),
        [GameConfig.SPIN_TYPE.FREE_SPINS]: getAnticipationTrigger(
          GameConfig.SPIN_TYPE.FREE_SPINS,
        ),
      },
      maxWinX: opts.maxWinX,
      hooks: opts.hooks,
      userState: opts.userState,
      outputDir: "__build__",
    }

    for (const symbol of opts.symbols) {
      if (!this.config.symbols.has(symbol.id)) {
        this.config.symbols.set(symbol.id, symbol)
      } else {
        console.warn(
          `Symbol with id "${symbol.id}" already exists in the game config. Skipping duplicate. This is probably not intentional.`,
        )
      }
    }

    function getAnticipationTrigger(spinType: string) {
      return Math.min(...Object.keys(opts.scatterToFreespins[spinType]!).map(Number)) - 1
    }
  }

  /**
   * Generates reelset CSV files for all game modes.
   */
  generateReelsetFiles() {
    for (const mode of Object.values(this.config.gameModes)) {
      if (mode.reelSets && mode.reelSets.length > 0) {
        for (const reelGenerator of Object.values(mode.reelSets)) {
          reelGenerator.associatedGameModeName = mode.name
          reelGenerator.outputDir = this.config.outputDir
          reelGenerator.generateReels(this)
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
    const reelSet = this.config.gameModes[gameMode]!.reelSets.find((rs) => rs.id === id)
    if (!reelSet) {
      throw new Error(
        `Reel set with id "${id}" not found in game mode "${gameMode}". Available reel sets: ${this.config.gameModes[
          gameMode
        ]!.reelSets.map((rs) => rs.id).join(", ")}`,
      )
    }
    return reelSet
  }

  /**
   * Retrieves the number of free spins awarded for a given spin type and scatter count.
   */
  getFreeSpinsForScatters(spinType: SpinType, scatterCount: number) {
    const freespinsConfig = this.config.scatterToFreespins[spinType]
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
  getGameModeCriteria(mode: string, criteria: string) {
    const gameMode = this.config.gameModes[mode]
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
    return Array.from(this.config.symbols).map(([n, v]) => v)
  }

  static SPIN_TYPE = {
    BASE_GAME: "basegame",
    FREE_SPINS: "freespins",
  } as const
}

export type SpinType = (typeof GameConfig.SPIN_TYPE)[keyof typeof GameConfig.SPIN_TYPE]

export type AnyGameConfig = GameConfig<any, any, any>

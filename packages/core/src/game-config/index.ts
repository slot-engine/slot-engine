import assert from "assert"
import { AnyGameModes, AnySymbols, AnyUserData, GameHooks } from "../types"
import { SPIN_TYPE } from "../constants"

export interface GameConfigOptions<
  TGameModes extends AnyGameModes = AnyGameModes,
  TSymbols extends AnySymbols = AnySymbols,
  TUserState extends AnyUserData = AnyUserData,
> {
  /**
   * The unique identifier of the game, used for configuration and identification.
   */
  id: string
  /**
   * The name of the game, used for display purposes.
   */
  name: string
  /**
   * A GameMode is the core structure of a slot, defining the board,\
   * bet cost, win type, and other properties.
   */
  gameModes: TGameModes
  /**
   * A list of all symbols that will appear on the reels.
   */
  symbols: TSymbols
  /**
   * A mapping from spin type to scatter counts to the number of free spins awarded.
   *
   * @example
   * ```ts
   * scatterToFreespins: {
   *   [GameConfig.SPIN_TYPE.BASE_GAME]: {
   *     3: 10,
   *     4: 12,
   *     5: 15,
   *   },
   *   [GameConfig.SPIN_TYPE.FREE_SPINS]: {
   *     3: 6,
   *     4: 8,
   *     5: 10,
   *   },
   * },
   * ```
   */
  scatterToFreespins: Record<string, Record<number, number>>
  /**
   * If set, this will pad the board with symbols on the top and bottom of the reels.\
   * Useful for teasing symbols right above or below the active board.
   *
   * Default: 1
   */
  padSymbols?: number
  /**
   * The maximum win multiplier of the game, e.g. 5000 for a 5000x max win.
   */
  maxWinX: number
  /**
   * Custom additional state that can be used in game flow logic.
   */
  userState?: TUserState
  /**
   * Hooks are used to inject custom logic at specific points in the game flow.\
   * Some required hooks must be implemented for certain features to work.
   */
  hooks: GameHooks<TGameModes, TSymbols, TUserState>
}

export function createGameConfig<
  TGameModes extends AnyGameModes = AnyGameModes,
  TSymbols extends AnySymbols = AnySymbols,
  TUserState extends AnyUserData = AnyUserData,
>(opts: GameConfigOptions<TGameModes, TSymbols, TUserState>) {
  const symbols = new Map<keyof TSymbols & string, TSymbols[keyof TSymbols]>()

  for (const [key, value] of Object.entries(opts.symbols)) {
    assert(value.id === key, `Symbol key "${key}" does not match symbol id "${value.id}"`)
    symbols.set(key, value as TSymbols[keyof TSymbols])
  }

  const getAnticipationTrigger = (spinType: string) => {
    return Math.min(...Object.keys(opts.scatterToFreespins[spinType]!).map(Number)) - 1
  }

  return {
    padSymbols: opts.padSymbols || 1,
    userState: opts.userState || ({} as TUserState),
    ...opts,
    symbols,
    anticipationTriggers: {
      [SPIN_TYPE.BASE_GAME]: getAnticipationTrigger(SPIN_TYPE.BASE_GAME),
      [SPIN_TYPE.FREE_SPINS]: getAnticipationTrigger(SPIN_TYPE.FREE_SPINS),
    },
    outputDir: "__build__",
  }
}

export type GameConfig<
  TGameModes extends AnyGameModes = AnyGameModes,
  TSymbols extends AnySymbols = AnySymbols,
  TUserState extends AnyUserData = AnyUserData,
> = Required<Omit<GameConfigOptions<TGameModes, TSymbols, TUserState>, "symbols">> & {
  symbols: Map<keyof TSymbols & string, TSymbols[keyof TSymbols]>
  outputDir: string
  anticipationTriggers: Record<(typeof SPIN_TYPE)[keyof typeof SPIN_TYPE], number>
}

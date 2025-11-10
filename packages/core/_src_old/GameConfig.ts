import assert from "assert"
import {
  AnyGameModes,
  AnySymbols,
  AnyUserData,
  CommonGameOptions,
  GameHooks,
} from "../index"
import { GameMode, GameModeName } from "./GameMode"

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
    readonly symbols: Map<keyof TSymbols & string, TSymbols[keyof TSymbols]>
    readonly padSymbols: number
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
      symbols: new Map(),
      padSymbols: opts.padSymbols || 1,
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

    for (const [key, value] of Object.entries(opts.symbols)) {
      assert(
        value.id === key,
        `Symbol key "${key}" does not match symbol id "${value.id}"`,
      )
      this.config.symbols.set(key, value as TSymbols[keyof TSymbols])
    }

    function getAnticipationTrigger(spinType: string) {
      return Math.min(...Object.keys(opts.scatterToFreespins[spinType]!).map(Number)) - 1
    }
  }


  static SPIN_TYPE = {
    BASE_GAME: "basegame",
    FREE_SPINS: "freespins",
  } as const
}

export type SpinType = (typeof GameConfig.SPIN_TYPE)[keyof typeof GameConfig.SPIN_TYPE]

export type AnyGameConfig = GameConfig<any, any, any>

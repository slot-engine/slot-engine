import { GameConfig } from "../game-config"
import { createGameState, GameState } from "../game-state"
import { AnyGameModes, AnySymbols, AnyUserData } from "../types"

export interface GameContextOptions<
  TGameModes extends AnyGameModes,
  TSymbols extends AnySymbols,
  TUserState extends AnyUserData,
> {
  config: GameConfig<TGameModes, TSymbols, TUserState>
  state?: Partial<GameState>
  services?: {
    rng?: IRngService
    board?: IBoardService
    wallet?: IWalletService
    recorder?: IRecorderService
  }
}

export function createGameContext<
  TGameModes extends AnyGameModes,
  TSymbols extends AnySymbols,
  TUserState extends AnyUserData,
>(opts: GameContextOptions<TGameModes, TSymbols, TUserState>) {
  return {
    config: opts.config,
    state: createGameState(opts.state),
    services: {
      ...opts.services,
    },
  }
}

export type GameContext<
  TGameModes extends AnyGameModes = AnyGameModes,
  TSymbols extends AnySymbols = AnySymbols,
  TUserState extends AnyUserData = AnyUserData,
> = ReturnType<typeof createGameContext<TGameModes, TSymbols, TUserState>>

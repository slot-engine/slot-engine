import { GameConfig } from "../game-config"
import { createGameState, GameState } from "../game-state"
import { BoardService } from "../service/board"
import { DataService } from "../service/data"
import { GameService } from "../service/game"
import { WalletService } from "../service/wallet"
import { AnyGameModes, AnySymbols, AnyUserData } from "../types"

export interface GameContextOptions<
  TGameModes extends AnyGameModes,
  TSymbols extends AnySymbols,
  TUserState extends AnyUserData,
> {
  config: GameConfig<TGameModes, TSymbols, TUserState>
  state?: Partial<GameState<TUserState>>
  services?: Partial<GameContextServices>
}

export function createGameContext<
  TGameModes extends AnyGameModes,
  TSymbols extends AnySymbols,
  TUserState extends AnyUserData,
>(opts: GameContextOptions<TGameModes, TSymbols, TUserState>) {
  const context = {
    config: opts.config,
    state: createGameState(opts.state),
    services: {} as GameContextServices,
  }

  const getContext = () => context

  function createServices() {
    return {
      game: new GameService(getContext),
      data: new DataService(getContext),
      board: new BoardService(getContext),
      wallet: new WalletService(getContext),
      rng: {},
      ...opts.services,
    }
  }

  context.services = createServices()

  return context
}

export type GameContext<
  TGameModes extends AnyGameModes = AnyGameModes,
  TSymbols extends AnySymbols = AnySymbols,
  TUserState extends AnyUserData = AnyUserData,
> = {
  config: GameConfig<TGameModes, TSymbols, TUserState>
  state: GameState<TUserState>
  services: GameContextServices
}

export interface GameContextServices {
  game: GameService
  data: DataService
  board: BoardService
  wallet: WalletService
  rng: any
}

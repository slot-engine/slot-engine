import { GameConfig } from "../game-config"
import { AnyGameModes, AnySymbols, AnyUserData } from "../types"

export interface GameContext<
  TGameModes extends AnyGameModes = AnyGameModes,
  TSymbols extends AnySymbols = AnySymbols,
  TUserState extends AnyUserData = AnyUserData,
> {
  config: GameConfig<TGameModes, TSymbols, TUserState>
  state: GameState
  services: {
    rng: IRngService
    board: IBoardService
    wallet: IWalletService
    recorder: IRecorderService
  }
}
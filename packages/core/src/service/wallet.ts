import { AbstractService } from "."
import { GameContext } from "../game-context"
import { AnyGameModes, AnySymbols, AnyUserData } from "../types"

export class WalletService<
  TGameModes extends AnyGameModes = AnyGameModes,
  TSymbols extends AnySymbols = AnySymbols,
  TUserState extends AnyUserData = AnyUserData,
> extends AbstractService {
  constructor(ctx: () => GameContext<TGameModes, TSymbols, TUserState>) {
    // @ts-ignore TODO: Fix type errors with AnyTypes
    super(ctx)
  }
}

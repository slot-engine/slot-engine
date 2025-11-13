import { GameConfigOptions } from "./game-config"
import { SlotGame } from "./slot-game"
import { AnyGameModes, AnySymbols, AnyUserData, InferGameType } from "./types"

export function createSlotGame<TGame>(
  opts: TGame extends InferGameType<infer G, infer S, infer U>
    ? GameConfigOptions<G, S, U>
    : never,
) {
  return new SlotGame(opts) as TGame
}

export const defineUserState = <TUserState extends AnyUserData>(data: TUserState) => data

export const defineSymbols = <TSymbols extends AnySymbols>(symbols: TSymbols) => symbols

export const defineGameModes = <TGameModes extends AnyGameModes>(gameModes: TGameModes) =>
  gameModes

import { expect, test } from "vitest"
import { SimulationContext } from "../src/Simulation"
import { defineGameModes, InferGameType } from ".."
import { defineSymbols } from ".."
import { defineUserState } from ".."

const gameModes = defineGameModes({})
type GameModesType = typeof gameModes

const symbols = defineSymbols({})
type SymbolsType = typeof symbols

const userState = defineUserState({})
type UserStateType = typeof userState

type GameType = InferGameType<GameModesType, SymbolsType, UserStateType>

const context = new SimulationContext<GameModesType, SymbolsType, UserStateType>({
  id: "",
  name: "",
  maxWinX: 1000,
  scatterToFreespins: {},
  gameModes,
  symbols,
  userState,
  hooks: {
    onHandleGameFlow: () => {},
  }
})

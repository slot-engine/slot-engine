import assert from "assert"
import { AnyGameModes, AnySymbols, AnyUserData, CommonGameOptions } from "../index"
import { randomItem, weightedRandom } from "../utils"
import { GameState } from "./GameState"
import { GameSymbol } from "./GameSymbol"
import { Reels } from "./ReelGenerator"
import { AnySimulationContext } from "./Simulation"


/**
 * Extends GameState. Provides board-related functionality.
 */
export class Board<
  TGameModes extends AnyGameModes,
  TSymbols extends AnySymbols,
  TUserState extends AnyUserData,
> extends GameState<TGameModes, TSymbols, TUserState> {
  board: {
    reels: Reels
    paddingTop: Reels
    paddingBottom: Reels
    lastDrawnReelStops: number[]
    lastUsedReels: Reels
    anticipation: number[]
  }

  constructor(opts: CommonGameOptions<TGameModes, TSymbols, TUserState>) {
    super(opts)

    this.board = {
      reels: [],
      paddingTop: [],
      paddingBottom: [],
      anticipation: [],
      lastDrawnReelStops: [],
      lastUsedReels: [],
    }
  }

  


}

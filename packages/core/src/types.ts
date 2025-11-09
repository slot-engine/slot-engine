import { SPIN_TYPE } from "./constants"
import { GameContext } from "./game-context"
import { GameMode } from "./game-mode"
import { GameSymbol } from "./game-symbol"
import { SlotGame } from "./slot-game"

export interface GameState {}

export type InferGameType<
  TGameModes extends AnyGameModes,
  TSymbols extends AnySymbols,
  TUserState extends AnyUserData,
> = SlotGame<TGameModes, TSymbols, TUserState>

/**
 * @internal
 */
export type AnyUserData = Record<string, any>

/**
 * @internal
 */
export type AnyGameModes = Record<string, GameMode>

/**
 * @internal
 */
export type AnySymbols = Record<string, GameSymbol>

/**
 * @internal
 */
export interface GameHooks<
  TGameModes extends AnyGameModes = AnyGameModes,
  TSymbols extends AnySymbols = AnySymbols,
  TUserState extends AnyUserData = AnyUserData,
> {
  /**
   * This hook is called after the simulation state is prepared for a spin,\
   * and the core is ready to handle the game flow.
   *
   * **The developer is responsible for implementing the entire game flow here, including:**
   * - Drawing the board
   * - Evaluating wins
   * - Tumbling mechanics
   * - Updating wallet
   * - Handling free spins
   * - Recording events
   * - ... and everything in between.
   *
   * You can access the config and state from the context.
   *
   * The game flow is not built into the core, because it can vary greatly between different games.\
   * This hook provides the flexibility to implement any game flow you need.
   */
  onHandleGameFlow: (ctx: GameContext<TGameModes, TSymbols, TUserState>) => void
  /**
   * This hook is called whenever a simulation is accepted, i.e. when the criteria of the current ResultSet is met.
   */
  onSimulationAccepted?: (ctx: GameContext<TGameModes, TSymbols, TUserState>) => void
}

/**
 * @internal
 */
export interface PendingRecord {
  bookId: number
  properties: Record<string, string>
}

/**
 * @internal
 */
export interface RecordItem {
  search: Array<{ name: string; value: string }>
  timesTriggered: number
  bookIds: number[]
}

export type SpinType = (typeof SPIN_TYPE)[keyof typeof SPIN_TYPE]

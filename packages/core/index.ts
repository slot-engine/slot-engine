import { GameConfig } from "./src/GameConfig"
import { type SimulationContext } from "./src/Simulation"
import { GameMode, GameModeName } from "./src/GameMode"
import { GameSymbol } from "./src/GameSymbol"
import { ReelGenerator, Reels } from "./src/ReelGenerator"
import { ResultSet, EvaluationContext } from "./src/ResultSet"
import { StandaloneBoard } from "./src/Board"
import { WinType } from "./src/WinType"
import { LinesWinType } from "./src/winTypes/LinesWinType"
import { ClusterWinType } from "./src/winTypes/ClusterWinType"
import { ManywaysWinType } from "./src/winTypes/ManywaysWinType"
import { OptimizationConditions } from "./src/optimizer/OptimizationConditions"
import { OptimizationScaling } from "./src/optimizer/OptimizationScaling"
import { OptimizationParameters } from "./src/optimizer/OptimizationParameters"
import { SlotGame } from "./src/SlotGame"
export { weightedRandom } from "./utils"

export {
  StandaloneBoard,
  GameConfig,
  GameMode,
  GameSymbol,
  WinType,
  LinesWinType,
  ClusterWinType,
  ManywaysWinType,
  OptimizationConditions,
  OptimizationScaling,
  OptimizationParameters,
  ReelGenerator,
  ResultSet,
  type Reels,
}

/**
 * @internal
 */
export interface CommonGameOptions<
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
   *
   * One-off mechanisms can also be injected into the core game logic from here.
   */
  gameModes: Record<GameModeName, GameMode>

  /**
   * A list of all symbols that will appear on the reels.
   */
  symbols: GameSymbol[]
  /**
   * A mapping from spin type to scatter counts to the number of free spins awarded.
   *
   * @example
   * ```ts
   * scatterToFreespins: {
   *   [GameConfig.CONSTANTS.BASE_GAME]: {
   *     3: 10,
   *     4: 12,
   *     5: 15,
   *   },
   *   [GameConfig.CONSTANTS.FREE_SPINS]: {
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
   * Hooks are used to inject custom logic at specific points in the game flow.\
   * Some required hooks must be implemented for certain features to work.
   */
  hooks: GameHooks<TGameModes, TSymbols, TUserState>
  /**
   * Custom additional state that can be used in game flow logic.
   */
  userState?: TUserState
}

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
export type AnySymbols = GameSymbol[]

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
  onHandleGameFlow: (ctx: SimulationContext<TGameModes, TSymbols, TUserState>) => void
  /**
   * This hook is called whenever a simulation is accepted, i.e. when the criteria of the current ResultSet is met.
   */
  onSimulationAccepted?: (
    ctx: SimulationContext<TGameModes, TSymbols, TUserState>,
  ) => void
}

export type InferUserState<T> = T extends SlotGame<infer U> ? U : never

export type HookContext<T> =
  T extends SlotGame<infer G, infer S, infer U> ? SimulationContext<G, S, U> : never

export { type EvaluationContext }

export type InferGameType<
  TGameModes extends AnyGameModes,
  TSymbols extends AnySymbols,
  TUserState extends AnyUserData,
> = SlotGame<TGameModes, TSymbols, TUserState>

export interface CreateSlotGameOpts<
  TGameModes extends AnyGameModes = AnyGameModes,
  TSymbols extends AnySymbols = AnySymbols,
  TUserState extends AnyUserData = AnyUserData,
> {
  id: CommonGameOptions["id"]
  name: CommonGameOptions["name"]
  gameModes: TGameModes
  symbols: TSymbols
  scatterToFreespins: CommonGameOptions["scatterToFreespins"]
  padSymbols?: CommonGameOptions["padSymbols"]
  maxWinX: CommonGameOptions["maxWinX"]
  userState?: TUserState
  hooks: CommonGameOptions<TGameModes, TSymbols, TUserState>["hooks"]
}

export function createSlotGame<TGame>(
  opts: TGame extends InferGameType<infer G, infer S, infer U>
    ? CreateSlotGameOpts<G, S, U>
    : never,
) {
  return new SlotGame(opts) as TGame
}

export const defineUserState = <TUserState extends AnyUserData>(data: TUserState) => data

export const defineSymbols = <TSymbol extends GameSymbol>(symbols: TSymbol[]) => symbols

export const defineGameModes = <TGameModes extends AnyGameModes>(gameModes: TGameModes) =>
  gameModes

export const defineReelSets = <TSymbols extends AnySymbols>(reelSets: ReelGenerator[]) =>
  reelSets

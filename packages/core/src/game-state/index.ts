import { RandomNumberGenerator } from "../../utils"
import { AnyUserData, SpinType } from "../types"
import { SPIN_TYPE } from "../constants"

export interface GameStateOptions<TUserState extends AnyUserData> {
  currentSimulationId: number
  /**
   * e.g. "base", "freespins", etc. (depending on the game config)
   */
  currentGameMode: string
  /**
   * Spin type constant as defined in `GameConfig.SPIN_TYPE`
   */
  currentSpinType: SpinType
  /**
   * The current ResultSet for the active simulation run.
   */
  currentResultSet: ResultSet<any>
  /**
   * Whether the criteria in the ResultSet for the current simulation has been met.
   */
  isCriteriaMet: boolean
  /**
   * Number of freespins remaining in the current freespin round.
   */
  currentFreespinAmount: number
  /**
   * Total amount of freespins awarded during the active simulation.
   */
  totalFreespinAmount: number
  /**
   * A library of all completed books, indexed by their ID.
   */
  library: Map<string, Book>
  /**
   * The current book being recorded.
   */
  book: Book
  /**
   * Seeded random number generator instance for the current simulation.
   */
  rng: RandomNumberGenerator
  /**
   * Custom user data that can be used in game flow logic.
   */
  userData: TUserState
  /**
   * Whether a max win has been triggered during the active simulation.
   */
  triggeredMaxWin: boolean
  /**
   * Whether freespins have been triggered during the active simulation.
   */
  triggeredFreespins: boolean
}

export function createGameState<TUserState extends AnyUserData = AnyUserData>(
  opts?: Partial<GameStateOptions<TUserState>>,
) {
  return {
    currentSimulationId: opts?.currentSimulationId || 0,
    currentGameMode: opts?.currentGameMode || "N/A",
    currentSpinType: opts?.currentSpinType || SPIN_TYPE.BASE_GAME,
    currentResultSet:
      opts?.currentResultSet ||
      new ResultSet({
        criteria: "N/A",
        quota: 0,
        reelWeights: {
          [SPIN_TYPE.BASE_GAME]: {},
          [SPIN_TYPE.FREE_SPINS]: {},
        },
      }),
    isCriteriaMet: opts?.isCriteriaMet || false,
    currentFreespinAmount: opts?.currentFreespinAmount || 0,
    totalFreespinAmount: opts?.totalFreespinAmount || 0,
    library: opts?.library || new Map(),
    book: opts?.book || new Book({ id: 0 }),
    rng: opts?.rng || new RandomNumberGenerator(),
    userData: opts?.userData || ({} as TUserState),
    triggeredMaxWin: opts?.triggeredMaxWin || false,
    triggeredFreespins: opts?.triggeredFreespins || false,
  }
}

export type GameState<TUserState extends AnyUserData = AnyUserData> = ReturnType<
  typeof createGameState<TUserState>
>

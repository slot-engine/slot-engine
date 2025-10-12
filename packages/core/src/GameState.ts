import { GameConfig, SpinType } from "./GameConfig"
import { Wallet } from "./Wallet"
import { Book } from "./Book"
import { ResultSet } from "./ResultSet"
import { RandomNumberGenerator } from "../utils"
import { AnyGameModes, AnySymbols, AnyUserData, CommonGameOptions } from ".."

/**
 * The GameState manages the current state of the game.
 */
export class GameState<
  TGameModes extends AnyGameModes,
  TSymbols extends AnySymbols,
  TUserState extends AnyUserData,
> extends GameConfig<TGameModes, TSymbols, TUserState> {
  state: {
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

  /**
   * The wallet stores win data for the current and all simulations, respectively.
   */
  wallet: Wallet

  /**
   * Recorder for statistical analysis (e.g. symbol occurrences, etc.).
   */
  private recorder: {
    pendingRecords: PendingRecord[]
    readonly records: RecordItem[]
  }

  constructor(opts: CommonGameOptions<TGameModes, TSymbols, TUserState>) {
    super(opts)

    this.state = {
      currentSpinType: GameConfig.SPIN_TYPE.BASE_GAME,
      library: new Map(),
      book: new Book({ id: 0 }),
      currentGameMode: "N/A",
      currentSimulationId: 0,
      isCriteriaMet: false,
      currentFreespinAmount: 0,
      totalFreespinAmount: 0,
      rng: new RandomNumberGenerator(),
      userData: opts.userState || ({} as TUserState),
      triggeredMaxWin: false,
      triggeredFreespins: false,
      // This is a placeholder ResultSet to avoid null checks elsewhere.
      currentResultSet: new ResultSet({
        criteria: "N/A",
        quota: 0,
        reelWeights: {
          [GameConfig.SPIN_TYPE.BASE_GAME]: {},
          [GameConfig.SPIN_TYPE.FREE_SPINS]: {},
        },
      }),
    }

    this.wallet = new Wallet()

    this.recorder = {
      pendingRecords: [],
      records: [],
    }
  }

  /**
   * Gets the configuration for the current game mode.
   */
  getCurrentGameMode() {
    return this.config.gameModes[this.state.currentGameMode]!
  }

  resetState() {
    this.state.rng.setSeedIfDifferent(this.state.currentSimulationId)
    this.state.book = new Book({ id: this.state.currentSimulationId })
    this.state.currentSpinType = GameConfig.SPIN_TYPE.BASE_GAME
    this.state.currentFreespinAmount = 0
    this.state.totalFreespinAmount = 0
    this.state.triggeredMaxWin = false
    this.state.triggeredFreespins = false
    this.wallet.resetCurrentWin()
    this.clearPendingRecords()
    this.state.userData = this.config.userState || ({} as TUserState)
  }

  /**
   * Checks if a max win is reached by comparing `wallet.currentWin` to `config.maxWin`.
   *
   * Should be called after `wallet.confirmSpinWin()`.
   */
  isMaxWinTriggered() {}

  /**
   * Empties the list of pending records in the recorder.
   */
  clearPendingRecords() {
    this.recorder.pendingRecords = []
  }

  /**
   * Confirms all pending records and adds them to the main records list.
   */
  confirmRecords() {
    for (const pendingRecord of this.recorder.pendingRecords) {
      const search = Object.entries(pendingRecord.properties)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => a.name.localeCompare(b.name))

      let record = this.recorder.records.find((r) => {
        if (r.search.length !== search.length) return false
        for (let i = 0; i < r.search.length; i++) {
          if (r.search[i]!.name !== search[i]!.name) return false
          if (r.search[i]!.value !== search[i]!.value) return false
        }
        return true
      })
      if (!record) {
        record = {
          search,
          timesTriggered: 0,
          bookIds: [],
        }
        this.recorder.records.push(record)
      }
      record.timesTriggered++
      if (!record.bookIds.includes(pendingRecord.bookId)) {
        record.bookIds.push(pendingRecord.bookId)
      }
    }

    this.clearPendingRecords()
  }

  /**
   * Record data for statistical analysis.
   */
  record(data: Record<string, string | number | boolean>) {
    this.recorder.pendingRecords.push({
      bookId: this.state.currentSimulationId,
      properties: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)]),
      ),
    })
  }

  /**
   * Records a symbol occurrence for statistical analysis.
   *
   * Calls `this.record()` with the provided data.
   */
  recordSymbolOccurrence(data: {
    kind: number
    symbolId: string
    spinType: SpinType
    [key: string]: any
  }) {
    this.record(data)
  }

  /**
   * Gets all confirmed records.
   */
  getRecords() {
    return this.recorder.records
  }

  /**
   * Moves the current book to the library and resets the current book.
   */
  moveBookToLibrary() {
    this.state.library.set(this.state.book.id.toString(), this.state.book)
    this.state.book = new Book({ id: 0 })
  }

  /**
   * Increases the freespin count by the specified amount.
   *
   * Also sets `state.triggeredFreespins` to true.
   */
  awardFreespins(amount: number) {
    this.state.currentFreespinAmount += amount
    this.state.totalFreespinAmount += amount
    this.state.triggeredFreespins = true
  }
}

interface PendingRecord {
  bookId: number
  properties: Record<string, string>
}

export interface RecordItem {
  search: Array<{ name: string; value: string }>
  timesTriggered: number
  bookIds: number[]
}

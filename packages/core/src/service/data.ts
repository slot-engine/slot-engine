import { AbstractService } from "."
import { Book } from "../book"
import { GameContext } from "../game-context"
import {
  AnyGameModes,
  AnySymbols,
  AnyUserData,
  PendingRecord,
  RecordItem,
  SpinType,
} from "../types"

export class DataService<
  TGameModes extends AnyGameModes = AnyGameModes,
  TSymbols extends AnySymbols = AnySymbols,
  TUserState extends AnyUserData = AnyUserData,
> extends AbstractService {
  /**
   * Recorder for statistical analysis (e.g. symbol occurrences, etc.).
   */
  private recorder: {
    pendingRecords: PendingRecord[]
    readonly records: RecordItem[]
  }

  /**
   * Book for recording win data of a single simulation.
   */
  book: Book

  constructor(ctx: () => GameContext<TGameModes, TSymbols, TUserState>) {
    // @ts-ignore TODO: Fix type errors with AnyTypes
    super(ctx)

    this.recorder = {
      pendingRecords: [],
      records: [],
    }

    this.book = new Book({ id: 0 })
  }

  /**
   * Record data for statistical analysis.
   */
  record(data: Record<string, string | number | boolean>) {
    this.recorder.pendingRecords.push({
      bookId: this.ctx().state.currentSimulationId,
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
}

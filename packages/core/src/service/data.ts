import assert from "assert"
import { AbstractService } from "."
import { GameContext } from "../game-context"
import { Recorder } from "../recorder"
import { AnyGameModes, AnySymbols, AnyUserData, SpinType } from "../types"
import { Book } from "../book"

export class DataService<
  TGameModes extends AnyGameModes = AnyGameModes,
  TSymbols extends AnySymbols = AnySymbols,
  TUserState extends AnyUserData = AnyUserData,
> extends AbstractService {
  private recorder!: Recorder
  private book!: Book

  constructor(ctx: () => GameContext<TGameModes, TSymbols, TUserState>) {
    // @ts-ignore TODO: Fix type errors with AnyTypes
    super(ctx)
  }

  private ensureRecorder() {
    assert(this.recorder, "Recorder not set in DataService. Call setRecorder() first.")
  }

  private ensureBook() {
    assert(this.book, "Book not set in DataService. Call setBook() first.")
  }

  /**
   * Intended for internal use only.
   */
  _setRecorder(recorder: Recorder) {
    this.recorder = recorder
  }

  /**
   * Intended for internal use only.
   */
  _setBook(book: Book) {
    this.book = book
  }

  /**
   * Intended for internal use only.
   */
  _getRecords() {
    this.ensureRecorder()
    return this.recorder.records
  }

  /**
   * Record data for statistical analysis.
   */
  record(data: Record<string, string | number | boolean>) {
    this.ensureRecorder()

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
   * Calls `ctx.services.data.record()` with the provided data.
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
   * Adds an event to the book.
   */
  addBookEvent = this.book.addEvent.bind(this.book)

  /**
   * Intended for internal use only.
   */
  _clearPendingRecords() {
    this.ensureRecorder()
    this.recorder.pendingRecords = []
  }
}

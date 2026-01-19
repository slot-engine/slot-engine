import { AbstractService } from "."
import { GameContext } from "../game-context"
import { Recorder } from "../recorder"
import { AnyGameModes, AnySymbols, AnyUserData, SpinType } from "../types"
import { Book, BookEvent } from "../book"
import { isMainThread, parentPort } from "worker_threads"

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

  /**
   * Intended for internal use only.
   */
  _setRecorder(recorder: Recorder) {
    this.recorder = recorder
  }

  /**
   * Intended for internal use only.
   */
  _getBook() {
    return this.book
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
  _getRecorder() {
    return this.recorder
  }

  /**
   * Intended for internal use only.
   */
  _getRecords() {
    return this.recorder.records
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
  addBookEvent(event: Omit<BookEvent, "index">) {
    this.book.addEvent(event)
  }

  /**
   * Write a log message to the terminal UI.
   */
  log(message: string) {
    if (isMainThread) return
    parentPort?.postMessage({ type: "user-log", message })
  }

  /**
   * Intended for internal use only.
   */
  _clearPendingRecords() {
    this.recorder.pendingRecords = []
  }
}

import { AbstractService } from "."
import { GameContext } from "../game-context"
import { Tagger } from "../tagger"
import { AnyGameModes, AnySymbols, AnyUserData, SpinType } from "../types"
import { Book, BookEvent } from "../book"
import { isMainThread, parentPort } from "worker_threads"

export class DataService<
  TGameModes extends AnyGameModes = AnyGameModes,
  TSymbols extends AnySymbols = AnySymbols,
  TUserState extends AnyUserData = AnyUserData,
> extends AbstractService {
  private tagger!: Tagger
  private book!: Book

  constructor(ctx: () => GameContext<TGameModes, TSymbols, TUserState>) {
    // @ts-ignore TODO: Fix type errors with AnyTypes
    super(ctx)
  }

  /**
   * Intended for internal use only.
   */
  _setTagger(tagger: Tagger) {
    this.tagger = tagger
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
  _getTagger() {
    return this.tagger
  }

  /**
   * Intended for internal use only.
   */
  _getTags() {
    return this.tagger.tags
  }

  /**
   * Tag the current simulation for statistical analysis and book filtering.
   */
  tag(data: Record<string, string | number | boolean>) {
    if (this.ctx().state.isDryRun) return

    const properties: Record<string, string> = {}
    for (const key in data) {
      properties[key] = String(data[key])
    }

    this.tagger.pendingTags.push({
      bookId: this.ctx().state.currentSimulationId,
      properties,
    })
  }

  /**
   * Tags a symbol occurrence for statistical analysis.
   *
   * Calls `ctx.services.data.tag()` with the provided data.
   */
  tagSymbolOccurrence(data: { kind: number; symbolId: string; [key: string]: any }) {
    this.tag({
      ...data,
      spinType: this.ctx().state.currentSpinType,
    })
  }

  /**
   * Adds an event to the book.
   */
  addBookEvent(event: Omit<BookEvent, "index">) {
    if (this.ctx().state.isDryRun) return
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
  _clearPendingTags() {
    this.tagger.pendingTags = []
  }
}

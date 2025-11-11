import { SPIN_TYPE } from "../constants"
import { GameContext } from "../game-context"

export class Book {
  protected id: number
  protected criteria: string = "N/A"
  protected events: BookEvent[] = []
  protected payout: number = 0
  protected basegameWins: number = 0
  protected freespinsWins: number = 0

  constructor(opts: BookOpts) {
    this.id = opts.id
  }

  setId(id: number) {
    this.id = id
  }

  setCriteria(criteria: string) {
    this.criteria = criteria
  }

  /**
   * Adds an event to the book.
   */
  addEvent(event: Omit<BookEvent, "index">) {
    const index = this.events.length + 1
    this.events.push({ index, ...event })
  }

  /**
   * Transfers the win data from the wallet to the book.
   */
  writePayout(ctx: GameContext) {
    function process(number: number) {
      return Math.round(Math.min(number, ctx.config.maxWinX) * 100) / 100
    }

    this.payout = Math.round(process(ctx.wallet.getCurrentWin()) * 100)
    this.basegameWins = process(
      ctx.wallet.getCurrentWinPerSpinType()[SPIN_TYPE.BASE_GAME] || 0,
    )
    this.freespinsWins = process(
      ctx.wallet.getCurrentWinPerSpinType()[SPIN_TYPE.FREE_SPINS] || 0,
    )
  }

  getPayout() {
    return this.payout
  }

  getBasegameWins() {
    return this.basegameWins
  }

  getFreespinsWins() {
    return this.freespinsWins
  }

  serialize() {
    return {
      id: this.id,
      criteria: this.criteria,
      events: this.events,
      payout: this.payout,
      basegameWins: this.basegameWins,
      freespinsWins: this.freespinsWins,
    }
  }

  static fromSerialized(data: ReturnType<Book["serialize"]>) {
    const book = new Book({ id: data.id })
    book.criteria = data.criteria
    book.events = data.events
    book.payout = data.payout
    book.basegameWins = data.basegameWins
    book.freespinsWins = data.freespinsWins
    return book
  }
}

export interface BookEvent {
  index: number
  type: string
  data: Record<string, any>
}

interface BookOpts {
  id: number
}

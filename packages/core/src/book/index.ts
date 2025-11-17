import { SPIN_TYPE } from "../constants"
import { GameContext } from "../game-context"
import { Wallet } from "../wallet"

export class Book {
  readonly id: number
  criteria: string = "N/A"
  events: BookEvent[] = []
  payout: number = 0
  basegameWins: number = 0
  freespinsWins: number = 0

  constructor(opts: BookOpts) {
    this.id = opts.id
  }

  /**
   * Intended for internal use only.
   */
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
   * Intended for internal use only.
   */
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

  /**
   * Intended for internal use only.
   */
  static fromSerialized(data: ReturnType<Book["serialize"]>) {
    const book = new Book({ id: data.id, criteria: data.criteria })
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
  criteria: string
}

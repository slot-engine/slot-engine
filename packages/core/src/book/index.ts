import { copy } from "../../utils"

export class Book {
  id: number
  criteria: string = "N/A"
  events: BookEvent[] = []
  payout: number = 0
  basegameWins: number = 0
  freespinsWins: number = 0

  constructor(opts: BookOpts) {
    this.id = opts.id
    this.criteria = opts.criteria
  }

  /**
   * Intended for internal use only.
   */
  _reset(id: number, criteria: string) {
    this.id = id
    this.criteria = criteria
    this.events = []
    this.payout = 0
    this.basegameWins = 0
    this.freespinsWins = 0
  }

  /**
   * Intended for internal use only.
   */
  _setCriteria(criteria: string) {
    this.criteria = criteria
  }

  /**
   * Adds an event to the book.
   */
  addEvent(event: Omit<BookEvent, "index">) {
    this.events.push({
      index: this.events.length + 1,
      type: event.type,
      data: copy(event.data),
    })
  }

  /**
   * Intended for internal use only.
   */
  _serialize() {
    return {
      id: this.id,
      criteria: this.criteria,
      events: this.events,
      payout: this.payout,
      basegameWins: this.basegameWins,
      freespinsWins: this.freespinsWins,
    }
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

export interface WrittenBook {
  id: number
  payoutMultiplier: number
  events: BookEvent[]
}

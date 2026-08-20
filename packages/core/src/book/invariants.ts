import { Book } from "./index"

const TERMINAL_TYPES = new Set(["finalWin", "roundResult"])

/**
 * Stake / FE contract checks on an accepted book before it is written.
 * Index sequence is always enforced. Terminal-event + amount checks apply
 * when a finalWin/roundResult is present so custom event-only games still sim.
 */
export function assertBookInvariants(book: Book, opts?: { maxWinX?: number }) {
  const events = book.events
  for (let i = 0; i < events.length; i++) {
    const ev = events[i]!
    if (ev.index !== i) {
      throw new Error(
        `Book ${book.id}: event indices must be 0..N-1 sequential, but index ${i} is ${ev.index}.`,
      )
    }
    if (!ev.type) {
      throw new Error(`Book ${book.id}: event ${i} has an empty type.`)
    }
  }

  const last = events[events.length - 1]
  if (last && TERMINAL_TYPES.has(last.type)) {
    const amount = last.data?.amount ?? last.data?.payoutMultiplier ?? last.data?.payout
    if (typeof amount === "number" && book.payout >= 0) {
      const asCents = Math.round(amount)
      const asMultiplierCents = Math.round(amount * 100)
      if (asCents !== book.payout && asMultiplierCents !== book.payout) {
        throw new Error(
          `Book ${book.id}: terminal amount ${amount} does not match payoutMultiplier ${book.payout} (cents).`,
        )
      }
    }
  }

  if (opts?.maxWinX != null && book.payout > Math.round(opts.maxWinX * 100)) {
    throw new Error(
      `Book ${book.id}: payout ${book.payout} exceeds maxWinX ${opts.maxWinX}x in cent units.`,
    )
  }
}

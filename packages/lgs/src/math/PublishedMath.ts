import fs from "fs/promises"
import { parseLookupTable } from "@slot-engine/core"
import { LgsError } from "../errors"
import type { ForcedOutcome, GameMath, Outcome } from "."

export interface BookSource {
  read(mode: string, bookId: number): Promise<{ events: unknown[] } | undefined>
}

export interface PublishedMathOptions {
  lookupTablePath(mode: string): string
  books: BookSource
  random: () => number
}

interface Row {
  bookId: number
  payoutCents: number
}

interface ModeTable {
  /** Rows with a positive weight, for the weighted draw. */
  weighted: { rows: Row[]; cumulativeWeights: number[]; totalWeight: number }
  /** Every row, zero weights included. */
  payoutByBook: Map<number, number>
  /** Every row grouped by payout, ascending. */
  booksByPayout: Array<{ payoutCents: number; bookIds: [number, ...number[]] }>
}

/**
 * Picks outcomes the way the RGS does: a weighted draw over the published lookup
 * table, then the drawn book's events. A forced outcome replaces the draw.
 */
export class PublishedMath implements GameMath {
  private readonly tables = new Map<string, Promise<ModeTable>>()

  constructor(private readonly opts: PublishedMathOptions) {}

  async pick(mode: string, force?: ForcedOutcome): Promise<Outcome> {
    const table = await this.table(mode)
    const { bookId, payoutCents } = force
      ? forcedRow(table, mode, force, this.opts.random)
      : drawnRow(table, mode, this.opts.random)

    const book = await this.opts.books.read(mode, bookId)
    if (!book) {
      throw new LgsError("missing-book", `Book ${bookId} of mode "${mode}" not found`)
    }
    return { bookId, payoutCents, events: book.events }
  }

  private table(mode: string) {
    const cached = this.tables.get(mode)
    if (cached) return cached

    const loading = loadTable(this.opts.lookupTablePath(mode))
    this.tables.set(mode, loading)
    loading.catch(() => this.tables.delete(mode))
    return loading
  }
}

async function loadTable(filePath: string): Promise<ModeTable> {
  const content = await fs.readFile(filePath, "utf-8").catch(() => {
    throw new LgsError("missing-math", `Lookup table not found at ${filePath}`)
  })

  const table: ModeTable = {
    weighted: { rows: [], cumulativeWeights: [], totalWeight: 0 },
    payoutByBook: new Map(),
    booksByPayout: [],
  }
  const { weighted } = table
  const byPayout = new Map<number, [number, ...number[]]>()
  for (const [bookId, weight, payoutCents] of parseLookupTable(content)) {
    table.payoutByBook.set(bookId, payoutCents)
    const books = byPayout.get(payoutCents)
    if (books) books.push(bookId)
    else byPayout.set(payoutCents, [bookId])
    if (weight <= 0) continue
    weighted.totalWeight += weight
    weighted.rows.push({ bookId, payoutCents })
    weighted.cumulativeWeights.push(weighted.totalWeight)
  }
  table.booksByPayout = [...byPayout]
    .map(([payoutCents, bookIds]) => ({ payoutCents, bookIds }))
    .sort((a, b) => a.payoutCents - b.payoutCents)
  return table
}

function drawnRow(table: ModeTable, mode: string, random: () => number): Row {
  const { rows, cumulativeWeights, totalWeight } = table.weighted
  const row = rows[findRow(cumulativeWeights, random() * totalWeight)]
  if (!row) {
    throw new LgsError(
      "missing-math",
      `Lookup table for mode "${mode}" has no weighted rows`,
    )
  }
  return row
}

function forcedRow(
  table: ModeTable,
  mode: string,
  force: ForcedOutcome,
  random: () => number,
): Row {
  if ("bookId" in force) {
    const payoutCents = table.payoutByBook.get(force.bookId)
    if (payoutCents === undefined) {
      throw new LgsError(
        "unknown-book",
        `Book ${force.bookId} is not in the lookup table of mode "${mode}"`,
      )
    }
    return { bookId: force.bookId, payoutCents }
  }

  const group = closestPayout(table.booksByPayout, Math.round(force.payoutMultiplier * 100))
  if (!group) {
    throw new LgsError("missing-math", `Lookup table for mode "${mode}" has no rows`)
  }
  const { bookIds, payoutCents } = group
  return { bookId: bookIds[Math.floor(random() * bookIds.length)] ?? bookIds[0], payoutCents }
}

/** The group whose payout is nearest to `target`; on a tie the lower payout. */
function closestPayout(groups: ModeTable["booksByPayout"], target: number) {
  let low = 0
  let high = groups.length
  while (low < high) {
    const mid = (low + high) >> 1
    if ((groups[mid]?.payoutCents ?? 0) < target) low = mid + 1
    else high = mid
  }
  const above = groups[low]
  const below = groups[low - 1]
  if (!below) return above
  if (!above) return below
  return target - below.payoutCents <= above.payoutCents - target ? below : above
}

/** Index of the first cumulative weight above `target`. */
function findRow(cumulativeWeights: number[], target: number) {
  let low = 0
  let high = cumulativeWeights.length - 1
  while (low < high) {
    const mid = (low + high) >> 1
    if ((cumulativeWeights[mid] ?? 0) > target) high = mid
    else low = mid + 1
  }
  return low
}

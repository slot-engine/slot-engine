import fs from "fs/promises"
import { parseLookupTable } from "@slot-engine/core"
import { LgsError, unknownBook } from "../errors"
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

interface FileStamp {
  mtimeMs: number
  size: number
}

interface CachedTable {
  stamp: FileStamp
  table: Promise<ModeTable>
}

/**
 * Picks outcomes the way the RGS does: a weighted draw over the published lookup
 * table, then the drawn book's events. A forced outcome replaces the draw.
 */
export class PublishedMath implements GameMath {
  private readonly tables = new Map<string, CachedTable>()

  constructor(private readonly opts: PublishedMathOptions) {}

  async pick(mode: string, force?: ForcedOutcome): Promise<Outcome> {
    if (force && "bookId" in force) {
      const outcome = await this.read(mode, force.bookId)
      if (!outcome) throw unknownBook(mode, force.bookId)
      return outcome
    }

    const table = await this.table(mode)
    const row = force
      ? closestRow(table, mode, force.payoutMultiplier, this.opts.random)
      : drawnRow(table, mode, this.opts.random)
    return this.outcome(mode, row)
  }

  async read(mode: string, bookId: number): Promise<Outcome | undefined> {
    const payoutCents = (await this.table(mode)).payoutByBook.get(bookId)
    if (payoutCents === undefined) return undefined
    return this.outcome(mode, { bookId, payoutCents })
  }

  private async outcome(mode: string, { bookId, payoutCents }: Row): Promise<Outcome> {
    const book = await this.opts.books.read(mode, bookId)
    if (!book) {
      throw new LgsError("missing-book", `Book ${bookId} of mode "${mode}" not found`)
    }
    return { bookId, payoutCents, events: book.events }
  }

  private async table(mode: string): Promise<ModeTable> {
    const filePath = this.opts.lookupTablePath(mode)
    const stamp = await fileStamp(filePath)
    const cached = this.tables.get(mode)
    if (cached && sameStamp(cached.stamp, stamp)) return cached.table

    const loading: CachedTable = { stamp, table: loadTable(filePath) }
    this.tables.set(mode, loading)
    loading.table.catch(() => {
      if (this.tables.get(mode) === loading) this.tables.delete(mode)
    })
    return loading.table
  }
}

async function fileStamp(filePath: string): Promise<FileStamp> {
  const stats = await fs.stat(filePath).catch(() => {
    throw new LgsError("missing-math", `Lookup table not found at ${filePath}`)
  })
  return { mtimeMs: stats.mtimeMs, size: stats.size }
}

function sameStamp(a: FileStamp, b: FileStamp) {
  return a.mtimeMs === b.mtimeMs && a.size === b.size
}

async function loadTable(filePath: string): Promise<ModeTable> {
  const content = await fs.readFile(filePath, "utf-8")

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

function closestRow(
  table: ModeTable,
  mode: string,
  payoutMultiplier: number,
  random: () => number,
): Row {
  const group = closestPayout(table.booksByPayout, Math.round(payoutMultiplier * 100))
  if (!group) {
    throw new LgsError("missing-math", `Lookup table for mode "${mode}" has no rows`)
  }
  const { bookIds, payoutCents } = group
  return {
    bookId: bookIds[Math.floor(random() * bookIds.length)] ?? bookIds[0],
    payoutCents,
  }
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

import fs from "fs"
import assert from "assert"
import { RandomNumberGenerator } from "../rng"
import chalk from "chalk"

export function hashStringToInt(input: string) {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Deterministic seed for retry attempt `retry` of simulation `simId` (retry 0 = simId). */
export function retrySeed(simId: number, retry: number): number {
  if (retry <= 0) return simId
  const hashed = hashStringToInt(`${simId}:retry:${retry}`)
  return hashed === 0 ? simId + retry : hashed
}

/** Per-ResultSet retry ceiling — exact multipliers fail fast; maxwin keeps the full budget. */
export function retryBudgetForResultSet(rs: {
  forceMaxWin?: boolean
  multiplier?: number | [number, number]
}): number {
  if (rs.forceMaxWin) return 50_000
  if (typeof rs.multiplier === "number") return 8_000
  if (Array.isArray(rs.multiplier)) return 20_000
  return 25_000
}

export function splitCountsAcrossChunks(
  totalCounts: Record<string, number>,
  chunkSizes: number[],
) {
  const total = chunkSizes.reduce((a, b) => a + b, 0)
  const allCriteria = Object.keys(totalCounts)

  const totalCountsSum = allCriteria.reduce((s, c) => s + (totalCounts[c] ?? 0), 0)
  assert(
    totalCountsSum === total,
    `Counts (${totalCountsSum}) must match chunk total (${total}).`,
  )

  const perChunk: Array<Record<string, number>> = chunkSizes.map(() => ({}))

  // First pass
  for (const criteria of allCriteria) {
    const count = totalCounts[criteria] ?? 0
    if (count <= 0) {
      for (let i = 0; i < chunkSizes.length; i++) perChunk[i]![criteria] = 0
      continue
    }

    // Hamilton / largest-remainder: keep fractional parts BEFORE flooring.
    // (Flooring first made every remainder 0 and handed leftovers to chunk 0.)
    const raw = chunkSizes.map((size) => (count * size) / total)
    const chunks = raw.map((x) => Math.floor(x))
    let remaining = count - chunks.reduce((a, b) => a + b, 0)

    const remainders = raw
      .map((x, i) => ({ i, r: x - Math.floor(x) }))
      .sort((a, b) => b.r - a.r)

    for (let i = 0; i < chunkSizes.length; i++) {
      perChunk[i]![criteria] = chunks[i]!
    }

    let idx = 0
    while (remaining > 0) {
      perChunk[remainders[idx]!.i]![criteria]! += 1
      remaining--
      idx = (idx + 1) % remainders.length
    }
  }

  // Second pass, try to fix any rounding issues
  const chunkTotals = () =>
    perChunk.map((m) => Object.values(m).reduce((s, v) => s + v, 0))
  let totals = chunkTotals()

  const getDeficits = () => totals.map((t, i) => chunkSizes[i]! - t)
  let deficits = getDeficits()

  for (let target = 0; target < chunkSizes.length; target++) {
    while (deficits[target]! > 0) {
      // find a chunk with surplus
      const src = deficits.findIndex((d) => d < 0)
      assert(src !== -1, "No surplus chunk found, but deficits remain.")

      // find a criteria to move
      const crit = allCriteria.find((c) => (perChunk[src]![c] ?? 0) > 0)
      assert(crit, `No movable criteria found from surplus chunk ${src}.`)

      perChunk[src]![crit]! -= 1
      perChunk[target]![crit] = (perChunk[target]![crit] ?? 0) + 1

      totals[src]! -= 1
      totals[target]! += 1
      deficits[src]! += 1
      deficits[target]! -= 1
    }
  }

  totals = chunkTotals()
  for (let i = 0; i < chunkSizes.length; i++) {
    assert(
      totals[i] === chunkSizes[i],
      `Chunk ${i} size mismatch. Expected ${chunkSizes[i]}, got ${totals[i]}`,
    )
  }
  for (const c of allCriteria) {
    const sum = perChunk.reduce((s, m) => s + (m[c] ?? 0), 0)
    assert(sum === (totalCounts[c] ?? 0), `Chunk split mismatch for criteria "${c}"`)
  }

  return perChunk
}

export function createCriteriaSampler(counts: Record<string, number>, seed: number) {
  const rng = new RandomNumberGenerator()
  rng.setSeed(seed)

  const keys = Object.keys(counts).filter((k) => (counts[k] ?? 0) > 0)
  const remaining = Object.fromEntries(keys.map((k) => [k, counts[k] ?? 0])) as Record<
    string,
    number
  >
  let remainingTotal = Object.values(remaining).reduce((a, b) => a + b, 0)

  return () => {
    if (remainingTotal <= 0) return "N/A"

    const roll = Math.min(
      remainingTotal - Number.EPSILON,
      rng.randomFloat(0, remainingTotal),
    )

    let acc = 0
    for (const k of keys) {
      const w = remaining[k] ?? 0
      if (w <= 0) continue
      acc += w
      if (roll < acc) {
        remaining[k] = w - 1
        remainingTotal--
        return k
      }
    }

    // Fallback
    remainingTotal--
    return keys.find((k) => (remaining[k] ?? 0) > 0) ?? "N/A"
  }
}

export async function makeLutIndexFromPublishLut(
  lutPublishPath: string,
  lutIndexPath: string,
) {
  console.log(chalk.gray(`Regenerating LUT index file...`))

  if (!fs.existsSync(lutPublishPath)) {
    console.warn(
      chalk.yellow(
        `LUT publish file does not exist when regenerating index file: ${lutPublishPath}`,
      ),
    )
    return
  }

  try {
    const lutPublishStream = fs.createReadStream(lutPublishPath, {
      highWaterMark: 500 * 1024 * 1024,
    })
    const rl = require("readline").createInterface({
      input: lutPublishStream,
      crlfDelay: Infinity,
    })

    const lutIndexStream = fs.createWriteStream(lutIndexPath, {
      highWaterMark: 500 * 1024 * 1024,
    })
    let offset = 0n

    for await (const line of rl) {
      if (!line.trim()) continue
      const indexBuffer = Buffer.alloc(8)
      indexBuffer.writeBigUInt64LE(offset)
      if (!lutIndexStream.write(indexBuffer)) {
        await new Promise<void>((resolve) => lutIndexStream.once("drain", resolve))
      }
      offset += BigInt(Buffer.byteLength(line + "\n", "utf8"))
    }

    lutIndexStream.end()
    await new Promise<void>((resolve) => lutIndexStream.on("finish", resolve))
  } catch (error) {
    throw new Error(`Error generating LUT index from publish LUT: ${error}`)
  }
}

export function assertLookupIdsSequential(lutPath: string, mode: string) {
  if (!fs.existsSync(lutPath)) {
    throw new Error(`Publish LUT missing for mode "${mode}": ${lutPath}`)
  }
  const ids: number[] = []
  const text = fs.readFileSync(lutPath, "utf8")
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue
    const id = Number(line.split(",")[0])
    if (!Number.isFinite(id)) {
      throw new Error(`Mode "${mode}": invalid LUT id on line "${line}"`)
    }
    ids.push(id)
  }
  if (ids.length === 0) {
    throw new Error(`Mode "${mode}": publish LUT is empty`)
  }
  const sorted = [...ids].sort((a, b) => a - b)
  const min = sorted[0]!
  const max = sorted[sorted.length - 1]!
  if (sorted.length !== new Set(sorted).size) {
    throw new Error(`Mode "${mode}": duplicate book ids in publish LUT`)
  }
  if (max - min + 1 !== sorted.length) {
    throw new Error(
      `Mode "${mode}": LUT ids are not a contiguous range ${min}..${max} (got ${sorted.length} ids).`,
    )
  }
}

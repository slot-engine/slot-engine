import fs from "fs"
import readline from "readline"

/**
 * A lookup table loaded into memory as parallel arrays.
 */
export interface LutData {
  /**
   * Book ids, in file order.
   */
  ids: number[]
  /**
   * Prior weights (the second CSV column), in file order.
   */
  weights: number[]
  /**
   * Raw payout values (the third CSV column, payout multiplier * 100), in file order.
   */
  payouts: number[]
}

/**
 * Reads a lookup table CSV (`bookId,weight,payout`) into memory.
 */
export async function readLookupTable(filePath: string): Promise<LutData> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Lookup table file does not exist: ${filePath}`)
  }

  const ids: number[] = []
  const weights: number[] = []
  const payouts: number[] = []

  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity,
  })

  let lineNum = 0
  for await (const line of rl) {
    lineNum++
    if (!line.trim()) continue
    const parts = line.split(",")
    const id = Number(parts[0])
    const weight = Number(parts[1])
    const payout = Number(parts[2])
    if (!Number.isFinite(id) || !Number.isFinite(weight) || !Number.isFinite(payout)) {
      throw new Error(`Invalid lookup table line ${lineNum} in ${filePath}: "${line}"`)
    }
    ids.push(id)
    weights.push(weight)
    payouts.push(payout)
  }

  if (ids.length === 0) {
    throw new Error(`Lookup table is empty: ${filePath}`)
  }

  return { ids, weights, payouts }
}

/**
 * Reads a segmented lookup table CSV (`bookId,criteria,basegameWins,freespinsWins`)
 * and returns a map from book id to criteria name.
 */
export async function readCriteriaMap(filePath: string): Promise<Map<number, string>> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Segmented lookup table file does not exist: ${filePath}`)
  }

  const map = new Map<number, string>()

  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity,
  })

  let lineNum = 0
  for await (const line of rl) {
    lineNum++
    if (!line.trim()) continue
    const parts = line.split(",")
    const id = Number(parts[0])
    const criteria = parts[1]
    if (!Number.isFinite(id) || !criteria) {
      throw new Error(
        `Invalid segmented lookup table line ${lineNum} in ${filePath}: "${line}"`,
      )
    }
    map.set(id, criteria)
  }

  return map
}

/**
 * Writes a lookup table CSV (`bookId,weight,payout`), preserving the input order.
 */
export async function writeLookupTable(
  filePath: string,
  ids: number[],
  weights: ArrayLike<number>,
  payouts: number[],
) {
  const stream = fs.createWriteStream(filePath, { highWaterMark: 16 * 1024 * 1024 })

  const batchSize = 10_000
  let batch: string[] = []

  for (let i = 0; i < ids.length; i++) {
    batch.push(`${ids[i]},${weights[i]},${payouts[i]}\n`)
    if (batch.length >= batchSize) {
      if (!stream.write(batch.join(""))) {
        await new Promise<void>((resolve) => stream.once("drain", resolve))
      }
      batch = []
    }
  }

  if (batch.length > 0) {
    stream.write(batch.join(""))
  }

  stream.end()
  await new Promise<void>((resolve, reject) => {
    stream.on("finish", resolve)
    stream.on("error", reject)
  })
}

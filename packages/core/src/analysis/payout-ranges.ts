import type { PayoutRangeBreakdown, PayoutStatistics } from "."
import type { LookupTable, LookupTableSegmented } from "../types"
import { getTotalLutWeight } from "./utils"

const WIN_RANGES: [number, number][] = [
  [0, 0.1],
  [0, 0.99],
  [1, 1.99],
  [2, 2.99],
  [3, 4.99],
  [5, 9.99],
  [10, 19.99],
  [20, 49.99],
  [50, 99.99],
  [100, 199.99],
  [200, 499.99],
  [500, 999.99],
  [1000, 1999.99],
  [2000, 2999.99],
  [3000, 4999.99],
  [5000, 7499.99],
  [7500, 9999.99],
  [10000, 14999.99],
  [15000, 19999.99],
  [20000, 24999.99],
  [25000, 49999.99],
  [50000, 74999.99],
  [75000, 99999.99],
  [100000, Infinity],
]

type RangeBucket = { count: number; payouts: Set<number>; weight: number }
type RangeBuckets = Map<string, RangeBucket>
type BucketValue = (bucket: RangeBucket) => number

export function computePayoutStatistics(
  gameMode: string,
  lutSegmented: LookupTableSegmented,
  lutPublished: LookupTable,
): PayoutStatistics {
  const weightByBook = new Map(lutPublished.map(([bookId, weight]) => [bookId, weight]))
  const totalWeight = getTotalLutWeight(lutPublished)
  const overall: RangeBuckets = new Map()
  const criteria = new Map<string, RangeBuckets>()

  for (const [bookId, crit, basePayout, freeSpinPayout] of lutSegmented) {
    const payout = basePayout + freeSpinPayout
    const rangeKey = findRangeKey(payout)
    if (rangeKey === undefined) continue

    const weight = weightByBook.get(bookId) ?? 0
    const critBuckets = getOrCreate(criteria, crit, () => new Map())
    addBook(getOrCreate(overall, rangeKey, createBucket), payout, weight)
    addBook(getOrCreate(critBuckets, rangeKey, createBucket), payout, weight)
  }

  const breakdown = (value: BucketValue): PayoutRangeBreakdown => ({
    overall: toRangeRecord(overall, value),
    criteria: Object.fromEntries(
      [...criteria].map(([crit, buckets]) => [crit, toRangeRecord(buckets, value)]),
    ),
  })

  return {
    gameMode,
    allPayouts: breakdown((bucket) => bucket.count),
    uniquePayouts: breakdown((bucket) => bucket.payouts.size),
    payoutChances: breakdown((bucket) =>
      totalWeight === 0 ? 0 : bucket.weight / totalWeight,
    ),
  }
}

function findRangeKey(payout: number) {
  const range = WIN_RANGES.find(([min, max]) => payout >= min && payout <= max)
  return range && `${range[0]}-${range[1]}`
}

function createBucket(): RangeBucket {
  return { count: 0, payouts: new Set(), weight: 0 }
}

function addBook(bucket: RangeBucket, payout: number, weight: number) {
  bucket.count += 1
  bucket.payouts.add(payout)
  bucket.weight += weight
}

function getOrCreate<K, V>(map: Map<K, V>, key: K, create: () => NoInfer<V>) {
  const existing = map.get(key)
  if (existing !== undefined) return existing
  const created = create()
  map.set(key, created)
  return created
}

function toRangeRecord(buckets: RangeBuckets, value: BucketValue) {
  const entries = [...buckets].map(
    ([rangeKey, bucket]) => [rangeKey, value(bucket)] as const,
  )
  return Object.fromEntries(entries.sort(([a], [b]) => rangeStart(a) - rangeStart(b)))
}

function rangeStart(rangeKey: string) {
  return Number(rangeKey.split("-")[0])
}

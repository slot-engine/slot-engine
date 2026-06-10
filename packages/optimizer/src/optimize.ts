import fs from "fs"
import path from "path"
import { readLookupTable, readCriteriaMap, writeLookupTable } from "./lut"
import {
  PayoutGroup,
  InfeasibleError,
  solveTilt,
  tiltedDistribution,
  achievableRange,
} from "./solver"
import { OptimizeOptions, OptimizeResult, CriteriaResult } from "./types"

const DEFAULT_WEIGHT_SCALE = 2 ** 50
const DEFAULT_PAYOUT_DIVISOR = 100

interface CriteriaData {
  name: string
  /** Indexes into the LUT arrays of all books belonging to this criteria. */
  bookIndexes: number[]
  /** Scaled prior weight per book (parallel to bookIndexes). */
  scaledPriors: number[]
  /** Index into the unique payout group per book (parallel to bookIndexes). */
  groupIndexes: number[]
  /** Unique payouts (multiplier units) with prior masses. */
  group: PayoutGroup
  /** Target probability of this criteria occurring. */
  probability: number
}

/**
 * Optimizes a lookup table so the game pays out exactly the configured RTP,
 * with the configured hit rates and payout distribution per criteria.
 *
 * Reads the unoptimized lookup table, assigns new weights by solving a convex
 * optimization problem (minimum KL-divergence from the simulated distribution,
 * subject to hit rate and RTP constraints), and writes the optimized lookup table.
 *
 * Book ids, order and payouts of the output are identical to the input - only
 * the weights change.
 */
export async function optimize(opts: OptimizeOptions): Promise<OptimizeResult> {
  const weightScale = opts.weightScale ?? DEFAULT_WEIGHT_SCALE
  const payoutDivisor = opts.payoutDivisor ?? DEFAULT_PAYOUT_DIVISOR
  const verbose = opts.verbose ?? true

  validateOptions(opts, weightScale, payoutDivisor)

  if (verbose) console.log(`Optimizing lookup table: ${opts.input.lookupTable}`)

  const lut = await readLookupTable(opts.input.lookupTable)
  const criteriaMap = await readCriteriaMap(opts.input.lookupTableSegmented)

  const criteriaData = groupByCriteria(lut, criteriaMap, opts, payoutDivisor)
  assignProbabilities(criteriaData, opts)
  const tilts = solveTilts(criteriaData, opts)

  // Compute final per-book probabilities and integer weights
  const finalWeights = new Float64Array(lut.ids.length)

  for (const data of criteriaData.values()) {
    const mu = tilts.get(data.name)!
    const q = tiltedDistribution(data.group, mu, data.probability)

    for (let i = 0; i < data.bookIndexes.length; i++) {
      const groupIdx = data.groupIndexes[i]!
      const bookProb = (q[groupIdx]! * data.scaledPriors[i]!) / data.group.ms[groupIdx]!
      finalWeights[data.bookIndexes[i]!] = Math.round(bookProb * weightScale)
    }
  }

  const result = buildResult(lut, criteriaData, finalWeights, opts, weightScale)

  fs.mkdirSync(path.dirname(opts.output.lookupTable), { recursive: true })
  await writeLookupTable(opts.output.lookupTable, lut.ids, finalWeights, lut.payouts)

  if (verbose) printSummary(result, opts)

  return result
}

function validateOptions(
  opts: OptimizeOptions,
  weightScale: number,
  payoutDivisor: number,
) {
  if (!(opts.cost > 0)) {
    throw new Error(`Invalid cost: ${opts.cost}. Must be > 0.`)
  }
  if (!(opts.rtp > 0) || opts.rtp >= 1) {
    throw new Error(`Invalid rtp: ${opts.rtp}. Must be between 0 and 1 (exclusive).`)
  }
  if (!(weightScale >= 1) || !Number.isFinite(weightScale)) {
    throw new Error(`Invalid weightScale: ${weightScale}. Must be a finite number >= 1.`)
  }
  if (!(payoutDivisor > 0)) {
    throw new Error(`Invalid payoutDivisor: ${payoutDivisor}. Must be > 0.`)
  }

  const targets = Object.entries(opts.targets)
  if (targets.length === 0) {
    throw new Error("No optimization targets defined.")
  }

  for (const [criteria, target] of targets) {
    if (target.rtp !== undefined && target.avgWin !== undefined) {
      throw new Error(
        `Optimization target "${criteria}" defines both "rtp" and "avgWin". Define at most one of them.`,
      )
    }
    if (target.hitRate !== undefined && !(target.hitRate >= 1)) {
      throw new Error(
        `Optimization target "${criteria}" has an invalid hitRate: ${target.hitRate}. Must be >= 1 (a hit rate of N means "1 in N spins").`,
      )
    }
    if (target.rtp !== undefined && (target.rtp < 0 || target.rtp > opts.rtp)) {
      throw new Error(
        `Optimization target "${criteria}" has an invalid rtp: ${target.rtp}. Must be between 0 and the game mode RTP (${opts.rtp}).`,
      )
    }
    if (target.avgWin !== undefined && target.avgWin < 0) {
      throw new Error(
        `Optimization target "${criteria}" has an invalid avgWin: ${target.avgWin}. Must be >= 0.`,
      )
    }
    for (const rule of target.scale ?? []) {
      if (!(rule.factor > 0)) {
        throw new Error(
          `Optimization target "${criteria}" has a scale rule with an invalid factor: ${rule.factor}. Must be > 0.`,
        )
      }
      if (rule.winRange[0] > rule.winRange[1]) {
        throw new Error(
          `Optimization target "${criteria}" has a scale rule with an invalid winRange: [${rule.winRange}]. Min must be <= max.`,
        )
      }
    }
  }

  const absorbers = targets.filter(([, t]) => t.hitRate === undefined)
  if (absorbers.length > 1) {
    throw new Error(
      `Only one optimization target may omit "hitRate" (it absorbs the remaining probability), but ${absorbers.length} do: ${absorbers
        .map(([c]) => `"${c}"`)
        .join(", ")}.`,
    )
  }
}

function groupByCriteria(
  lut: { ids: number[]; weights: number[]; payouts: number[] },
  criteriaMap: Map<number, string>,
  opts: OptimizeOptions,
  payoutDivisor: number,
) {
  // Collect books per criteria
  const byCriteria = new Map<
    string,
    { bookIndexes: number[]; scaledPriors: number[]; payoutMultipliers: number[] }
  >()

  for (let i = 0; i < lut.ids.length; i++) {
    const id = lut.ids[i]!
    const criteria = criteriaMap.get(id)
    if (!criteria) {
      throw new Error(
        `Book ${id} from the lookup table has no entry in the segmented lookup table.`,
      )
    }

    let entry = byCriteria.get(criteria)
    if (!entry) {
      entry = { bookIndexes: [], scaledPriors: [], payoutMultipliers: [] }
      byCriteria.set(criteria, entry)
    }

    const x = lut.payouts[i]! / payoutDivisor
    const target = opts.targets[criteria]

    let prior = lut.weights[i]!
    if (target?.scale) {
      for (const rule of target.scale) {
        if (x >= rule.winRange[0] && x <= rule.winRange[1]) {
          prior *= rule.factor
        }
      }
    }

    entry.bookIndexes.push(i)
    entry.scaledPriors.push(prior)
    entry.payoutMultipliers.push(x)
  }

  // Validate target <-> criteria coverage
  const targetNames = Object.keys(opts.targets)
  const missingTargets = [...byCriteria.keys()].filter((c) => !targetNames.includes(c))
  if (missingTargets.length > 0) {
    throw new Error(
      `No optimization target defined for criteria: ${missingTargets.map((c) => `"${c}"`).join(", ")}.`,
    )
  }
  const unknownTargets = targetNames.filter((c) => !byCriteria.has(c))
  if (unknownTargets.length > 0) {
    throw new Error(
      `Optimization targets defined for criteria that do not exist in the lookup table: ${unknownTargets
        .map((c) => `"${c}"`)
        .join(", ")}.`,
    )
  }

  // Build unique payout groups
  const criteriaData = new Map<string, CriteriaData>()

  for (const [name, entry] of byCriteria) {
    const uniquePayouts = [...new Set(entry.payoutMultipliers)].sort((a, b) => a - b)
    const payoutToGroup = new Map<number, number>()
    uniquePayouts.forEach((x, j) => payoutToGroup.set(x, j))

    const xs = new Float64Array(uniquePayouts)
    const ms = new Float64Array(uniquePayouts.length)
    const groupIndexes: number[] = []

    for (let i = 0; i < entry.bookIndexes.length; i++) {
      const j = payoutToGroup.get(entry.payoutMultipliers[i]!)!
      ms[j]! += entry.scaledPriors[i]!
      groupIndexes.push(j)
    }

    criteriaData.set(name, {
      name,
      bookIndexes: entry.bookIndexes,
      scaledPriors: entry.scaledPriors,
      groupIndexes,
      group: { xs, ms },
      probability: 0,
    })
  }

  return criteriaData
}

function assignProbabilities(
  criteriaData: Map<string, CriteriaData>,
  opts: OptimizeOptions,
) {
  let absorber: CriteriaData | undefined
  let probabilitySum = 0

  for (const data of criteriaData.values()) {
    const target = opts.targets[data.name]!
    if (target.hitRate === undefined) {
      absorber = data
      continue
    }
    data.probability = 1 / target.hitRate
    probabilitySum += data.probability
  }

  if (absorber) {
    const remaining = 1 - probabilitySum
    if (remaining <= 0) {
      throw new Error(
        `The hit rates of all optimization targets sum to a probability of ${probabilitySum}, leaving nothing for criteria "${absorber.name}" (which has no hitRate and absorbs the remaining probability).`,
      )
    }
    absorber.probability = remaining
  } else if (Math.abs(probabilitySum - 1) > 1e-6) {
    throw new Error(
      `The hit rates of all optimization targets must sum to a probability of exactly 1, but they sum to ${probabilitySum}. ` +
        `Either adjust the hit rates, or omit "hitRate" on one target to make it absorb the remaining probability.`,
    )
  }
}

function solveTilts(criteriaData: Map<string, CriteriaData>, opts: OptimizeOptions) {
  const tilts = new Map<string, number>()
  const free: CriteriaData[] = []
  const requiredTotal = opts.rtp * opts.cost
  let fixedTotal = 0

  for (const data of criteriaData.values()) {
    const target = opts.targets[data.name]!
    const { xs } = data.group

    // Mean payout multiplier per hit this criteria must achieve
    let meanTarget: number | undefined
    if (target.rtp !== undefined) {
      meanTarget = (target.rtp * opts.cost) / data.probability
    } else if (target.avgWin !== undefined) {
      meanTarget = target.avgWin
    }

    if (xs.length === 1) {
      // Single unique payout: the contribution is fixed, no tilt possible
      const x = xs[0]!
      if (meanTarget !== undefined && Math.abs(meanTarget - x) > Math.max(x, 1) * 1e-6) {
        throw new Error(
          `Optimization target "${data.name}" requires an average win of ${meanTarget}x, ` +
            `but all of its results pay exactly ${x}x. Remove the rtp/avgWin target or adjust the hit rate.`,
        )
      }
      tilts.set(data.name, 0)
      fixedTotal += data.probability * x
      continue
    }

    if (meanTarget !== undefined) {
      try {
        const mu = solveTilt([{ group: data.group, p: 1 }], meanTarget)
        tilts.set(data.name, mu)
        fixedTotal += data.probability * meanTarget
      } catch (error) {
        if (error instanceof InfeasibleError) {
          throw new Error(
            `Optimization target "${data.name}" is infeasible: it requires an average win of ${meanTarget}x per hit, ` +
              `but the simulated results only allow a range of (${error.achievableMin}x, ${error.achievableMax}x). ` +
              `Adjust the rtp/avgWin/hitRate of this target, or simulate more fitting results.`,
          )
        }
        throw error
      }
      continue
    }

    free.push(data)
  }

  const residual = requiredTotal - fixedTotal

  if (free.length === 0) {
    if (Math.abs(residual) > Math.max(requiredTotal, 1) * 1e-6) {
      throw new Error(
        `The optimization targets pin a total RTP of ${(fixedTotal / opts.cost).toFixed(6)}, ` +
          `but the game mode RTP is ${opts.rtp}. ` +
          `Omit rtp/avgWin on at least one target so it can absorb the remaining RTP, or adjust the targets.`,
      )
    }
    return tilts
  }

  try {
    const mu = solveTilt(
      free.map((data) => ({ group: data.group, p: data.probability })),
      residual,
    )
    for (const data of free) {
      tilts.set(data.name, mu)
    }
  } catch (error) {
    if (error instanceof InfeasibleError) {
      const freeNames = free.map((d) => `"${d.name}"`).join(", ")
      const [min, max] = achievableRange(
        free.map((data) => ({ group: data.group, p: data.probability })),
      )
      throw new Error(
        `The game mode RTP of ${opts.rtp} is infeasible: after the pinned targets, ` +
          `the criteria ${freeNames} must contribute an RTP of ${(residual / opts.cost).toFixed(6)}, ` +
          `but their results only allow a range of (${(min / opts.cost).toFixed(6)}, ${(max / opts.cost).toFixed(6)}). ` +
          `Adjust the targets or simulate more fitting results.`,
      )
    }
    throw error
  }

  return tilts
}

function buildResult(
  lut: { ids: number[]; weights: number[]; payouts: number[] },
  criteriaData: Map<string, CriteriaData>,
  finalWeights: Float64Array,
  opts: OptimizeOptions,
  weightScale: number,
): OptimizeResult {
  const payoutDivisor = opts.payoutDivisor ?? DEFAULT_PAYOUT_DIVISOR

  let totalWeight = 0
  let totalPayout = 0
  for (let i = 0; i < lut.ids.length; i++) {
    totalWeight += finalWeights[i]!
    totalPayout += finalWeights[i]! * (lut.payouts[i]! / payoutDivisor)
  }

  if (totalWeight <= 0) {
    throw new Error("Optimization produced a lookup table with a total weight of 0.")
  }

  const criteria: Record<string, CriteriaResult> = {}

  for (const data of criteriaData.values()) {
    let sumW = 0
    let sumWx = 0
    let zeroWeightBooks = 0

    for (let i = 0; i < data.bookIndexes.length; i++) {
      const idx = data.bookIndexes[i]!
      const w = finalWeights[idx]!
      sumW += w
      sumWx += w * (lut.payouts[idx]! / payoutDivisor)
      if (w === 0) zeroWeightBooks++
    }

    const probability = sumW / totalWeight

    criteria[data.name] = {
      books: data.bookIndexes.length,
      probability,
      hitRate: probability > 0 ? 1 / probability : Infinity,
      rtp: sumWx / totalWeight / opts.cost,
      avgWin: sumW > 0 ? sumWx / sumW : 0,
      minWin: data.group.xs[0]!,
      maxWin: data.group.xs[data.group.xs.length - 1]!,
      zeroWeightBooks,
    }
  }

  return {
    totalBooks: lut.ids.length,
    rtp: totalPayout / totalWeight / opts.cost,
    weightScale,
    criteria,
  }
}

function printSummary(result: OptimizeResult, opts: OptimizeOptions) {
  console.log(
    `Optimization complete. Achieved RTP: ${result.rtp.toFixed(6)} (target: ${opts.rtp})`,
  )

  for (const [name, c] of Object.entries(result.criteria)) {
    const zeroed = c.zeroWeightBooks > 0 ? `, ${c.zeroWeightBooks} books zeroed` : ""
    console.log(
      `  ${name}: hit rate 1 in ${c.hitRate.toFixed(2)}, rtp ${c.rtp.toFixed(6)}, avg win ${c.avgWin.toFixed(4)}x (${c.books} books${zeroed})`,
    )
  }
}

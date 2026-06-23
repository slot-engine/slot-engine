import fs from "fs"
import path from "path"
import {
  readLookupTable,
  readCriteriaMap,
  writeLookupTable,
  readTags,
  getTaggedBookIds,
} from "./lut"
import {
  PayoutGroup,
  InfeasibleError,
  solveTilt,
  tiltedDistribution,
  achievableRange,
} from "./solver"
import { OptimizeOptions, OptimizeResult, CriteriaResult } from "./types"
import chalk from "chalk"

const DEFAULT_WEIGHT_SCALE = 2 ** 50
const DEFAULT_PAYOUT_DIVISOR = 100

interface CriteriaData {
  name: string
  /** Indexes into the LUT arrays of all books belonging to this target. */
  bookIndexes: number[]
  /** Scaled prior weight per book (parallel to bookIndexes). */
  scaledPriors: number[]
  /** Index into the unique payout group per book (parallel to bookIndexes). */
  groupIndexes: number[]
  /** Unique payouts (multiplier units) with prior masses. */
  group: PayoutGroup
  /** Target probability of this target group occurring. */
  probability: number
}

/**
 * Optimizes a lookup table so the game pays out exactly the configured RTP.
 */
export async function optimize(opts: OptimizeOptions): Promise<OptimizeResult> {
  const weightScale = opts.weightScale ?? DEFAULT_WEIGHT_SCALE
  const payoutDivisor = opts.payoutDivisor ?? DEFAULT_PAYOUT_DIVISOR
  const verbose = opts.verbose ?? true

  validateOptions(opts, weightScale, payoutDivisor)

  if (verbose) console.log(chalk.gray("Starting optimization..."))

  const lut = await readLookupTable(opts.input.lookupTable)
  const criteriaMap = await readCriteriaMap(opts.input.lookupTableSegmented)

  const criteriaData = groupByTarget(lut, criteriaMap, opts, payoutDivisor)
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

  if (verbose) {
    console.log(
      `Optimization complete. Achieved RTP: ${result.rtp.toFixed(6)} (target: ${opts.rtp})`,
    )
  }

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
    if (target.match !== undefined) {
      const { criteria: matchCriteria, tags, winRange } = target.match
      if (matchCriteria === undefined && tags === undefined && winRange === undefined) {
        throw new Error(
          `Optimization target "${criteria}" has an empty "match". Define at least one of "criteria", "tags" or "winRange", or omit "match" to target the criteria "${criteria}".`,
        )
      }
      if (matchCriteria !== undefined && [matchCriteria].flat().length === 0) {
        throw new Error(
          `Optimization target "${criteria}" has an empty "match.criteria" array.`,
        )
      }
      if (tags !== undefined) {
        if (Object.keys(tags).length === 0) {
          throw new Error(
            `Optimization target "${criteria}" has an empty "match.tags" object.`,
          )
        }
        if (!opts.input.tags) {
          throw new Error(
            `Optimization target "${criteria}" matches by tags, but "input.tags" (path to the tags file) is not set.`,
          )
        }
      }
      if (winRange !== undefined && winRange[0] > winRange[1]) {
        throw new Error(
          `Optimization target "${criteria}" has an invalid "match.winRange": [${winRange}]. Min must be <= max.`,
        )
      }
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

function groupByTarget(
  lut: { ids: number[]; weights: number[]; payouts: number[] },
  criteriaMap: Map<number, string>,
  opts: OptimizeOptions,
  payoutDivisor: number,
) {
  const targetEntries = Object.entries(opts.targets)

  // Precompute matcher data for targets with an explicit "match".
  // They claim books first, in the order they are defined (first match wins).
  const tags = targetEntries.some(([, t]) => t.match?.tags)
    ? readTags(opts.input.tags!)
    : []

  const matchers = targetEntries
    .filter(([, t]) => t.match)
    .map(([name, t]) => ({
      name,
      criteriaSet: t.match!.criteria ? new Set([t.match!.criteria].flat()) : undefined,
      taggedBookIds: t.match!.tags ? getTaggedBookIds(tags, t.match!.tags) : undefined,
      winRange: t.match!.winRange,
    }))

  const criteriaTargetNames = new Set(
    targetEntries.filter(([, t]) => !t.match).map(([name]) => name),
  )

  // Assign every book to exactly one target
  const byTarget = new Map<
    string,
    { bookIndexes: number[]; scaledPriors: number[]; payoutMultipliers: number[] }
  >()
  const unmatched = new Map<string, number>() // criteria -> count

  for (let i = 0; i < lut.ids.length; i++) {
    const id = lut.ids[i]!
    const criteria = criteriaMap.get(id)
    if (!criteria) {
      throw new Error(
        `Book ${id} from the lookup table has no entry in the segmented lookup table.`,
      )
    }

    const x = lut.payouts[i]! / payoutDivisor

    let assigned: string | undefined
    for (const m of matchers) {
      if (m.criteriaSet && !m.criteriaSet.has(criteria)) continue
      if (m.winRange && (x < m.winRange[0] || x > m.winRange[1])) continue
      if (m.taggedBookIds && !m.taggedBookIds.has(id)) continue
      assigned = m.name
      break
    }
    if (assigned === undefined && criteriaTargetNames.has(criteria)) {
      assigned = criteria
    }
    if (assigned === undefined) {
      unmatched.set(criteria, (unmatched.get(criteria) ?? 0) + 1)
      continue
    }

    let entry = byTarget.get(assigned)
    if (!entry) {
      entry = { bookIndexes: [], scaledPriors: [], payoutMultipliers: [] }
      byTarget.set(assigned, entry)
    }

    const target = opts.targets[assigned]!

    let prior = lut.weights[i]!
    if (target.scale) {
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

  if (unmatched.size > 0) {
    const details = [...unmatched.entries()]
      .map(([c, n]) => `${n} books of criteria "${c}"`)
      .join(", ")
    throw new Error(
      `Some books are not covered by any optimization target: ${details}. ` +
        `Every book must be covered by exactly one target.`,
    )
  }

  const emptyTargets = targetEntries
    .map(([name]) => name)
    .filter((name) => !byTarget.has(name))
  if (emptyTargets.length > 0) {
    throw new Error(
      `Optimization targets that do not match any books: ${emptyTargets
        .map((c) => `"${c}"`)
        .join(", ")}. ` +
        `Check the target keys (ResultSet criteria) and "match" definitions.`,
    )
  }

  // Build unique payout groups
  const criteriaData = new Map<string, CriteriaData>()

  for (const [name, entry] of byTarget) {
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

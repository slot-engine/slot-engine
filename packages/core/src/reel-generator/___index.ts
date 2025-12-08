/**
 * GeneratedReelSetCounts.ts
 *
 * New reel generator: explicit counts per reel (no weights).
 * - CSP constructive placer (backtracking + heuristics) to satisfy hard constraints (counts, minDistance).
 * - Simulated Annealing (SA) per-reel to optimize soft objectives (spread, runs, visual flow).
 *
 * Notes:
 * - perReelCounts: Record<reelIndex, Record<symbolId, count>>
 * - minDistance: Record<symbolId, minDistance> (hard during CSP)
 * - stacks: Record<symbolId, preferredStackSize>
 * - preserveStacks: if true SA won't split stack starts.
 *
 * This is intentionally conservative and easy to extend.
 */

type SymbolId = string

export type PerReelCounts = Record<number, Record<SymbolId, number>>

export interface GeneratorOptions {
  numReels: number
  stripLength: number // number of stops per reel
  perReelCounts: PerReelCounts // explicit counts; each reel must sum to stripLength
  minDistance?: Record<SymbolId, number> // hard min distance between same symbol
  stacks?: Record<SymbolId, number> // preferred stack size (soft preference during SA; used in CSP to form blocks)
  preserveStacks?: boolean // whether SA should preserve stack block starts
  // SA / optimization params
  sa?: {
    iterations?: number // per-reel iterations
    startTemp?: number
    cooling?: number // multiply temp by this each step, e.g., 0.995
  }
  // cost weights (soft objectives)
  weights?: {
    spread?: number // penalty for symbols too close on average
    runs?: number // penalty for long runs of same symbol
    visualFlow?: number // general aesthetic penalty for repeating patterns
  }
}

export interface GenerationResult {
  reels: SymbolId[][] // reels[reelIndex] -> array length stripLength
  diagnostics: {
    success: boolean
    reasons?: string[] // messages on failures or warnings
    initialViolations?: string[] // if any
  }
}

/* --------------------- Utilities --------------------- */

function deepCopy<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

function shuffleInPlace<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
}

/* Circular distance: minimum stops between positions a and b on length L ring */
function circularDistance(a: number, b: number, L: number): number {
  const d = Math.abs(a - b)
  return Math.min(d, L - d)
}

/* Compute all indices in range [start, start+len-1] modulo L */
function indicesForBlock(start: number, len: number, L: number): number[] {
  const out: number[] = []
  for (let k = 0; k < len; k++) out.push((start + k) % L)
  return out
}

/* --------------------- Validation --------------------- */

function validateCountsSum(options: GeneratorOptions): string[] {
  const errs: string[] = []
  for (let r = 0; r < options.numReels; r++) {
    const map = options.perReelCounts[r] ?? {}
    const sum = Object.values(map).reduce((s, c) => s + c, 0)
    if (sum !== options.stripLength) {
      errs.push(
        `Reel ${r}: counts sum to ${sum} but stripLength is ${options.stripLength}.`,
      )
    }
  }
  return errs
}

/* --------------------- Constructive CSP placer ---------------------
   Strategy:
   - Expand counts into blocks for stacked symbols (if stacks defined).
   - Treat each block as a placement unit of length blockLen.
   - Order blocks by constraint hardness: symbols with large minDistance first, then rarer ones.
   - Place each block in an empty slot where it won't violate minDistance to already placed same-symbol occurrences.
   - Uses backtracking when stuck.
*/

type Block = {
  symbol: SymbolId
  len: number // block length in stops (1 for single)
  id: string // unique id for block instance
}

function buildBlocksForReel(
  counts: Record<SymbolId, number>,
  stripLength: number,
  stacks: Record<SymbolId, number> | undefined,
): Block[] {
  const blocks: Block[] = []
  for (const [sym, cnt] of Object.entries(counts)) {
    if (cnt <= 0) continue
    const prefStack = stacks?.[sym] ?? 1
    if (prefStack > 1) {
      const stackCount = Math.floor(cnt / prefStack)
      const rem = cnt % prefStack
      for (let i = 0; i < stackCount; i++) {
        blocks.push({ symbol: sym, len: prefStack, id: `${sym}_S${i}` })
      }
      for (let i = 0; i < rem; i++) {
        blocks.push({ symbol: sym, len: 1, id: `${sym}_r${i}` })
      }
    } else {
      for (let i = 0; i < cnt; i++) {
        blocks.push({ symbol: sym, len: 1, id: `${sym}_${i}` })
      }
    }
  }
  return blocks
}

/* Place blocks on a reel of length L; return positions array of symbols or null if impossible */
function placeBlocksOnReelCSP(
  blocks: Block[],
  L: number,
  minDistance: Record<SymbolId, number> | undefined,
  maxBacktrackIterations = 200000,
): { positions: (SymbolId | null)[] | null; stackStarts: Set<number> } {
  // order blocks by hardness: first by minDistance (high -> low), then by len descending
  const md = minDistance ?? {}
  blocks.sort((a, b) => {
    const da = md[a.symbol] ?? 0
    const db = md[b.symbol] ?? 0
    if (da !== db) return db - da
    if (a.len !== b.len) return b.len - a.len
    // rarer symbols (we don't know rarity here) - but keep stable
    return a.id.localeCompare(b.id)
  })

  const positions: (SymbolId | null)[] = Array(L).fill(null)
  const placedBlocks: { block: Block; start: number }[] = []
  let backtrackCount = 0

  function canPlaceAt(start: number, block: Block): boolean {
    // Block occupies indices start..start+len-1 mod L
    // Check empty
    for (const idx of indicesForBlock(start, block.len, L)) {
      if (positions[idx] !== null) return false
    }
    // Check minDistance constraint relative to existing placements of same symbol
    const minD = md[block.symbol] ?? 0
    if (minD > 0) {
      // For each existing position p where positions[p] === block.symbol,
      // require circularDistance to all indices of this block >= minD
      for (let p = 0; p < L; p++) {
        if (positions[p] === block.symbol) {
          for (const idx of indicesForBlock(start, block.len, L)) {
            if (circularDistance(p, idx, L) < minD) return false
          }
        }
      }
    }
    return true
  }

  // backtracking recursion with index of block to place
  function backtrack(iBlock: number): boolean {
    if (iBlock >= blocks.length) return true
    backtrackCount++
    if (backtrackCount > maxBacktrackIterations) return false

    const b = blocks[iBlock]

    // Generate candidate starts in heuristic order: try positions that maximize distance to same symbols
    const candidates: number[] = []
    for (let s = 0; s < L; s++) candidates.push(s)
    // shuffle to reduce adversarial patterns, but keep deterministic-ish? using Math.random for now
    shuffleInPlace(candidates)

    for (const start of candidates) {
      if (!canPlaceAt(start, b)) continue

      // place
      for (const idx of indicesForBlock(start, b.len, L)) positions[idx] = b.symbol
      placedBlocks.push({ block: b, start })
      // recurse
      if (backtrack(iBlock + 1)) return true
      // undo
      placedBlocks.pop()
      for (const idx of indicesForBlock(start, b.len, L)) positions[idx] = null
    }
    // no placement possible for this block
    return false
  }

  const ok = backtrack(0)
  const stackStarts = new Set<number>()
  if (ok) {
    // detect stack starts (runs of >1 identical caused by blocks of length>1)
    for (let i = 0; i < L; i++) {
      const cur = positions[i]
      if (!cur) continue
      const next = positions[(i + 1) % L]
      if (next === cur && positions[(i - 1 + L) % L] !== cur) {
        stackStarts.add(i)
      }
    }
    return { positions, stackStarts }
  }
  return { positions: null, stackStarts }
}

/* --------------------- Greedy fallback (if CSP fails) --------------------- */

function greedyFillReel(
  counts: Record<SymbolId, number>,
  L: number,
  minDistance: Record<SymbolId, number> | undefined,
): { positions: (SymbolId | null)[]; stackStarts: Set<number>; warnings: string[] } {
  const warns: string[] = []
  const positions: (SymbolId | null)[] = Array(L).fill(null)
  // Place symbols by remaining count, always choose position maximizing minimal distance to same symbol
  const remaining: Record<SymbolId, number> = { ...counts }
  const md = minDistance ?? {}

  const symList = Object.keys(remaining)
  for (let k = 0; k < L; k++) {
    // choose next symbol with positive remaining and best candidate position
    let bestSym: SymbolId | null = null
    let bestPos = -1
    let bestScore = -Infinity
    for (const s of symList) {
      if ((remaining[s] ?? 0) <= 0) continue
      // pick best empty position for symbol s
      for (let p = 0; p < L; p++) {
        if (positions[p] !== null) continue
        // check minDistance hard constraint - if violated, skip
        const minD = md[s] ?? 0
        let ok = true
        for (let q = 0; q < L; q++) {
          if (positions[q] === s && circularDistance(p, q, L) < minD) {
            ok = false
            break
          }
        }
        if (!ok) continue
        // score: distance to nearest same symbol (want higher)
        let nearest = Infinity
        for (let q = 0; q < L; q++) {
          if (positions[q] === s) nearest = Math.min(nearest, circularDistance(p, q, L))
        }
        if (!isFinite(nearest)) nearest = L // none yet placed => very good
        const score = nearest
        if (score > bestScore) {
          bestScore = score
          bestPos = p
          bestSym = s
        }
      }
    }
    if (bestSym === null) {
      // no symbol can be placed without violating minDistance; relax and place any remaining symbol in any slot
      warns.push(`Greedy fallback: had to relax minDistance on step ${k}`)
      for (let p = 0; p < L; p++) {
        if (positions[p] === null) {
          // pick any remaining symbol
          const s = symList.find((x) => (remaining[x] ?? 0) > 0)!
          positions[p] = s
          remaining[s] = (remaining[s] ?? 0) - 1
          break
        }
      }
      continue
    }
    positions[bestPos] = bestSym
    remaining[bestSym] = (remaining[bestSym] ?? 0) - 1
  }

  // compute stackStarts for runs
  const stackStarts = new Set<number>()
  for (let i = 0; i < L; i++) {
    const cur = positions[i]
    if (!cur) continue
    const next = positions[(i + 1) % L]
    if (next === cur && positions[(i - 1 + L) % L] !== cur) {
      stackStarts.add(i)
    }
  }
  return { positions, stackStarts, warnings: warns }
}

/* --------------------- Cost function & SA ---------------------
   Per-reel cost function that is fast to compute:
   - spread penalty: for each symbol compute average nearest-neighbour distance; penalize when < desired minDistance (if any) or just generally low
   - runs penalty: penalize runs of same symbol length > 2
   - visual flow: small penalty for repeating alternating pattern (a,b,a,b) by checking local 4-length windows
*/

function reelCost(positions: (SymbolId | null)[], options: GeneratorOptions): number {
  const L = positions.length
  const weights = options.weights ?? {}
  const wSpread = weights.spread ?? 1.0
  const wRuns = weights.runs ?? 1.0
  const wFlow = weights.visualFlow ?? 0.5
  const minD = options.minDistance ?? {}

  // map symbol -> indices
  const idxMap: Record<SymbolId, number[]> = {}
  for (let i = 0; i < L; i++) {
    const s = positions[i]
    if (!s) continue
    if (!idxMap[s]) idxMap[s] = []
    idxMap[s].push(i)
  }

  let cost = 0

  // spread penalty
  for (const [s, arr] of Object.entries(idxMap)) {
    if (arr.length <= 1) continue
    // compute nearest neighbour distances average
    let sumNearest = 0
    for (const p of arr) {
      let nearest = Infinity
      for (const q of arr) {
        if (p === q) continue
        nearest = Math.min(nearest, circularDistance(p, q, L))
      }
      sumNearest += nearest
    }
    const avgNearest = sumNearest / arr.length
    // desired spread = minDistance if defined else approx L / arr.length
    const desired = minD[s] ?? Math.max(1, Math.floor(L / arr.length))
    if (avgNearest < desired) {
      cost += wSpread * (desired - avgNearest) ** 2
    }
  }

  // runs penalty (long sequences of identical symbols)
  for (let i = 0; i < L; i++) {
    const s = positions[i]
    if (!s) continue
    // compute run length starting at i
    let len = 1
    while (positions[(i + len) % L] === s && len < L) len++
    if (len > 2) cost += wRuns * (len - 2) ** 2
    // skip ahead
    i += len - 1
  }

  // visual flow penalty: penalize alternating patterns a,b,a,b windows
  for (let i = 0; i < L; i++) {
    const a = positions[i]
    const b = positions[(i + 1) % L]
    const c = positions[(i + 2) % L]
    const d = positions[(i + 3) % L]
    if (a && b && c && d) {
      if (a === c && b === d && a !== b) cost += wFlow
    }
  }

  return cost
}

function simulatedAnnealingOptimizeReel(
  initial: (SymbolId | null)[],
  options: GeneratorOptions,
  stackStarts: Set<number>,
): { optimized: (SymbolId | null)[]; startStackStarts?: Set<number> } {
  const L = initial.length
  const iter = options.sa?.iterations ?? 5000
  const startTemp = options.sa?.startTemp ?? 1.0
  const cooling = options.sa?.cooling ?? 0.995
  const preserveStacks = options.preserveStacks ?? false

  // Represent state as array
  let state = deepCopy(initial)
  let best = deepCopy(initial)
  let bestCost = reelCost(best, options)
  let temp = startTemp
  const rand = Math.random

  for (let it = 0; it < iter; it++) {
    // pick two indices to swap; respect preserveStacks if requested
    let i = Math.floor(rand() * L)
    let j = Math.floor(rand() * L)
    if (i === j) {
      j = (i + 1) % L
    }

    // if preserveStacks, disallow swapping indices that are inside a stack run that would split the block start
    if (preserveStacks) {
      const inStackI =
        stackStarts.has(i) || stackStarts.has((i - 1 + L) % L) ? true : false
      const inStackJ =
        stackStarts.has(j) || stackStarts.has((j - 1 + L) % L) ? true : false
      if (inStackI !== inStackJ) {
        // prefer swapping both that are not splitting stacks; try a few times to find a compatible pair
        let attempts = 0
        while (attempts < 10 && inStackI !== inStackJ) {
          i = Math.floor(rand() * L)
          j = Math.floor(rand() * L)
          if (i === j) j = (i + 1) % L
          attempts++
        }
        if (inStackI !== inStackJ) continue // give up this iteration
      }
    }

    // swap
    const a = state[i]
    state[i] = state[j]
    state[j] = a

    const c = reelCost(state, options)
    const delta = c - bestCost
    // Accept rule: Metropolis
    if (c < bestCost || Math.exp(-delta / Math.max(temp, 1e-9)) > Math.random()) {
      // accept; if better, update best
      if (c < bestCost) {
        bestCost = c
        best = deepCopy(state)
      }
    } else {
      // revert
      state[j] = state[i]
      state[i] = a
    }
    temp *= cooling
  }

  // recompute stackStarts for the best
  const newStackStarts = new Set<number>()
  for (let i = 0; i < L; i++) {
    const cur = best[i]
    if (!cur) continue
    const next = best[(i + 1) % L]
    if (next === cur && best[(i - 1 + L) % L] !== cur) newStackStarts.add(i)
  }

  return { optimized: best, startStackStarts: newStackStarts }
}

/* --------------------- Top-level generator --------------------- */

export function generateReelsCounts(options: GeneratorOptions): GenerationResult {
  // Validate basic
  const diagnostics: GenerationResult["diagnostics"] = { success: false, reasons: [] }
  const errs = validateCountsSum(options)
  if (errs.length > 0) {
    diagnostics.reasons = errs
    return { reels: [], diagnostics }
  }

  const reels: SymbolId[][] = []
  const warnings: string[] = []

  for (let r = 0; r < options.numReels; r++) {
    const counts = options.perReelCounts[r] ?? {}

    // Build blocks with stack preferences
    const blocks = buildBlocksForReel(counts, options.stripLength, options.stacks)

    // Try CSP placement
    const { positions, stackStarts } = placeBlocksOnReelCSP(
      blocks,
      options.stripLength,
      options.minDistance,
    )

    let reelPositions: (SymbolId | null)[]
    let finalStackStarts: Set<number> = stackStarts

    if (!positions) {
      // CSP failed => try greedy fallback
      const fallback = greedyFillReel(counts, options.stripLength, options.minDistance)
      reelPositions = fallback.positions
      finalStackStarts = fallback.stackStarts
      if (fallback.warnings.length) warnings.push(...fallback.warnings)
      warnings.push(`Reel ${r}: CSP backtracking failed; used greedy fallback.`)
    } else {
      reelPositions = positions
    }

    // Some sanity: replace nulls by a default symbol if any remain (shouldn't happen)
    for (let i = 0; i < options.stripLength; i++) {
      if (reelPositions[i] === null) {
        // pick any symbol with positive count (shouldn't reach here; but safe fallback)
        const someSymbol = Object.keys(counts)[0] ?? "BLANK"
        reelPositions[i] = someSymbol
      }
    }

    // Now run SA optimization per reel
    const saRes = simulatedAnnealingOptimizeReel(reelPositions, options, finalStackStarts)
    reels.push(saRes.optimized as SymbolId[])
  }

  diagnostics.success = true
  diagnostics.reasons = warnings.length ? warnings : undefined
  return { reels, diagnostics }
}

/* --------------------- Example usage / test harness --------------------- */

if (require.main === module) {
  // Small self-test if run as node script
  const opts: GeneratorOptions = {
    numReels: 3,
    stripLength: 32,
    perReelCounts: {
      0: { A: 10, B: 8, C: 6, S: 2, X: 6 }, // sums to 32
      1: { A: 8, B: 8, C: 8, S: 4, X: 4 }, // sums 32
      2: { A: 6, B: 6, C: 10, S: 4, X: 6 }, // sums 32
    },
    minDistance: { S: 8, X: 2 }, // S is a rare scatter that must be spaced
    stacks: { C: 2 }, // prefer C appears in stacks of 2 when possible
    preserveStacks: true,
    sa: { iterations: 4000, startTemp: 1.0, cooling: 0.998 },
    weights: { spread: 2.0, runs: 1.5, visualFlow: 0.8 },
  }

  console.log("Running example generator with options:", JSON.stringify(opts, null, 2))
  const res = generateReelsCounts(opts)
  if (!res.diagnostics.success) {
    console.error("Generation failed:", res.diagnostics.reasons)
    process.exit(1)
  }
  console.log("Generated reels:")
  for (let r = 0; r < res.reels.length; r++) {
    console.log(`Reel ${r}:`, res.reels[r].join(" "))
  }
  if (res.diagnostics.reasons) {
    console.log("Notes:", res.diagnostics.reasons)
  }
}

export default generateReelsCounts

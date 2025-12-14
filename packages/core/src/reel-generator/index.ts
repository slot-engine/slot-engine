import assert from "assert"
import chalk from "chalk"
import { RandomNumberGenerator } from "../service/rng"

export interface ReelGeneratorOptions {
  /**
   * Number of reels in the reel set.
   */
  reelsAmount: number
  /**
   * A mapping of symbol IDs to their respective counts on each reel.
   *
   * @example
   * {
   *   "A": [5, 4, 6], // "A" appears 5 times on reel 1, 4 times on reel 2, and 6 times on reel 3
   * }
   */
  symbols: Record<string, number[]>
  /**
   * Minimum space between same symbols on a reel.
   *
   * Can be a single number applied to all symbols, or a mapping of symbol IDs to their respective minimum spaces.
   *
   * @example
   * 3 // All symbols must have at least 3 symbols between them on the same reel
   *
   * @example
   * {
   *   "A": 2, // "A" must have at least 2 symbols between them on the same reel
   *   "B": 4, // "B" must have at least 4 symbols between them on the same reel
   * }
   */
  spaceBetweenSameSymbols?: number | Record<string, number>
  /**
   * Minimum space between different symbols on a reel.
   *
   * @example
   * {
   *   "A": { "B": 2, "C": 3 }, // "A" must have at least 2 symbols between "B" and 3 symbols between "C" on the same reel
   *   "B": { "A": 2, "C": 1 }, // "B" must have at least 2 symbols between "A" and 1 symbol between "C" on the same reel
   * }
   */
  spaceBetweenSymbols?: Record<string, Record<string, number>>
  /**
   * Min and max stacking behavior for symbols.
   *
   * @example
   * {
   *   "A": { min: 2, max: 5 }, // "A" can stack between 2 and 5 symbols high
   *   "B": { min: [1,2,3], max: [4,5,6] } // "B" has different stacking rules per reel
   * }
   */
  stacking?: Record<
    string,
    {
      min: number | number[]
      max: number | number[]
    }
  >
  /**
   * Stacking weights control the likelihood of certain stack sizes for symbols on reels.
   *
   * If stacking weights for a symbol are provided, every stack size must be defined.\
   * There cannot be any missing stack sizes.
   *
   * @example
   * // In this example, "A" is more likely to form stacks of size 3 than size 2 on all reels.
   * {
   *   "A": {
   *     "2": [1, 1, 1], // Weights for stack size 2 on reels 1, 2, and 3
   *     "3": [2, 2, 3], // Weights for stack size 3 on reels 1, 2, and 3
   *   }
   * }
   */
  stackingWeights?: Record<string, Record<string, number[]>>
  /**
   * The seed for the random number generator.
   */
  seed?: number
  /**
   * Configuration options for the reel generation and optimization algorithm.
   */
  generator?: {
    /**
     * Simulated annealing parameters.
     */
    sa?: {
      iterations?: number
      temperature?: number
      cooling?: number
    }
    /**
     * Cost function weights.
     */
    cost?: {
      spread?: number
      repitition?: number
      visual?: number
    }
  }
}

type SymbolId = string

interface GenerationResult {
  reels: SymbolId[]
  diagnostics: {
    success: boolean
    reasons?: string[]
    initialViolations?: string[]
  }
}

interface Block {
  symbol: SymbolId
  count: number
  id: string
}

function getStripLengths(opts: ReelGeneratorOptions) {
  const lengths: number[] = []
  for (let ridx = 0; ridx < opts.reelsAmount; ridx++) {
    let length = 0
    for (const counts of Object.values(opts.symbols)) {
      length += counts[ridx]!
    }
    lengths.push(length)
  }
  return lengths
}

function circularDistance(a: number, b: number, L: number): number {
  const d = Math.abs(a - b)
  return Math.min(d, L - d)
}

function indicesForBlock(start: number, len: number, L: number): number[] {
  const out: number[] = []
  for (let k = 0; k < len; k++) out.push((start + k) % L)
  return out
}

function shuffleInPlace<T>(arr: T[], rng: RandomNumberGenerator) {
  for (let i = arr.length - 1; i > 0; i--) {
    const randFloat = rng.randomFloat(0, 1)
    const j = Math.floor(randFloat * (i + 1))
    const tmp = arr[i]!
    arr[i] = arr[j]!
    arr[j] = tmp
  }
}

function isReelsAmountValid(opts: ReelGeneratorOptions) {
  return Object.values(opts.symbols).every((counts) => counts.length === opts.reelsAmount)
}

function validateStacking(opts: ReelGeneratorOptions) {
  Object.entries(opts.symbols).forEach(([symbol, counts]) => {
    const stacking = opts.stacking?.[symbol]
    if (!stacking) return

    for (let ridx = 0; ridx < opts.reelsAmount; ridx++) {
      const count = counts[ridx]!
      const minStack = Array.isArray(stacking.min)
        ? (stacking.min[ridx] ?? 1)
        : (stacking.min ?? 1)
      const maxStack = Array.isArray(stacking.max)
        ? (stacking.max[ridx] ?? count)
        : (stacking.max ?? count)

      assert(
        count >= minStack,
        `Symbol "${symbol}" on reel ${ridx + 1} has count ${count}, which is less than the minimum stack size of ${minStack}.`,
      )

      assert(
        minStack <= maxStack,
        `For symbol "${symbol}" on reel ${ridx + 1}, the minimum stack size of ${minStack} exceeds the maximum stack size of ${maxStack}.`,
      )
    }
  })
}

function buildBlocksForReel(
  ridx: number,
  symbolCounts: Record<SymbolId, number>,
  opts: ReelGeneratorOptions,
  rng: RandomNumberGenerator,
) {
  const blocks: Block[] = []

  for (const [sym, count] of Object.entries(symbolCounts)) {
    if (count <= 0) continue

    const stackOpts = opts.stacking?.[sym]
    const minStack = Array.isArray(stackOpts?.min) ? stackOpts?.min[ridx] : stackOpts?.min
    const maxStack = Array.isArray(stackOpts?.max) ? stackOpts?.max[ridx] : stackOpts?.max

    if (minStack || maxStack) {
      assert(
        minStack && maxStack,
        `Both min and max stack sizes must be defined for symbol "${sym}".`,
      )

      let remaining = count
      while (remaining >= minStack) {
        let stackSize = minStack
        const stackingWeights = opts.stackingWeights?.[sym]

        if (stackingWeights && Object.keys(stackingWeights).length > 0) {
          // Validate and use stacking weights if configured
          const possibleSizes: number[] = []
          for (let size = minStack; size <= maxStack; size++) {
            possibleSizes.push(size)
          }
          for (const size of possibleSizes) {
            const weightsForSize = stackingWeights[size]
            assert(
              weightsForSize,
              `Missing stacking weights for stack size ${size} of symbol "${sym}".`,
            )

            const weight = weightsForSize[ridx]
            assert(
              weight !== undefined,
              `Missing stacking weight for stack size ${size} of symbol "${sym}" on reel ${ridx}.`,
            )
          }

          const weights: Record<string, number> = Object.fromEntries(
            Object.entries(stackingWeights).map(([s, w]) => [s, w[ridx]!]),
          )

          const chosenSize = rng.weightedRandom(weights)
          const maxAllowed = Math.min(maxStack, remaining)
          stackSize = Math.min(maxAllowed, Math.max(minStack, Number(chosenSize)))
        } else {
          // Randomly choose a stack size between min and max
          stackSize = Math.min(
            maxStack,
            Math.max(
              minStack,
              Math.floor(rng.randomFloat(minStack, Math.min(maxStack, remaining) + 1)),
            ),
          )
        }

        blocks.push({ symbol: sym, count: stackSize, id: `${sym}_${blocks.length}` })
        remaining -= stackSize
      }

      // Handle any remaining symbols that couldn't form a full minStack
      if (remaining < minStack && remaining > 0) {
        const validBlocks = blocks.filter(
          (b) => b.symbol === sym && b.count + 1 <= maxStack,
        )
        validBlocks.sort(() => rng.randomFloat(-1, 1))
        const randBlock = validBlocks[0]!
        randBlock.count += remaining
      }
    } else {
      for (let i = 0; i < count; i++) {
        blocks.push({ symbol: sym, count: 1, id: `${sym}_${i}` })
      }
    }
  }
  return blocks
}

function sameSpacing(sym: string, opts: ReelGeneratorOptions) {
  const s = opts.spaceBetweenSameSymbols
  if (!s) return 0
  return typeof s === "number" ? s : (s[sym] ?? 0)
}

function otherSpacing(
  sym: string,
  opts: ReelGeneratorOptions,
  symbolsOnReel: Set<string>,
) {
  // Get max spacing requirement between this and all other symbols
  const spacings = opts.spaceBetweenSymbols?.[sym]
  if (!spacings) return 0
  let highest = 0
  for (const other of symbolsOnReel) {
    const space = spacings[other]
    if (typeof space === "number" && space > highest) highest = space
  }
  return highest
}

function placeBlocksOnReel(
  ridx: number,
  blocks: Block[],
  opts: ReelGeneratorOptions,
  rng: RandomNumberGenerator,
) {
  const MAX_BACKTRACKS = 500_000

  // Precompute symbols present on this reel for inter-symbol spacing difficulty
  const symbolsOnReel = new Set(blocks.map((b) => b.symbol))

  const difficulty = (b: Block) => {
    const spacingSame = sameSpacing(b.symbol, opts)
    const spacingInter = otherSpacing(b.symbol, opts, symbolsOnReel)
    const stacking = b.count > 1 ? b.count : 0
    // Weighting: inter-symbol constraints are typically harder than same-spacing,
    // and stacking increases difficulty linearly with stack size.
    return spacingInter * 1.5 + spacingSame + stacking
  }

  blocks.sort((a, b) => difficulty(b) - difficulty(a))

  const stripLength = getStripLengths(opts)[ridx]!
  const positions: (SymbolId | null)[] = Array(stripLength).fill(null)
  const placedBlocks: { block: Block; start: number }[] = []
  let backtracks = 0

  function canPlaceAt(start: number, block: Block): boolean {
    // Block occupies indices start..start+count-1 mod stripLength
    const indices = indicesForBlock(start, block.count, stripLength)

    // Must be empty
    for (const idx of indices) {
      if (positions[idx] !== null) return false
    }

    // Enforce spacing to same symbol
    const sameMin = sameSpacing(block.symbol, opts)
    if (sameMin > 0) {
      for (let p = 0; p < stripLength; p++) {
        if (positions[p] === block.symbol) {
          for (const idx of indices) {
            if (circularDistance(p, idx, stripLength) <= sameMin) return false
          }
        }
      }
    }

    // Enforce spacing to different symbols (bidirectional)
    // Use the max of A->B and B->A if both are defined.
    for (let p = 0; p < stripLength; p++) {
      const placedSym = positions[p]
      if (placedSym === null) continue

      const dAB = opts.spaceBetweenSymbols?.[block.symbol]?.[placedSym!] ?? 0
      const dBA = opts.spaceBetweenSymbols?.[placedSym!]?.[block.symbol] ?? 0
      const interMin = Math.max(dAB, dBA)

      if (interMin > 0) {
        for (const idx of indices) {
          if (circularDistance(p, idx, stripLength) <= interMin) return false
        }
      }
    }

    return true
  }

  const used = new Array(blocks.length).fill(false)

  function backtrack(placedCount: number): boolean {
    if (placedCount >= blocks.length) return true
    backtracks++
    if (backtracks > MAX_BACKTRACKS) return false

    // 1) Choose next block via MRV
    let bestIdx = -1
    let bestOptions: { pos: number; score: number }[] | null = null

    for (let i = 0; i < blocks.length; i++) {
      if (used[i]) continue
      const b = blocks[i]!

      const candidates: { pos: number; score: number }[] = []
      for (let s = 0; s < stripLength; s++) {
        if (!canPlaceAt(s, b)) continue

        let score = 0
        const left = positions[(s - 1 + stripLength) % stripLength]
        const right = positions[(s + b.count) % stripLength]
        if (left !== null) score += 10
        if (right !== null) score += 10
        score += rng.randomFloat(0, 1)

        candidates.push({ pos: s, score })
      }

      if (candidates.length === 0) {
        // This block cannot be placed given current partial layout → dead end
        return false
      }

      if (bestOptions === null || candidates.length < bestOptions.length) {
        bestIdx = i
        bestOptions = candidates
      }
    }

    // 2) Place the “most constrained” block first
    const b = blocks[bestIdx]!
    const candidates = bestOptions!.sort((a, c) => c.score - a.score)

    used[bestIdx!] = true
    for (const { pos: start } of candidates) {
      // place
      for (const idx of indicesForBlock(start, b.count, stripLength)) {
        positions[idx] = b.symbol
      }
      placedBlocks.push({ block: b, start })

      if (backtrack(placedCount + 1)) return true

      // undo
      placedBlocks.pop()
      for (const idx of indicesForBlock(start, b.count, stripLength)) {
        positions[idx] = null
      }
    }
    used[bestIdx!] = false
    return false
  }

  const ok = backtrack(0)
  const stackStarts = new Set<number>()
  if (ok) {
    // detect stack starts (runs of >1 identical caused by blocks of length>1)
    for (let i = 0; i < stripLength; i++) {
      const cur = positions[i]
      if (!cur) continue
      const next = positions[(i + 1) % stripLength]
      if (next === cur && positions[(i - 1 + stripLength) % stripLength] !== cur) {
        stackStarts.add(i)
      }
    }
    return { positions, stackStarts }
  }
  return { positions: null, stackStarts }
}

function costReel(ridx: number, reel: SymbolId[], opts: ReelGeneratorOptions): number {
  const L = reel.length
  if (L === 0) return 0

  let cost = 0

  // Tunable weights (optionally read from opts.generator?.cost later)
  const INTER_SYMBOL_WEIGHT = 1
  const STACK_SIZE_WEIGHT = 10
  const STACK_SPACING_WEIGHT = 10

  // --- Inter-symbol spacing (still pairwise / adjacency-based) ---
  for (let i = 0; i < L; i++) {
    const a = reel[i]!
    const b = reel[(i + 1) % L]!

    // Only for different symbols
    if (a !== b) {
      const dAB = opts.spaceBetweenSymbols?.[a]?.[b] ?? 0
      const dBA = opts.spaceBetweenSymbols?.[b]?.[a] ?? 0
      const interMin = Math.max(dAB, dBA)
      if (interMin > 0) {
        cost += INTER_SYMBOL_WEIGHT
      }
    }
  }

  // --- Build circular runs of identical symbols (for stacking + same-symbol spacing) ---
  type Run = { symbol: SymbolId; length: number; start: number }
  const runs: Run[] = []

  let currentSym = reel[0]!
  let currentStart = 0
  let currentLen = 1

  for (let i = 1; i < L; i++) {
    const sym = reel[i]!
    if (sym === currentSym) {
      currentLen++
    } else {
      runs.push({ symbol: currentSym, length: currentLen, start: currentStart })
      currentSym = sym
      currentStart = i
      currentLen = 1
    }
  }
  runs.push({ symbol: currentSym, length: currentLen, start: currentStart })

  // Merge first and last run if they are the same symbol (circular reel)
  if (runs.length > 1 && runs[0]!.symbol === runs[runs.length - 1]!.symbol) {
    runs[0]!.length += runs[runs.length - 1]!.length
    runs.pop()
  }

  // --- Stack size penalties (don’t break legal stacks, punish too short/too long) ---
  if (opts.stacking) {
    for (const run of runs) {
      const stackOpts = opts.stacking[run.symbol]
      if (!stackOpts) continue

      const minStack = Array.isArray(stackOpts.min)
        ? (stackOpts.min[ridx] ?? 1)
        : (stackOpts.min ?? 1)
      const maxStack = Array.isArray(stackOpts.max)
        ? (stackOpts.max[ridx] ?? run.length)
        : (stackOpts.max ?? run.length)

      if (run.length < minStack) {
        cost += STACK_SIZE_WEIGHT * (minStack - run.length)
      } else if (run.length > maxStack) {
        cost += STACK_SIZE_WEIGHT * (run.length - maxStack)
      }
    }
  }

  // --- Same-symbol spacing between *different stacks* of the same symbol ---
  // We now enforce spaceBetweenSameSymbols between runs, not inside a run,
  // so stacks are free to be contiguous, but separate stacks must be spaced.
  const lastEndBySymbol = new Map<SymbolId, number>()

  for (const run of runs) {
    const sameMin = sameSpacing(run.symbol, opts)
    if (sameMin > 0 && lastEndBySymbol.has(run.symbol)) {
      const prevEnd = lastEndBySymbol.get(run.symbol)! // index of last cell of previous run
      const thisStart = run.start
      const dist = circularDistance(prevEnd, thisStart, L)

      if (dist <= sameMin) {
        // Penalize lack of gap between stacks of the same symbol
        cost += STACK_SPACING_WEIGHT * (sameMin - dist + 1)
      }
    }

    const thisEnd = (run.start + run.length - 1) % L
    lastEndBySymbol.set(run.symbol, thisEnd)
  }

  return cost
}

function optimizeReelWithSA(
  ridx: number,
  initial: SymbolId[],
  opts: ReelGeneratorOptions,
  rng: RandomNumberGenerator,
): SymbolId[] {
  const reel = [...initial]
  let best = [...reel]
  let bestCost = costReel(ridx, reel, opts)

  const sa = opts.generator?.sa ?? {}
  let T = sa.temperature ?? 1.0
  const cooling = sa.cooling ?? 0.9995
  const iterations = sa.iterations ?? 100_000

  for (let it = 0; it < iterations && bestCost > 0; it++) {
    const i = Math.floor(rng.randomFloat(0, reel.length))
    let j = Math.floor(rng.randomFloat(0, reel.length))
    if (j === i) j = (j + 1) % reel.length

    const tmp = reel[i]!
    reel[i] = reel[j]!
    reel[j] = tmp

    const newCost = costReel(ridx, reel, opts)
    const delta = newCost - bestCost

    if (
      newCost < bestCost ||
      Math.exp(-delta / Math.max(T, 1e-9)) > rng.randomFloat(0, 1)
    ) {
      // accept move
      if (newCost < bestCost) {
        bestCost = newCost
        best = [...reel]
      }
    } else {
      // revert move
      reel[j] = reel[i]!
      reel[i] = tmp
    }

    T *= cooling
  }

  return best
}

export function generateReels(opts: ReelGeneratorOptions) {
  const diagnostics: GenerationResult["diagnostics"] = { success: false, reasons: [] }

  assert(
    isReelsAmountValid(opts),
    "The length of symbol counts arrays must match the reelsAmount.",
  )

  validateStacking(opts)

  const reels: SymbolId[][] = []
  const warnings: string[] = []
  const rng = new RandomNumberGenerator()
  let currentSeed = opts.seed ?? 1
  rng.setSeed(currentSeed)

  console.log(chalk.bold("Generating reels. This may take a while..."))

  for (let ridx = 0; ridx < opts.reelsAmount; ridx++) {
    console.log(`Generating reel ${ridx + 1}/${opts.reelsAmount}...`)

    const symbolCounts = Object.fromEntries(
      Object.entries(opts.symbols).map(([symbol, counts]) => [symbol, counts[ridx]!]),
    )

    Object.entries(symbolCounts).forEach(([symbol, count]) => {
      assert(
        count && count >= 0,
        `Symbol count for symbol "${symbol}" on reel ${ridx} must be given and be non-negative.`,
      )
    })

    const blocks = buildBlocksForReel(ridx, symbolCounts, opts, rng)

    let reelPositions: (SymbolId | null)[] = []
    let finalStackStarts: Set<number> = new Set()
    const attempts = 15
    let attemptsLeft = attempts

    while (attemptsLeft-- > 0) {
      const { positions, stackStarts } = placeBlocksOnReel(ridx, blocks, opts, rng)

      if (!positions) {
        // Try simulated annealing
        const flat: SymbolId[] = []
        for (const [symbol, count] of Object.entries(symbolCounts)) {
          for (let k = 0; k < count; k++) flat.push(symbol)
        }
        shuffleInPlace(flat, rng)

        const optimized = optimizeReelWithSA(ridx, flat, opts, rng)
        const finalCost = costReel(ridx, optimized, opts)

        if (finalCost === 0) {
          console.log(optimized)
          reelPositions = optimized
          break
        } else {
          // everything failed, try with new seed
          console.log(
            chalk.gray(
              `Retrying with new RNG seed (${attempts - attemptsLeft}/${attempts})...`,
            ),
          )
          currentSeed += 1
          rng.setSeed(currentSeed)
          continue
        }
      }

      reelPositions = positions
      break
    }

    diagnostics.success = true
    diagnostics.reasons = warnings.length ? warnings : undefined

    if (reelPositions.length === 0) {
      console.log(
        chalk.red(`Reel ${ridx + 1}: Failed to generate after multiple attempts.`),
      )
      console.log(
        chalk.red(
          "Try setting a different seed for the generator or loosening constraints.",
        ),
      )
      warnings.push(`Reel ${ridx + 1}: Failed to generate`)
      break
    }

    reels.push(reelPositions.map((s) => s!))
  }

  if (diagnostics.reasons && diagnostics.reasons.length > 0) {
    console.log("Notes:", diagnostics.reasons)
  }
}

generateReels({
  reelsAmount: 5,
  symbols: {
    S: [2, 1, 2, 1, 2],
    H1: [8, 10, 20, 10, 8],
    H2: [10, 15, 5, 15, 10],
    H3: [15, 20, 20, 10, 20],
    L1: [20, 30, 10, 10, 20],
    L2: [25, 30, 30, 20, 10],
  },
  stacking: {
    H1: { min: 1, max: 3 },
    H2: { min: 1, max: 3 },
    H3: { min: 1, max: 3 },
    L1: { min: 1, max: 3 },
    L2: { min: 1, max: 3 },
  },
  stackingWeights: {
    L1: {
      "1": [1, 1, 1, 1, 1],
      "2": [1, 1, 3, 1, 1],
      "3": [3, 3, 1, 3, 3],
    },
  },
  spaceBetweenSameSymbols: 2,
  spaceBetweenSymbols: {
    S: { S: 10 },
  },
})

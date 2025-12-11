import assert from "assert"
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
  spaceBetweenSameSymbols?: number | Record<string, number>
  spaceBetweenSymbols?: Record<string, Record<string, number>>
  stacking?: Record<
    string,
    {
      min: number | number[]
      max: number | number[]
    }
  >
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

function isReelsAmountValid(opts: ReelGeneratorOptions) {
  return Object.values(opts.symbols).every((counts) => counts.length === opts.reelsAmount)
}

function validateStacking(opts: ReelGeneratorOptions) {
  Object.entries(opts.symbols).forEach(([symbol, counts]) => {
    const stacking = opts.stacking?.[symbol]
    if (!stacking) return

    counts.forEach((count, ridx) => {
      const minStack = Array.isArray(stacking.min)
        ? (stacking.min[ridx] ?? 1)
        : (stacking.min ?? 1)
      const maxStack = Array.isArray(stacking.max)
        ? (stacking.max[ridx] ?? count)
        : (stacking.max ?? count)

      assert(
        count >= minStack,
        `Symbol "${symbol}" on reel ${ridx} has count ${count}, which is less than the minimum stack size of ${minStack}.`,
      )
    })

    for (let ridx = 0; ridx < opts.reelsAmount; ridx++) {
      const count = counts[ridx]!
      const minStack = Array.isArray(stacking.min)
        ? (stacking.min[ridx] ?? 1)
        : (stacking.min ?? 1)
      const maxStack = Array.isArray(stacking.max)
        ? (stacking.max[ridx] ?? count)
        : (stacking.max ?? count)

      assert(
        minStack <= maxStack,
        `For symbol "${symbol}" on reel ${ridx}, the minimum stack size of ${minStack} exceeds the maximum stack size of ${maxStack}.`,
      )

      assert(
        count % minStack === 0,
        `Symbol "${symbol}" on reel ${ridx} has count ${count}, which is not divisible by the minimum stack size of ${minStack}.`,
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

    const minStack = Array.isArray(opts.stacking?.[sym]?.min)
      ? opts.stacking?.[sym]?.min[ridx]
      : opts.stacking?.[sym]?.min
    const maxStack = Array.isArray(opts.stacking?.[sym]?.max)
      ? opts.stacking?.[sym]?.max[ridx]
      : opts.stacking?.[sym]?.max

    if (minStack || maxStack) {
      assert(
        minStack && maxStack,
        `Both min and max stack sizes must be defined for symbol "${sym}".`,
      )

      let remaining = count
      while (remaining >= minStack) {
        const stackSize = Math.min(
          maxStack,
          Math.max(
            minStack,
            Math.floor(rng.randomFloat(minStack, Math.min(maxStack, remaining) + 1)),
          ),
        )
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
  if (opts.seed) rng.setSeed(opts.seed)

  for (let ridx = 0; ridx < opts.reelsAmount; ridx++) {
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
    console.log(blocks)
  }
}

generateReels({
  reelsAmount: 5,
  symbols: {
    A: [20, 20, 20, 20, 20],
    B: [20, 20, 20, 20, 20],
    C: [20, 20, 20, 20, 20],
  },
  stacking: {
    A: { min: 2, max: 6 },
    B: { min: 2, max: 6 },
  },
})

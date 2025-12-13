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
        `Symbol "${symbol}" on reel ${ridx} has count ${count}, which is less than the minimum stack size of ${minStack}.`,
      )

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

function placeBlocksOnReel(
  blocks: Block[],
  opts: ReelGeneratorOptions,
  rng: RandomNumberGenerator,
) {
  return {}
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

    const {} = placeBlocksOnReel(blocks, opts, rng)
  }
}

generateReels({
  reelsAmount: 5,
  symbols: {
    A: [30, 30, 30, 30, 30],
    B: [30, 30, 30, 30, 30],
    C: [30, 30, 30, 30, 30],
  },
  stacking: {
    A: { min: 2, max: 4 },
    B: { min: 2, max: 4 },
  },
  stackingWeights: {
    "A": {
      "2": [1, 1, 3, 1, 1],
      "3": [3, 3, 1, 3, 3],
      "4": [1, 1, 3, 1, 1],
    }
  }
})

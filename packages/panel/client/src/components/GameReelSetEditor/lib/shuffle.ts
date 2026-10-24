import type { ReelsetEditorReel } from "../context/DataContext"

export type ShuffleResult =
  | { ok: true; reel: ReelsetEditorReel }
  | { ok: false; error: string }

const MIX_STEPS_PER_POSITION = 100

export function shuffleReel(
  reel: ReelsetEditorReel,
  spaceBetweenSameSymbols: number,
): ShuffleResult {
  const spacing = Math.floor(spaceBetweenSameSymbols)
  if (spacing < 1) return { ok: true, reel: shuffle([...reel]) }

  const groups = new Map<string, ReelsetEditorReel>()
  for (const item of shuffle([...reel])) {
    const group = groups.get(item.symbol)
    if (group) group.push(item)
    else groups.set(item.symbol, [item])
  }

  const blocks = Math.max(1, Math.floor(reel.length / (spacing + 1)))
  for (const [symbol, group] of groups) {
    if (group.length > blocks) {
      return {
        ok: false,
        error: `${symbol} appears ${group.length} times, but at most ${blocks} fit with a spacing of ${spacing}.`,
      }
    }
  }

  const arranged = spreadAcrossBlocks(
    [...groups.values()].sort((a, b) => b.length - a.length).flat(),
    blocks,
  )
  mix(arranged, Math.min(spacing, Math.floor(reel.length / 2)))
  return { ok: true, reel: arranged }
}

// Dealing column by column puts each symbol's copies in different blocks of at least
// spacing + 1 slots, which is valid whenever no symbol appears more than `blocks` times.
function spreadAcrossBlocks(ordered: ReelsetEditorReel, blocks: number) {
  const length = ordered.length
  const blockSize = Math.floor(length / blocks)
  const longBlocks = length % blocks
  const rotation = randomInt(length)

  const slots: number[] = []
  for (let col = 0; col <= blockSize; col++) {
    for (let b = 0; b < blocks; b++) {
      if (col < blockSize || b < longBlocks) {
        slots.push((b * blockSize + Math.min(b, longBlocks) + col + rotation) % length)
      }
    }
  }

  const arranged: ReelsetEditorReel = new Array(length)
  ordered.forEach((item, k) => (arranged[slots[k]] = item))
  return arranged
}

function mix(reel: ReelsetEditorReel, reach: number) {
  for (let step = 0; step < reel.length * MIX_STEPS_PER_POSITION; step++) {
    const i = randomInt(reel.length)
    const j = randomInt(reel.length)
    swap(reel, i, j)
    if (conflicts(reel, i, reach) || conflicts(reel, j, reach)) swap(reel, i, j)
  }
}

function conflicts(reel: ReelsetEditorReel, i: number, reach: number) {
  const { symbol } = reel[i]
  for (let d = 1; d <= reach; d++) {
    if (reel[(i + d) % reel.length].symbol === symbol) return true
    if (reel[(i - d + reel.length) % reel.length].symbol === symbol) return true
  }
  return false
}

function shuffle<T>(items: T[]) {
  for (let i = items.length - 1; i > 0; i--) swap(items, i, randomInt(i + 1))
  return items
}

function swap<T>(items: T[], a: number, b: number) {
  const item = items[a]
  items[a] = items[b]
  items[b] = item
}

function randomInt(max: number) {
  return Math.floor(Math.random() * max)
}

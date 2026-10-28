import type { ReelsetEditorReel } from "../context/DataContext"

export function nextReelId(reels: Record<number, ReelsetEditorReel>): number {
  return Math.max(-1, ...Object.keys(reels).map(Number)) + 1
}

export function cloneReel(reel: ReelsetEditorReel): ReelsetEditorReel {
  return reel.map(({ symbol }) => ({ id: crypto.randomUUID(), symbol }))
}

export function insertAfter(order: number[], afterId: number, newId: number): number[] {
  const index = order.indexOf(afterId)
  if (index === -1) return [...order, newId]
  return [...order.slice(0, index + 1), newId, ...order.slice(index + 1)]
}

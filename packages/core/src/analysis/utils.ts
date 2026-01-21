import { round } from "../../utils"
import { LookupTable, LookupTableSegmented } from "../types"

export function parseLookupTable(content: string) {
  const lines = content.trim().split("\n")
  const lut: LookupTable = []
  for (const line of lines) {
    if (!line.trim()) continue
    const [indexStr, weightStr, payoutStr] = line.split(",")
    const index = parseInt(indexStr!.trim())
    const weight = parseInt(weightStr!.trim())
    const payout = parseFloat(payoutStr!.trim())
    lut.push([index, weight, payout])
  }
  return lut
}

export function parseLookupTableSegmented(content: string) {
  const lines = content.trim().split("\n")
  const lut: LookupTableSegmented = []
  for (const line of lines) {
    if (!line.trim()) continue
    const [indexStr, criteria, bsWinsStr, fsWinsStr] = line.split(",")
    const index = parseInt(indexStr!.trim())
    const bsWins = parseFloat(bsWinsStr!.trim())
    const fsWins = parseFloat(fsWinsStr!.trim())
    lut.push([index, criteria!, bsWins, fsWins])
  }
  return lut
}

export function getTotalLutWeight(lut: LookupTable) {
  return lut.reduce((sum, [, weight]) => sum + weight, 0)
}

export function getTotalWeight(payoutWeights: PayoutWeights) {
  return Object.values(payoutWeights).reduce((sum, w) => sum + w, 0)
}

type PayoutWeights = Record<number, number>

export function getPayoutWeights(
  lut: LookupTable,
  opts: { normalize?: boolean } = {},
): PayoutWeights {
  const { normalize = true } = opts
  const totalWeight = getTotalLutWeight(lut)

  let payoutWeights: Record<number, number> = {}

  for (const [, weight, p] of lut) {
    const payout = p / 100
    if (payoutWeights[payout] === undefined) {
      payoutWeights[payout] = 0
    }
    payoutWeights[payout] += weight
  }

  // Sort by payout value
  payoutWeights = Object.fromEntries(
    Object.entries(payoutWeights).sort(([a], [b]) => parseFloat(a) - parseFloat(b)),
  )

  if (normalize) {
    for (const payout in payoutWeights) {
      payoutWeights[payout]! /= totalWeight
    }
  }

  return payoutWeights
}

export function getNonZeroHitrate(payoutWeights: PayoutWeights) {
  const totalWeight = getTotalWeight(payoutWeights)
  if (Math.min(...Object.keys(payoutWeights).map(Number)) == 0) {
    return round(totalWeight / (totalWeight - (payoutWeights[0] ?? 0) / totalWeight), 4)
  } else {
    return 1
  }
}

export function getNullHitrate(payoutWeights: PayoutWeights) {
  return round(payoutWeights[0] ?? 0, 4)
}

export function getMaxwinHitrate(payoutWeights: PayoutWeights) {
  const totalWeight = getTotalWeight(payoutWeights)
  const maxWin = Math.max(...Object.keys(payoutWeights).map(Number))
  const hitRate = (payoutWeights[maxWin] || 0) / totalWeight
  return round(1 / hitRate, 4)
}

export function getUniquePayouts(payoutWeights: PayoutWeights) {
  return Object.keys(payoutWeights).length
}

export function getMinWin(payoutWeights: PayoutWeights) {
  const payouts = Object.keys(payoutWeights).map(Number)
  return Math.min(...payouts)
}

export function getMaxWin(payoutWeights: PayoutWeights) {
  const payouts = Object.keys(payoutWeights).map(Number)
  return Math.max(...payouts)
}

export function getAvgWin(payoutWeights: PayoutWeights) {
  let avgWin = 0
  for (const [payoutStr, weight] of Object.entries(payoutWeights)) {
    const payout = parseFloat(payoutStr)
    avgWin += payout * weight
  }
  return round(avgWin, 4)
}

export function getRtp(payoutWeights: PayoutWeights, cost: number) {
  const avgWin = getAvgWin(payoutWeights)
  return round(avgWin / cost, 4)
}

export function getStandardDeviation(payoutWeights: PayoutWeights) {
  const variance = getVariance(payoutWeights)
  return round(Math.sqrt(variance), 4)
}

export function getVariance(payoutWeights: PayoutWeights) {
  const totalWeight = getTotalWeight(payoutWeights)
  const avgWin = getAvgWin(payoutWeights)
  let variance = 0
  for (const [payoutStr, weight] of Object.entries(payoutWeights)) {
    const payout = parseFloat(payoutStr)
    variance += Math.pow(payout - avgWin, 2) * (weight / totalWeight)
  }
  return round(variance, 4)
}

export function getLessBetHitrate(payoutWeights: PayoutWeights, cost: number) {
  let lessBetWeight = 0
  const totalWeight = getTotalWeight(payoutWeights)
  for (const [payoutStr, weight] of Object.entries(payoutWeights)) {
    const payout = parseFloat(payoutStr)
    if (payout < cost) {
      lessBetWeight += weight
    }
  }
  return round(lessBetWeight / totalWeight, 4)
}

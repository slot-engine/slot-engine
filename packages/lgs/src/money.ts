export type Amount = number

export const MONEY_SCALE = 1_000_000

export function toAmount(major: number): Amount {
  return Math.round(major * MONEY_SCALE)
}

export function toMajor(amount: Amount): number {
  return amount / MONEY_SCALE
}

import type { Currency, Language, LgsInfoResponse } from "@slot-engine/lgs"

export interface PlaySettings {
  url: string
  currency: Currency
  language: Language
  /** Starting balance of each new session, in major units. */
  balance: number
  social: boolean
}

export const AMOUNT_SCALE = 1_000_000

/** Fills in what localStorage lacks, or holds and the LGS no longer offers, from its defaults. */
export function resolveSettings(stored: unknown, info: LgsInfoResponse): PlaySettings {
  const saved: Record<string, unknown> =
    typeof stored === "object" && stored !== null ? { ...stored } : {}
  return {
    url: typeof saved.url === "string" ? saved.url : "",
    currency: info.currencies.find((c) => c === saved.currency) ?? info.defaultCurrency,
    language: info.languages.find((l) => l === saved.language) ?? info.defaultLanguage,
    balance:
      typeof saved.balance === "number" && saved.balance >= 0
        ? saved.balance
        : info.balance.starting / AMOUNT_SCALE,
    social: saved.social === true,
  }
}

export function parseGameUrl(input: string): URL | null {
  try {
    const url = new URL(input)
    return url.protocol === "http:" || url.protocol === "https:" ? url : null
  } catch {
    return null
  }
}

/** Sets rather than appends, so a pasted launch URL gets the new session instead of keeping its old one. */
export function launchSrc(gameUrl: URL, launchQuery: string) {
  const src = new URL(gameUrl)
  for (const [key, value] of new URLSearchParams(launchQuery)) {
    src.searchParams.set(key, value)
  }
  return src.toString()
}

export function formatAmount(amount: number) {
  return (amount / AMOUNT_SCALE).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

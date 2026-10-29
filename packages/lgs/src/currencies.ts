export interface CurrencyMeta {
  symbol: string
  decimals: number
  symbolAfter?: boolean
}

export const CURRENCIES = {
  USD: { symbol: "$", decimals: 2 },
  CAD: { symbol: "CA$", decimals: 2 },
  JPY: { symbol: "¥", decimals: 0 },
  EUR: { symbol: "€", decimals: 2 },
  RUB: { symbol: "₽", decimals: 2 },
  CNY: { symbol: "CN¥", decimals: 2 },
  PHP: { symbol: "₱", decimals: 2 },
  INR: { symbol: "₹", decimals: 2 },
  IDR: { symbol: "Rp", decimals: 0 },
  KRW: { symbol: "₩", decimals: 0 },
  BRL: { symbol: "R$", decimals: 2 },
  MXN: { symbol: "MX$", decimals: 2 },
  DKK: { symbol: "kr", decimals: 2, symbolAfter: true },
  PLN: { symbol: "zł", decimals: 2, symbolAfter: true },
  VND: { symbol: "₫", decimals: 0, symbolAfter: true },
  TRY: { symbol: "₺", decimals: 2 },
  CLP: { symbol: "CLP", decimals: 0, symbolAfter: true },
  ARS: { symbol: "ARS", decimals: 2, symbolAfter: true },
  PEN: { symbol: "S/", decimals: 2 },
  NGN: { symbol: "₦", decimals: 2 },
  SAR: { symbol: "SAR", decimals: 2, symbolAfter: true },
  ILS: { symbol: "₪", decimals: 2 },
  AED: { symbol: "AED", decimals: 2, symbolAfter: true },
  TWD: { symbol: "NT$", decimals: 2 },
  NOK: { symbol: "kr", decimals: 2, symbolAfter: true },
  KWD: { symbol: "KD", decimals: 3 },
  JOD: { symbol: "JD", decimals: 3 },
  CRC: { symbol: "₡", decimals: 2 },
  TND: { symbol: "TND", decimals: 3, symbolAfter: true },
  SGD: { symbol: "SG$", decimals: 2 },
  MYR: { symbol: "RM", decimals: 2 },
  OMR: { symbol: "OMR", decimals: 3, symbolAfter: true },
  QAR: { symbol: "QAR", decimals: 2, symbolAfter: true },
  BHD: { symbol: "BD", decimals: 3 },
  PKR: { symbol: "₨", decimals: 2 },
  EGP: { symbol: "EGP", decimals: 2, symbolAfter: true },
  NZD: { symbol: "NZ$", decimals: 2 },
  BOB: { symbol: "Bs", decimals: 2 },
  GHS: { symbol: "GH₵", decimals: 2 },
  KES: { symbol: "KSh", decimals: 2 },
  MAD: { symbol: "MAD", decimals: 2, symbolAfter: true },
  BAM: { symbol: "KM", decimals: 2 },
  ISK: { symbol: "kr", decimals: 0, symbolAfter: true },
  TZS: { symbol: "TSh", decimals: 2 },
  UGX: { symbol: "USh", decimals: 0 },
  XOF: { symbol: "CFA", decimals: 0, symbolAfter: true },
  XGC: { symbol: "GC", decimals: 2, symbolAfter: true },
  XSC: { symbol: "SC", decimals: 2, symbolAfter: true },
  XEC: { symbol: "SC", decimals: 2, symbolAfter: true },
} as const satisfies Record<string, CurrencyMeta>

export type Currency = keyof typeof CURRENCIES

export const CURRENCY_CODES = Object.keys(CURRENCIES) as Currency[]

export const LANGUAGES = [
  "ar",
  "da",
  "de",
  "en",
  "es",
  "fi",
  "fr",
  "hi",
  "id",
  "ja",
  "ko",
  "pl",
  "pt",
  "ru",
  "tr",
  "vi",
  "zh",
] as const

export type Language = (typeof LANGUAGES)[number]

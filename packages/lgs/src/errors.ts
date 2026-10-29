export type LgsErrorKind =
  | "unknown-session"
  | "unauthenticated"
  | "unknown-game"
  | "unknown-mode"
  | "unknown-book"
  | "invalid-session-input"
  | "invalid-bet"
  | "round-active"
  | "no-active-round"
  | "insufficient-balance"
  | "invalid-event"
  | "missing-math"
  | "missing-book"

export class LgsError extends Error {
  constructor(
    readonly kind: LgsErrorKind,
    message: string = kind,
  ) {
    super(message)
    this.name = "LgsError"
  }
}

export function unknownBook(mode: string, bookId: number): LgsError {
  return new LgsError(
    "unknown-book",
    `Book ${bookId} is not in the lookup table of mode "${mode}"`,
  )
}

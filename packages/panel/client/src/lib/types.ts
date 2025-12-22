export interface LinkItem {
  label: string
  href: string
  description?: string
  icon?: React.ReactNode
  target?: string
}

export interface PropsWithGameId {
  gameId: string
}
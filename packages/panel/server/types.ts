// Keep types in this file, because they are imported in the client

export interface APIMessageResponse {
  message: string
}

export interface APIGamesResponse {
  games: Array<{
    id: string
    name: string
    modes: number
    isValid: boolean
    path: string
  }>
}

export interface APIGameDetailResponse {
  id: string
  name: string
  path: string
}

export interface APIStatusResponse {
  ok: boolean
}

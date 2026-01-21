import path from "path"
import { type Optimizer } from "../optimizer"
import { writeJsonFile } from "../../utils"

export function makeMathConfig(
  optimizer: Optimizer,
  opts: { writeToFile?: boolean } = {},
) {
  const game = optimizer.getGameConfig()
  const meta = optimizer.getGameMeta()
  const gameModesCfg = optimizer.getOptimizerGameModes()
  const { writeToFile } = opts

  const isDefined = <T>(v: T | undefined): v is T => v !== undefined

  const config: MathConfig = {
    game_id: game.id,
    bet_modes: Object.entries(game.gameModes).map(([key, mode]) => ({
      bet_mode: mode.name,
      cost: mode.cost,
      rtp: mode.rtp,
      max_win: game.maxWinX,
    })),
    fences: Object.entries(gameModesCfg).map(([gameModeName, modeCfg]) => ({
      bet_mode: gameModeName,
      fences: Object.entries(modeCfg.conditions)
        .map(([fenceName, fence]) => ({
          name: fenceName,
          avg_win: isDefined(fence.getAvgWin())
            ? fence.getAvgWin()!.toString()
            : undefined,
          hr: isDefined(fence.getHitRate()) ? fence.getHitRate()!.toString() : undefined,
          rtp: isDefined(fence.getRtp()) ? fence.getRtp()!.toString() : undefined,
          identity_condition: {
            search: Object.entries(fence.getForceSearch()).map(([k, v]) => ({
              name: k,
              value: v,
            })),
            win_range_start: fence.getSearchRange()[0]!,
            win_range_end: fence.getSearchRange()[1]!,
            opposite: false,
          },
          priority: fence.priority,
        }))
        .sort((a, b) => b.priority - a.priority),
    })),
    dresses: Object.entries(gameModesCfg).flatMap(([gameModeName, modeCfg]) => ({
      bet_mode: gameModeName,
      dresses: modeCfg.scaling.getConfig().map((s) => ({
        fence: s.criteria,
        scale_factor: s.scaleFactor.toString(),
        identity_condition_win_range: s.winRange,
        prob: s.probability,
      })),
    })),
  }

  if (writeToFile) {
    const outPath = path.join(meta.rootDir, meta.outputDir, "math_config.json")
    writeJsonFile(outPath, config)
  }

  return config
}

export type MathConfig = {
  game_id: string
  bet_modes: Array<{
    bet_mode: string
    cost: number
    rtp: number
    max_win: number
  }>
  fences: Array<{
    bet_mode: string
    fences: Array<Fence>
  }>
  dresses: Array<{
    bet_mode: string
    dresses: Dress[]
  }>
}

interface Search {
  name: string
  value: string
}

interface IdentityCondition {
  search: Search[]
  opposite: boolean
  win_range_start: number
  win_range_end: number
}

interface Fence {
  name: string
  avg_win?: string
  rtp?: string
  hr?: string
  identity_condition: IdentityCondition
  priority: number
}

interface Dress {
  fence: string
  scale_factor: string
  identity_condition_win_range: [number, number]
  prob: number
}

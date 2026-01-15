import { StaticReelSet } from "@slot-engine/core"
import path from "path"

export const GENERATORS = {
  base: new StaticReelSet({
    id: "base",
    csvPath: path.join(__dirname, "../static-reels/reels_base.csv"),
  }),
  bonus: new StaticReelSet({
    id: "bonus",
    csvPath: path.join(__dirname, "../static-reels/reels_bonus.csv"),
  }),
  maxwin: new StaticReelSet({
    id: "maxwin",
    csvPath: path.join(__dirname, "../static-reels/reels_maxwin.csv"),
  }),
} as const

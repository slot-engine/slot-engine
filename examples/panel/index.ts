import { createPanel } from "@slot-engine/panel"
import { game as ClusterGame } from "../cluster_example"
import { game as LinesGame } from "../lines_example_OUTDATED"

const panel = createPanel({
  games: [ClusterGame, LinesGame],
})

panel.start()

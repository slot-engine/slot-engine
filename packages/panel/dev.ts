// starts dev server for testing purposes

import { createPanel } from "@slot-engine/panel"
import { game as ClusterGame } from "../../examples/cluster_example"
import { game as LinesGame } from "../../examples/lines_example_OUTDATED"

const panel = createPanel({
  games: [ClusterGame, LinesGame],
})

panel.start()

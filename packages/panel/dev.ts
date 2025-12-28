// starts dev server for testing purposes

import { createPanel } from "./server"
import { game as ClusterGame } from "../../examples/cluster_example"
import { game as LinesGame } from "../../examples/lines_example"

const panel = createPanel({
  games: [ClusterGame, LinesGame],
})

panel.run()

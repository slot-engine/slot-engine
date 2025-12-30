import { useGameContext } from "../../context/GameContext"
import { GameNotConfigured } from "../Error/GameNotConfigured"
import { TableRow } from "../Table"

export const GameInformation = () => {
  const { data } = useGameContext()

  const basicInfo = [
    { label: "ID", value: data.id },
    { label: "Name", value: data.name },
    { label: "Path", value: data.path },
    { label: "Max Win X", value: data.maxWin },
  ]

  return (
    <div>
      {!data.isValid && <GameNotConfigured />}
      <div>
        {basicInfo.map((info, i) => (
          <TableRow key={i} label={info.label} value={info.value} />
        ))}
      </div>
      <div className="mt-8">
        <h3 className="mb-4">Game Modes</h3>
        <div className="grid grid-cols-5 gap-4">
          {data.modes.map((mode, i) => (
            <div key={i} className="p-4 rounded-lg border border-ui-700 bg-ui-900">
              <div className="text-xl font-bold mb-2">{mode.name}</div>
              <div className="grid grid-cols-2 gap-4">
                <div>Cost: {mode.cost}x</div>
                <div>RTP: {mode.rtp}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

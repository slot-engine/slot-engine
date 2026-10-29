import { IconPlayerTrackNext } from "@tabler/icons-react"
import type { LgsInfoResponse } from "@slot-engine/lgs"
import { useGameContext } from "@/context/GameContext"
import { Button } from "../Button"
import { NumberInput } from "../NumberInput"
import { Select, SelectContent, SelectItem, SelectTrigger } from "../Select"
import { toReplayRequest, type ReplayFields, type ReplayRequest } from "./replay"
import { AMOUNT_SCALE } from "./settings"

interface ReplayBookProps {
  info: LgsInfoResponse
  fields: ReplayFields
  pending: boolean
  error: Error | null
  onChange: (fields: ReplayFields) => void
  onReplay: (request: ReplayRequest) => void
}

export const ReplayBook = ({
  info,
  fields,
  pending,
  error,
  onChange,
  onReplay,
}: ReplayBookProps) => {
  const { game } = useGameContext()
  const request = toReplayRequest(fields)

  return (
    <div>
      <Select
        label="Mode"
        multiple={false}
        value={fields.mode}
        onValueChange={(mode) => mode && onChange({ ...fields, mode })}
      >
        <SelectTrigger />
        <SelectContent>
          {game.modes.map((mode) => (
            <SelectItem key={mode.name} value={mode.name}>
              {mode.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <NumberInput
        label="Book ID"
        placeholder="Required"
        className="mt-4"
        min={0}
        step={1}
        value={fields.bookId}
        onValueChange={(bookId) => onChange({ ...fields, bookId })}
      />
      <NumberInput
        label="Bet amount"
        className="mt-4"
        min={info.bets.min / AMOUNT_SCALE}
        max={info.bets.max / AMOUNT_SCALE}
        step={info.bets.step / AMOUNT_SCALE}
        value={fields.amount}
        onValueChange={(amount) => onChange({ ...fields, amount })}
      />
      <p className="text-xs text-ui-500 mt-2">
        The front end loads the book in replay mode, without a session.
      </p>
      <Button
        className="w-full mt-4"
        disabled={!request || pending}
        onClick={() => request && onReplay(request)}
      >
        <IconPlayerTrackNext size={20} stroke={1.5} aria-hidden />
        Replay
      </Button>
      {error && (
        <div className="text-xs text-danger-500 mt-2" role="alert">
          {error.message}
        </div>
      )}
    </div>
  )
}
